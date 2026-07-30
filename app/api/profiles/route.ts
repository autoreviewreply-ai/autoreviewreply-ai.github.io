import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// GET /api/profiles - Fetch all synced business locations for the signed-in user
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ profiles: [], isConnected: false });
    }
    const data = await getUserDatabase(uid).get();
    return NextResponse.json({
      profiles: data.businessProfiles,
      isConnected: !!data.googleAccount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/profiles - Toggle auto-reply states or alter custom settings
export async function PUT(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json();
    const { id, isAutoReplyEnabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    let updatedProfile = null;

    await userDb.update((schema) => {
      const idx = schema.businessProfiles.findIndex((bp) => bp.id === id);
      if (idx !== -1) {
        schema.businessProfiles[idx].isAutoReplyEnabled = isAutoReplyEnabled;
        updatedProfile = schema.businessProfiles[idx];

        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: schema.users[0]?.name || "Owner",
          action: "Auto-Reply Setting Changed",
          ip: "unknown",
          details: `Set Auto-Reply for "${schema.businessProfiles[idx].name}" to ${isAutoReplyEnabled ? "ENABLED" : "DISABLED"}.`,
          timestamp: "Just now",
        });
      }
    });

    if (!updatedProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
