import { NextResponse } from "next/server";
import { getUserDatabase, Review, ReviewReply } from "@/lib/database";
import { getSessionUid } from "@/lib/session";
import { analyzeReview, generateSingleReply, generateThreeSuggestedReplies } from "@/lib/gemini";
import { getValidAccessToken, listReviewsForLocation, postReviewReply, starRatingToNumber } from "@/lib/google-business";

// POST /api/gbp/sync - Pull real reviews from Google for every connected
// business profile, and run each new one through the same AI routing logic
// used by the sandbox simulator - except auto-approved replies now get
// posted for real to Google, not just saved locally.
export async function POST() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const userDb = getUserDatabase(uid);
    const data = await userDb.get();

    if (!data.googleAccount || !data.googleAccount.isConnected) {
      return NextResponse.json({ error: "No Google Business Profile connected." }, { status: 400 });
    }
    if (data.businessProfiles.length === 0) {
      return NextResponse.json({ error: "No business locations found to sync." }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(uid, data.googleAccount);
    const accountResourceName = data.googleAccount.id;

    let newReviewsCount = 0;
    let autoRepliedCount = 0;

    for (const profile of data.businessProfiles) {
      const { reviews: googleReviews } = await listReviewsForLocation(accessToken, accountResourceName, profile.id);

      for (const gRev of googleReviews) {
        // Skip reviews we've already imported
        const alreadyExists = data.reviews.some((r) => r.googleReviewName === gRev.name);
        if (alreadyExists) continue;
        // Existing Google reply will be imported and preserved below
const hasExistingGoogleReply = !!gRev.reviewReply?.comment;

        const rating = starRatingToNumber(gRev.starRating);
        const authorName = gRev.reviewer?.displayName || "Anonymous";
        const text = gRev.comment || "";
        if (!text) continue; // some reviews are star-only with no text; nothing for the AI to analyze
        // If Google already has an owner reply, import it without generating an AI reply
        if (hasExistingGoogleReply) {
          const reviewId = "rev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

          const newReview: Review = {
            id: reviewId,
            businessProfileId: profile.id,
            authorName,
            authorPhoto: gRev.reviewer?.profilePhotoUrl || `https://picsum.photos/seed/${authorName.replace(/\s+/g, "")}/100/100`,
            rating,
            text,
            publishTime: gRev.createTime || "Just now",
            sentiment: "neutral",
            sentimentScore: 0,
            isNew: false,
            status: "replied",
            googleReviewName: gRev.name,
          };

          const existingReply: ReviewReply = {
            id: "rep-" + Date.now(),
            reviewId,
            replyText: gRev.reviewReply!.comment,
            status: "posted",
            replyTime: gRev.createTime || "Just now",
            authorName: "Google Business Profile",
            isAutoReplied: false,
          };

          await userDb.update((schema) => {
            schema.reviews.push(newReview);
            schema.replies.push(existingReply);

            const p = schema.businessProfiles.find((bp) => bp.id === profile.id);
            if (p) {
              const allReviewsOfProfile = schema.reviews.filter(
                (r) => r.businessProfileId === profile.id
              );
              const totalRating = allReviewsOfProfile.reduce(
                (acc, curr) => acc + curr.rating,
                0
              );
              p.totalReviewsCount = allReviewsOfProfile.length;
              p.averageRating = Number(
                (totalRating / allReviewsOfProfile.length).toFixed(1)
              );
            }
          });

          newReviewsCount++;
          continue;
        }
        
        const analysis = await analyzeReview(text, rating);

        const settings = data.aiSettings.find((s) => s.businessProfileId === profile.id) || {
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
        const starRule = starSettings[rating] || { action: "manual", instructions: "" };

        let isProtectionTriggered = false;
        if (rating <= 2) isProtectionTriggered = true;
        if (analysis.hasComplaints) isProtectionTriggered = true;
        if (analysis.hasRefundRequest) isProtectionTriggered = true;
        if (analysis.hasLegalThreat) isProtectionTriggered = true;
        if (analysis.hasOffensiveLanguage) isProtectionTriggered = true;
        if (analysis.hasSensitiveCustomerIssue) isProtectionTriggered = true;

        const finalAction = isProtectionTriggered ? "manual" : starRule.action;

        const reviewId = "rev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        const newReview: Review = {
          id: reviewId,
          businessProfileId: profile.id,
          authorName,
          authorPhoto: gRev.reviewer?.profilePhotoUrl || `https://picsum.photos/seed/${authorName.replace(/\s+/g, "")}/100/100`,
          rating,
          text,
          publishTime: gRev.createTime || "Just now",
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
          isNew: true,
          status: "pending",
          googleReviewName: gRev.name,
        };

        let replyLanguage = "English";
        const detectedLanguage = (analysis as any).detectedLanguage || "English";
        const strategy = (settings as any).replyLanguageStrategy || "customer";
        if (strategy === "customer") replyLanguage = detectedLanguage;
        else if (strategy === "business") replyLanguage = (settings as any).defaultBusinessLanguage || "English";
        else if (strategy === "custom") replyLanguage = (settings as any).customSelectedLanguage || "English";

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
        } else if (finalAction === "auto") {
          const sub = data.subscription;
          if (sub.repliesCountThisMonth >= sub.limitCount) {
            newReview.status = "manual_review";
            newReview.errorReason = "Monthly SaaS AI replies limit reached.";
            newReview.suggestedReplies = [await generateSingleReply(geminiInput)];
          } else if (!profile.isAutoReplyEnabled) {
            newReview.status = "manual_review";
            newReview.suggestedReplies = [await generateSingleReply(geminiInput)];
          } else {
            const generatedReplyText = await generateSingleReply(geminiInput);

            // Post the reply FOR REAL to Google
            await postReviewReply(accessToken, gRev.name, generatedReplyText);

            newReview.status = "replied";
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
            });
            autoRepliedCount++;
          }
        } else {
          newReview.status = "pending";
        }

        await userDb.update((schema) => {
          schema.reviews.push(newReview);
          const p = schema.businessProfiles.find((bp) => bp.id === profile.id);
          if (p) {
            const allReviewsOfProfile = schema.reviews.filter((r) => r.businessProfileId === profile.id);
            const totalRating = allReviewsOfProfile.reduce((acc, curr) => acc + curr.rating, 0);
            p.totalReviewsCount = allReviewsOfProfile.length;
            p.averageRating = Number((totalRating / allReviewsOfProfile.length).toFixed(1));
          }
          schema.notifications.unshift({
            id: "not-" + Date.now(),
            type: newReview.status === "manual_review" ? "manual_required" : "new_review",
            title: newReview.status === "replied" ? "Auto-Reply Posted to Google" : "New Review Needs Review",
            message: `${authorName}'s ${rating}★ review synced from Google.`,
            timestamp: "Just now",
            read: false,
            reviewId,
            businessProfileId: profile.id,
          });
        });

        newReviewsCount++;
      }
    }

    await userDb.update((schema) => {
      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: "GBP Sync Engine",
        action: "Real Review Sync Completed",
        ip: "unknown",
        details: `Synced ${newReviewsCount} new review(s) from Google, ${autoRepliedCount} auto-replied.`,
        timestamp: "Just now",
      });
    });

    return NextResponse.json({ success: true, newReviewsCount, autoRepliedCount });
  } catch (error: any) {
    console.error("GBP sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
