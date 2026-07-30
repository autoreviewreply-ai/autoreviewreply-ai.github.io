import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase, getSeededData } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// NOTE: This endpoint still SIMULATES connecting a Google Business Profile
// account - it does not call the real Google Business Profile API. Wiring up
// the real thing requires its own Google Cloud OAuth consent screen and
// Business Profile API access approval, which is a separate project from the
// Firebase login/data-storage fix this route was updated for. Everything
// below is now at least correctly scoped to the signed-in Firebase user,
// so different users no longer share (or overwrite) each other's data.

// GET /api/auth - Get the signed-in user's Google Business Profile connection
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ googleAccount: null, loggedInUser: null });
    }
    const data = await getUserDatabase(uid).get();
    return NextResponse.json({
      googleAccount: data.googleAccount,
      loggedInUser: data.currentUser || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/auth - Simulate connecting a Google Business Profile account
export async function POST(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email || "doctor.carter.dental@gmail.com";
    const name = body.name || "Evelyn Carter DDS";

    const userDb = getUserDatabase(uid);
    const seed = getSeededData();
    const newAccountId = "google-oauth-" + Math.random().toString(36).substring(2, 9);

    await userDb.update((schema) => {
      schema.googleAccount = {
        id: newAccountId,
        email,
        name,
        accessToken: "ya29.a0ARWdsn" + Math.random().toString(36).substring(2),
        refreshToken: "1//0g4WDS" + Math.random().toString(36).substring(2),
        expiresAt: Date.now() + 3600 * 1000,
        isConnected: true,
      };

      schema.businessProfiles = seed.businessProfiles.map((bp) => ({
        ...bp,
        googleAccountId: newAccountId,
        isAutoReplyEnabled: false,
      }));
      schema.aiSettings = seed.aiSettings;
      schema.reviews = seed.reviews;
      schema.replies = seed.replies;
      schema.team = seed.team;
      schema.subscription = seed.subscription;

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: schema.currentUser?.name || "User",
        action: "Google Business Profile Connected",
        ip: "unknown",
        details: `Successfully integrated account ${email}. Synced 2 matching Business Profiles locations.`,
        timestamp: "Just now",
      });

      schema.notifications.unshift({
        id: "not-" + Date.now(),
        type: "new_review",
        title: "Google Business Profile Synced",
        message: `Account ${email} integrated. Synced locations: "Pearl Smile Dental Clinic" and "The Sage Bistro".`,
        timestamp: "Just now",
        read: false,
      });
    });

    const data = await userDb.get();
    return NextResponse.json({ success: true, googleAccount: data.googleAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth - Disconnect Google account and wipe this user's data back to pristine
export async function DELETE() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }
    await getUserDatabase(uid).reset();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
