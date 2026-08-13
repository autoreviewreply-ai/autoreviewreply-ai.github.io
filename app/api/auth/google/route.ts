import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getUserDatabase, User } from "@/lib/database";
import { SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from "@/lib/session";

// POST /api/auth/google - Exchange a real Firebase Google sign-in for a session cookie.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) throw new Error("Missing Google sign-in token.");

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";
    const name = decoded.name || email.split("@")[0] || "New User";
    const picture = decoded.picture || `https://picsum.photos/seed/${uid}/100/100`;

    const userDb = getUserDatabase(uid);
    let data = await userDb.get();

    if (!data.currentUser) {
      const newUser: User = {
        id: uid,
        name,
        email,
        avatar: picture,
        role: "owner",
        username: email.split("@")[0] || uid,
        birthday: "",
      };
      data = await userDb.update((schema) => {
        schema.users = [newUser];
        schema.currentUser = newUser;
        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: newUser.name,
          action: "User Registered & Logged In (Google)",
          ip: "unknown",
          details: `Account created via Google sign-in for ${newUser.name} (${newUser.email}).`,
          timestamp: "Just now",
        });
      });
    } else {
      await userDb.update((schema) => {
        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: schema.currentUser?.name || name,
          action: "User Logged In (Google)",
          ip: "unknown",
          details: `User ${schema.currentUser?.name || name} logged in via Google.`,
          timestamp: "Just now",
        });
      });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
    const response = NextResponse.json({ success: true, user: data.currentUser });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}