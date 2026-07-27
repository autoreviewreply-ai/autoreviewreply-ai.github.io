import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET /api/notifications - Get all notifications for user
export async function GET() {
  try {
    const data = db.get();
    return NextResponse.json({ notifications: data.notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications - Mark notifications as read or clear all
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, markAllRead } = body;

    db.update((schema) => {
      if (markAllRead) {
        schema.notifications.forEach(n => n.read = true);
      } else if (id) {
        const not = schema.notifications.find(n => n.id === id);
        if (not) {
          not.read = true;
        }
      }
    });

    return NextResponse.json({ success: true, notifications: db.get().notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
