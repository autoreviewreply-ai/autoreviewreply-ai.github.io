import { NextRequest, NextResponse } from "next/server";
import { getUserDatabase } from "@/lib/database";
import { getSessionUid } from "@/lib/session";

// GET /api/notifications - Get all notifications for the signed-in user
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ notifications: [] });

    const data = await getUserDatabase(uid).get();
    return NextResponse.json({ notifications: data.notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications - Mark notifications as read or clear all
export async function POST(req: NextRequest) {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id, markAllRead } = body;

    const userDb = getUserDatabase(uid);
    await userDb.update((schema) => {
      if (markAllRead) {
        schema.notifications.forEach((n) => (n.read = true));
      } else if (id) {
        const not = schema.notifications.find((n) => n.id === id);
        if (not) not.read = true;
      }
    });

    const data = await userDb.get();
    return NextResponse.json({ success: true, notifications: data.notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
