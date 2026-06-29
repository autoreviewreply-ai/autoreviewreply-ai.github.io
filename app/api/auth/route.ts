import { NextRequest, NextResponse } from "next/server";
import { db, getSeededData } from "@/lib/database";

// GET /api/auth - Get active Google OAuth details
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({
      googleAccount: data.googleAccount,
      loggedInUser: data.currentUser || null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/auth - Connect/simulate Google account connection and import genuine locations/reviews
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "doctor.carter.dental@gmail.com";
    const name = body.name || "Evelyn Carter DDS";

    const seed = getSeededData();
    const newAccountId = 'google-oauth-' + Math.random().toString(36).substring(2, 9);

    db.update((schema) => {
      // Connect account
      schema.googleAccount = {
        id: newAccountId,
        email: email,
        name: name,
        accessToken: 'ya29.a0ARWdsn' + Math.random().toString(36).substring(2),
        refreshToken: '1//0g4WDS' + Math.random().toString(36).substring(2),
        expiresAt: Date.now() + 3600 * 1000,
        isConnected: true
      };

      // Import users, profiles, settings, reviews, and replies
      schema.users = seed.users;
      schema.businessProfiles = seed.businessProfiles.map(bp => ({
        ...bp,
        googleAccountId: newAccountId,
        isAutoReplyEnabled: false // Will be configured during onboarding setup wizard
      }));
      schema.aiSettings = seed.aiSettings;
      schema.reviews = seed.reviews;
      schema.replies = seed.replies;
      schema.team = seed.team;
      schema.subscription = seed.subscription;

      // Add audit log
      schema.auditLogs = [
        {
          id: 'log-' + Date.now(),
          userId: 'user-001',
          userName: 'Dr. Evelyn Carter',
          action: 'Google Business Profile Connected',
          ip: '127.0.0.1',
          details: `Successfully integrated account ${email}. Synced 2 matching Business Profiles locations.`,
          timestamp: 'Just now'
        },
        ...seed.auditLogs
      ];

      // Notify of successful integration
      schema.notifications = [
        {
          id: 'not-' + Date.now(),
          type: 'new_review',
          title: 'Google Business Profile Synced',
          message: `Account ${email} integrated. Synced locations: "Pearl Smile Dental Clinic" and "The Sage Bistro".`,
          timestamp: 'Just now',
          read: false
        },
        ...seed.notifications
      ];
    });

    return NextResponse.json({ success: true, googleAccount: db.get().googleAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth - Disconnect Google account and wipe database back to pristine clean startup layout
export async function DELETE() {
  try {
    db.reset();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
