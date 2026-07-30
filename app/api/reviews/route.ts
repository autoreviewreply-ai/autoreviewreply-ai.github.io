import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase, Review, ReviewReply } from "@/lib/database";
import { getSessionUid } from "@/lib/session";
import { analyzeReview, generateSingleReply, generateThreeSuggestedReplies } from "@/lib/gemini";

// GET /api/reviews - Get review history merged with replies, for the signed-in user
export async function GET(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ reviews: [] });

    const data = await getUserDatabase(uid).get();
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    const status = searchParams.get("status");

    let resultReviews = [...data.reviews];

    if (profileId) {
      resultReviews = resultReviews.filter((r) => r.businessProfileId === profileId);
    }
    if (status) {
      resultReviews = resultReviews.filter((r) => r.status === status);
    }

    const reviewsWithReplies = resultReviews.map((review) => {
      const reply = data.replies.find((rep) => rep.reviewId === review.id);
      return { ...review, reply: reply || null };
    });

    reviewsWithReplies.reverse();

    return NextResponse.json({ reviews: reviewsWithReplies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/reviews - Simulate an incoming Google Review for the signed-in user
export async function POST(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json();
    const { businessProfileId, authorName, text, rating } = body;

    if (!businessProfileId || !authorName || !text || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    const data = await userDb.get();
    const profile = data.businessProfiles.find((bp) => bp.id === businessProfileId);
    if (!profile) {
      return NextResponse.json({ error: "Business Profile not found" }, { status: 404 });
    }

    // 1. Analyze Review via Gemini
    const analysis = await analyzeReview(text, rating);

    // 2. Fetch business' customized AI Reply Settings
    const settings = data.aiSettings.find((s) => s.businessProfileId === businessProfileId) || {
      tone: "Professional",
      businessName: profile.name,
      businessType: profile.category,
      brandVoice: "Polite and helpful",
      preferredGreeting: "Dear",
      preferredClosing: "Best regards,",
      keywordsToInclude: [] as string[],
      keywordsToAvoid: [] as string[],
      customInstructions: "",
      starSettings: {
        5: { action: "auto", instructions: "Thank them" },
        4: { action: "auto", instructions: "Thank them and ask feedback" },
        3: { action: "manual", instructions: "Manual approval needed" },
        2: { action: "manual", instructions: "Manual approval needed" },
        1: { action: "manual", instructions: "Manual approval needed" },
      },
    };

    const starSettings = settings.starSettings as Record<number, any>;
    const starRule = starSettings[Number(rating)] || { action: "manual", instructions: "" };

    let isProtectionTriggered = false;
    const protectionReasons: string[] = [];

    if (rating <= 2) {
      isProtectionTriggered = true;
      protectionReasons.push(`rating is ${rating} stars`);
    }
    if (analysis.hasComplaints) {
      isProtectionTriggered = true;
      protectionReasons.push("review has customer complaints");
    }
    if (analysis.hasRefundRequest) {
      isProtectionTriggered = true;
      protectionReasons.push("review requests a refund");
    }
    if (analysis.hasLegalThreat) {
      isProtectionTriggered = true;
      protectionReasons.push("contains potential legal/chargeback threats");
    }
    if (analysis.hasOffensiveLanguage) {
      isProtectionTriggered = true;
      protectionReasons.push("marked for offensive content");
    }
    if (analysis.hasSensitiveCustomerIssue) {
      isProtectionTriggered = true;
      protectionReasons.push("contains direct customer medical/confidential details");
    }

    const finalAction = isProtectionTriggered ? "manual" : starRule.action;

    const reviewId = "rev-" + Date.now();
    const newReview: Review = {
      id: reviewId,
      businessProfileId,
      authorName,
      authorPhoto: `https://picsum.photos/seed/${authorName.replace(/\s+/g, "")}/100/100`,
      rating,
      text,
      publishTime: "Just now",
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      isNew: true,
      status: "pending",
    };

    let isAutoReplied = false;

    let replyLanguage = "English";
    const detectedLanguage = (analysis as any).detectedLanguage || "English";
    const strategy = (settings as any).replyLanguageStrategy || "customer";

    if (strategy === "customer") {
      replyLanguage = detectedLanguage;
    } else if (strategy === "business") {
      replyLanguage = (settings as any).defaultBusinessLanguage || "English";
    } else if (strategy === "custom") {
      replyLanguage = (settings as any).customSelectedLanguage || "English";
    }

    const geminiInput = {
      reviewText: text,
      rating,
      businessName: settings.businessName || profile.name,
      businessType: settings.businessType || profile.category,
      brandVoice: settings.brandVoice,
      tone: settings.tone,
      preferredGreeting: settings.preferredGreeting,
      preferredClosing: settings.preferredClosing,
      keywordsToInclude: settings.keywordsToInclude,
      keywordsToAvoid: settings.keywordsToAvoid,
      customInstructions: settings.customInstructions,
      ratingsGuideline: starRule.instructions,
      replyLanguage,
    };

    if (finalAction === "manual") {
      newReview.status = "manual_review";
      newReview.suggestedReplies = await generateThreeSuggestedReplies(geminiInput);

      const alertTitle = isProtectionTriggered ? "Negative Review Protected" : "Manual Approval Required";
      const alertMessage = isProtectionTriggered
        ? `Protection activated for ${authorName}'s review (${rating}★) because ${protectionReasons.join(", ")}. 3 AI suggestions created.`
        : `New ${rating}★ review from ${authorName} requires manual review as configured in settings.`;

      await userDb.update((schema) => {
        schema.notifications.unshift({
          id: "not-" + Date.now(),
          type: isProtectionTriggered ? "negative_detected" : "manual_required",
          title: alertTitle,
          message: alertMessage,
          timestamp: "Just now",
          read: false,
          reviewId,
          businessProfileId,
        });
      });
    } else if (finalAction === "auto") {
      newReview.status = "replied";
      isAutoReplied = true;

      const sub = data.subscription;
      if (sub.repliesCountThisMonth >= sub.limitCount) {
        newReview.status = "manual_review";
        newReview.errorReason = "Monthly SaaS AI replies limit reached. Review sent to fallback manual queue.";
        newReview.suggestedReplies = [await generateSingleReply(geminiInput)];

        await userDb.update((schema) => {
          schema.notifications.unshift({
            id: "not-" + Date.now(),
            type: "api_error",
            title: "SaaS Reply Limit Reached",
            message: `Could not automated-reply to ${authorName} (${rating}★). SaaS limit (${schema.subscription.limitCount}) exceeded.`,
            timestamp: "Just now",
            read: false,
            reviewId,
            businessProfileId,
          });
        });
      } else if (!profile.isAutoReplyEnabled) {
        newReview.status = "manual_review";
        newReview.suggestedReplies = [await generateSingleReply(geminiInput)];

        await userDb.update((schema) => {
          schema.notifications.unshift({
            id: "not-" + Date.now(),
            type: "manual_required",
            title: "Auto-Reply is Paused",
            message: `Review from ${authorName} (${rating}★) sent to manual queue because Auto-Reply is suspended for ${profile.name}.`,
            timestamp: "Just now",
            read: false,
            reviewId,
            businessProfileId,
          });
        });
      } else {
        const generatedReplyText = await generateSingleReply(geminiInput);
        const replyId = "rep-" + Date.now();
        const newReply: ReviewReply = {
          id: replyId,
          reviewId,
          replyText: generatedReplyText,
          status: "posted",
          replyTime: "Just now",
          authorName: settings.tone === "Luxury Brand" ? "The Clinic Director" : "Concierge Service",
          isAutoReplied: true,
        };

        await userDb.update((schema) => {
          schema.replies.push(newReply);
          schema.subscription.repliesCountThisMonth += 1;
          schema.notifications.unshift({
            id: "not-" + Date.now(),
            type: "new_review",
            title: "Auto-Reply Posted successfully",
            message: `System automatically authored and posted a response to ${authorName}'s ${rating}★ review.`,
            timestamp: "Just now",
            read: false,
            reviewId,
            businessProfileId,
          });
        });
      }
    } else {
      newReview.status = "pending";
    }

    await userDb.update((schema) => {
      schema.reviews.push(newReview);

      const profileToUpdate = schema.businessProfiles.find((bp) => bp.id === businessProfileId);
      if (profileToUpdate) {
        const allReviewsOfProfile = schema.reviews.filter((r) => r.businessProfileId === businessProfileId);
        const totalRating = allReviewsOfProfile.reduce((acc, curr) => acc + curr.rating, 0);
        profileToUpdate.totalReviewsCount = allReviewsOfProfile.length;
        profileToUpdate.averageRating = Number((totalRating / allReviewsOfProfile.length).toFixed(1));
      }

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: "AutoReview Engine",
        action: "Review Simulated & Rooted",
        ip: "unknown",
        details: `Simulated a ${rating}★ incoming review from ${authorName}. Route outcome: [${newReview.status.toUpperCase()}]. AI sentiment: ${analysis.sentiment} (score ${analysis.sentimentScore.toFixed(2)}).`,
        timestamp: "Just now",
      });
    });

    const finalData = await userDb.get();
    const savedReviewWithReply = {
      ...newReview,
      reply: finalData.replies.find((r) => r.reviewId === reviewId) || null,
    };

    return NextResponse.json({
      success: true,
      review: savedReviewWithReply,
      isAutoReplied,
      protectionTriggered: isProtectionTriggered,
      analysis,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/reviews - Approve or edit and manually post a suggested reply
export async function PUT(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json();
    const { reviewId, replyText, authorName } = body;

    if (!reviewId || !replyText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    let updatedReview: Review | null = null;
    let finalReply: ReviewReply | null = null;

    await userDb.update((schema) => {
      const revIdx = schema.reviews.findIndex((r) => r.id === reviewId);
      if (revIdx === -1) return;

      schema.reviews[revIdx].status = "replied";
      schema.reviews[revIdx].isNew = false;
      updatedReview = schema.reviews[revIdx];

      const existingRepIdx = schema.replies.findIndex((rep) => rep.reviewId === reviewId);
      if (existingRepIdx !== -1) {
        schema.replies.splice(existingRepIdx, 1);
      }

      const replyId = "rep-" + Date.now();
      finalReply = {
        id: replyId,
        reviewId,
        replyText,
        status: "posted",
        replyTime: "Just now",
        authorName: authorName || schema.users[0]?.name || "Owner",
        isAutoReplied: false,
      };
      schema.replies.push(finalReply);

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: schema.users[0]?.name || "Owner",
        action: "Manual Reply Approved & Posted",
        ip: "unknown",
        details: `Manually verified and published a custom response to "${schema.reviews[revIdx].authorName}"'s review.`,
        timestamp: "Just now",
      });
    });

    if (!updatedReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review: { ...(updatedReview as Review), reply: finalReply },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
