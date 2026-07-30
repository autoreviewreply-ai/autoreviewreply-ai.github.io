import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// GET /api/team - Fetch the signed-in user's team members and audit logs
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ team: [], auditLogs: [] });

    const data = await getUserDatabase(uid).get();
    return NextResponse.json({ team: data.team, auditLogs: data.auditLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/team - Invite a new team member
export async function POST(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    let newMember: any = null;

    await userDb.update((schema) => {
      newMember = {
        id: "team-" + Date.now(),
        name,
        email,
        role: role as "owner" | "manager" | "staff",
        permissions:
          role === "manager" ? ["manage_settings", "approve_replies"] : role === "owner" ? ["all"] : ["view_reviews"],
      };

      schema.team.push(newMember);

      schema.auditLogs.unshift({
        id: "log-" + Date.now(),
        userId: uid,
        userName: schema.users[0]?.name || "Owner",
        action: "Team Member Invited",
        ip: "unknown",
        details: `Invited ${name} (${email}) as ${role.toUpperCase()} to the workspace.`,
        timestamp: "Just now",
      });
    });

    return NextResponse.json({ success: true, teamMember: newMember });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/team - Remove a team member
export async function DELETE(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const userDb = getUserDatabase(uid);
    await userDb.update((schema) => {
      const idx = schema.team.findIndex((t) => t.id === id);
      if (idx !== -1) {
        const removed = schema.team[idx];
        schema.team.splice(idx, 1);

        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: schema.users[0]?.name || "Owner",
          action: "Team Member Removed",
          ip: "unknown",
          details: `Revoked workspace access for ${removed.name} (${removed.email}).`,
          timestamp: "Just now",
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
