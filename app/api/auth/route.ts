import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/session";
import { getUserDatabase, getSeededData, GoogleAccount } from "@/lib/database";

function toPublicAccount(acc: GoogleAccount | null): GoogleAccount | null {
  if (!acc) return null;
  return { ...acc, accessToken: "", refreshToken: "" };
}

// Returns the connected Google account (used on every page load)
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ googleAccount: null });
    const data = await getUserDatabase(uid).get();
    return NextResponse.json({ googleAccount: toPublicAccount(data.googleAccount) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, googleAccount: null }, { status: 500 });
  }
}

// Demo/sandbox connection (loads sample data)
export async function POST() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const userDb = getUserDatabase(uid);
    const current = await userDb.get();
    const seed = getSeededData();

    await userDb.update((schema) => {
      schema.googleAccount = seed.googleAccount;
      schema.businessProfiles = seed.businessProfiles;
      schema.reviews = seed.reviews;
      schema.replies = seed.replies;
      schema.aiSettings = seed.aiSettings;
      schema.notifications = seed.notifications;
      schema.currentUser = current.currentUser;
      schema.users = current.users;
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Disconnect Google
export async function DELETE() {
  try {
    const uid = await getSessionUid();
    if (!uid) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    await getUserDatabase(uid).update((schema) => {
      schema.googleAccount = null;
      schema.businessProfiles = [];
      schema.reviews = [];
      schema.replies = [];
      schema.aiSettings = [];
      schema.notifications = [];
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
