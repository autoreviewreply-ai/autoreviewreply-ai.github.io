import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// GET /api/subscription - Fetch the signed-in user's active SaaS plan limits
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ subscription: null });

    const data = await getUserDatabase(uid).get();
    return NextResponse.json({ subscription: data.subscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/subscription - Switch/Upgrade pricing tiers
export async function PUT(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json();
    const { plan } = body;

    if (plan !== "free" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    await userDb.update((schema) => {
      schema.subscription = {
        plan,
        repliesCountThisMonth: schema.subscription.repliesCountThisMonth,
        limitCount: plan === "pro" ? 500 : 100,
        features:
          plan === "pro"
            ? [
                "Unlimited Connected Google Accounts",
                "Multiple Business Profiles Management",
                "Advanced Gemini Sentiment Analytics",
                "Negative Review Protective Filter",
                "Custom Brand Voices & Specific Tone Matching",
                "Team Member Roles and Multi-seat Access",
              ]
            : ["1 Business Profile Limit", "100 SaaS AI replies/month", "Standard Tone Responses"],
      };

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: schema.users[0]?.name || "Owner",
        action: "Pricing Plan Adjusted",
        ip: "unknown",
        details: `Updated workspace membership subscription to "${plan.toUpperCase()}" plan. Limits reset to ${schema.subscription.limitCount} replies.`,
        timestamp: "Just now",
      });

      schema.notifications.unshift({
        id: "not-" + Date.now(),
        type: "new_review",
        title: `Plan Upgraded to ${plan.toUpperCase()}`,
        message: `Your account has successfully transitioned. Max quota is now ${schema.subscription.limitCount} items.`,
        timestamp: "Just now",
        read: false,
      });
    });

    const data = await userDb.get();
    return NextResponse.json({ success: true, subscription: data.subscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
