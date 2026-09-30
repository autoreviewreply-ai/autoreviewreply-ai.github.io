import { NextResponse } from "next/server";
import { getUserDatabase } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// GET /api/auth - Get the signed-in user's Google Business Profile connection
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ googleAccount: null, loggedInUser: null });
    }
    const userDb = getUserDatabase(uid);
    const data = await userDb.get();

    // Legacy demo builds used a fake Google account id. Never expose that as a
    // real connection: clear the demo workspace so the user must connect the
    // actual Google Business Profile through OAuth.
    if (data.googleAccount?.id === "google-oauth-123") {
      await userDb.update((schema) => {
        schema.googleAccount = null as any;
        schema.businessProfiles = [];
        schema.reviews = [];
        schema.replies = [];
        schema.aiSettings = [];
        schema.notifications = [];
      });
      return NextResponse.json({ googleAccount: null, loggedInUser: data.currentUser || null });
    }

    return NextResponse.json({
      googleAccount: data.googleAccount,
      loggedInUser: data.currentUser || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/auth - Disconnect the real Google account (revoke token) and clear synced data
export async function DELETE() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const userDb = getUserDatabase(uid);
    const data = await userDb.get();

    if (data.googleAccount?.accessToken) {
      // Best-effort token revocation - don't block disconnect if this fails
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${data.googleAccount.accessToken}`, {
          method: "POST",
        });
      } catch {
        // ignore revoke errors
      }
    }

    await userDb.update((schema) => {
      schema.googleAccount = null as any;
      schema.businessProfiles = [];
      schema.reviews = [];
      schema.replies = [];
      schema.aiSettings = [];

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: schema.currentUser?.name || "User",
        action: "Google Business Profile Disconnected",
        ip: "unknown",
        details: "Real Google account disconnected and synced data cleared.",
        timestamp: "Just now",
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}