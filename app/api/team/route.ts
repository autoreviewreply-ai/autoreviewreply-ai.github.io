import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET /api/team - Fetch active team members and system audit logs
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({ 
      team: data.team,
      auditLogs: data.auditLogs 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/team - Invite a new team member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let newMember = null;

    db.update((schema) => {
      newMember = {
        id: 'team-' + Date.now(),
        name,
        email,
        role: role as 'owner' | 'manager' | 'staff',
        permissions: role === 'manager' 
          ? ['manage_settings', 'approve_replies'] 
          : (role === 'owner' ? ['all'] : ['view_reviews'])
      };
      
      schema.team.push(newMember);

      // Audit Log
      schema.auditLogs.unshift({
        id: 'log-' + Date.now(),
        userId: 'user-001',
        userName: schema.users[0]?.name || 'Dr. Evelyn Carter',
        action: 'Team Member Invited',
        ip: '127.0.0.1',
        details: `Invited ${name} (${email}) as ${role.toUpperCase()} to the workspace.`,
        timestamp: 'Just now'
      });
    });

    return NextResponse.json({ success: true, teamMember: newMember });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/team - Delete/remove a team member
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    db.update((schema) => {
      const idx = schema.team.findIndex(t => t.id === id);
      if (idx !== -1) {
        const removed = schema.team[idx];
        schema.team.splice(idx, 1);

        // Audit Log
        schema.auditLogs.unshift({
          id: 'log-' + Date.now(),
          userId: 'user-001',
          userName: schema.users[0]?.name || 'Dr. Evelyn Carter',
          action: 'Team Member Removed',
          ip: '127.0.0.1',
          details: `Revoked workspace access for ${removed.name} (${removed.email}).`,
          timestamp: 'Just now'
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
