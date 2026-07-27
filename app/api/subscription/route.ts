import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET /api/subscription - Fetch active SaaS plan limits
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({ subscription: data.subscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/subscription - Switch/Upgrade pricing tiers
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan } = body;

    if (plan !== 'free' && plan !== 'pro') {
      return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
    }

    db.update((schema) => {
      schema.subscription = {
        plan: plan,
        repliesCountThisMonth: schema.subscription.repliesCountThisMonth,
        limitCount: plan === 'pro' ? 500 : 100,
        features: plan === 'pro' ? [
          'Unlimited Connected Google Accounts',
          'Multiple Business Profiles Management',
          'Advanced Gemini Sentiment Analytics',
          'Negative Review Protective Filter',
          'Custom Brand Voices & Specific Tone Matching',
          'Team Member Roles and Multi-seat Access'
        ] : [
          '1 Business Profile Limit',
          '100 SaaS AI replies/month',
          'Standard Tone Responses'
        ]
      };

      // Add audit log
      schema.auditLogs.unshift({
        id: 'log-' + Date.now(),
        userId: 'user-001',
        userName: schema.users[0]?.name || 'Dr. Evelyn Carter',
        action: 'Pricing Plan Adjusted',
        ip: '127.0.0.1',
        details: `Updated workspace membership subscription to "${plan.toUpperCase()}" plan. Limits reset to ${schema.subscription.limitCount} replies.`,
        timestamp: 'Just now'
      });

      // Notify
      schema.notifications.unshift({
        id: 'not-' + Date.now(),
        type: 'new_review',
        title: `Plan Upgraded to ${plan.toUpperCase()}`,
        message: `Your account has successfully transitioned. Max quota is now ${schema.subscription.limitCount} items.`,
        timestamp: 'Just now',
        read: false
      });
    });

    return NextResponse.json({ success: true, subscription: db.get().subscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
