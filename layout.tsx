import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET /api/profiles - Fetch all synced business locations
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({
      profiles: data.businessProfiles,
      isConnected: !!data.googleAccount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/profiles - Toggle auto-reply states or alter custom settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isAutoReplyEnabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    let updatedProfile = null;

    db.update((schema) => {
      const idx = schema.businessProfiles.findIndex(bp => bp.id === id);
      if (idx !== -1) {
        schema.businessProfiles[idx].isAutoReplyEnabled = isAutoReplyEnabled;
        updatedProfile = schema.businessProfiles[idx];

        // Add audit log
        schema.auditLogs.unshift({
          id: 'log-' + Date.now(),
          userId: 'user-001',
          userName: schema.users[0]?.name || 'Dr. Evelyn Carter',
          action: 'Auto-Reply Setting Changed',
          ip: '127.0.0.1',
          details: `Set Auto-Reply for "${schema.businessProfiles[idx].name}" to ${isAutoReplyEnabled ? 'ENABLED' : 'DISABLED'}.`,
          timestamp: 'Just now'
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
