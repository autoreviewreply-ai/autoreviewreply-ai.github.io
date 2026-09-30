import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getUserDatabase, User } from "@/lib/database";
import { getSessionUid, SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from "@/lib/session";

// Firebase's Identity Toolkit REST API is what actually creates/verifies
// accounts and passwords. NEXT_PUBLIC_FIREBASE_API_KEY is safe to use here
// too - it's a public API key by design (Firebase's real security is its
// Auth rules + Firestore rules, not this key).
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function identityToolkit(endpoint: "signUp" | "signInWithPassword", body: Record<string, unknown>) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Authentication failed";
    // Turn Firebase's ALL_CAPS_ERROR_CODES into something readable
    const friendly: Record<string, string> = {
      EMAIL_EXISTS: "An account with that email already exists. Try logging in instead.",
      EMAIL_NOT_FOUND: "No account found with that email.",
      INVALID_PASSWORD: "Incorrect password.",
      INVALID_LOGIN_CREDENTIALS: "Incorrect email or password.",
      WEAK_PASSWORD: "Password must be at least 6 characters.",
      INVALID_EMAIL: "That doesn't look like a valid email address.",
    };
    throw new Error(friendly[message] || message);
  }
  return data as { idToken: string; localId: string; email: string };
}

async function setSessionCookie(response: NextResponse, idToken: string) {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

// GET /api/auth/session - Get the currently logged-in user (if any)
export async function GET() {
  try {
    const uid = await getSessionUid();
    if (!uid) {
      return NextResponse.json({ currentUser: null, googleAccount: null, subscription: null });
    }
    const data = await getUserDatabase(uid).get();
    return NextResponse.json({
      currentUser: data.currentUser,
      googleAccount: data.googleAccount,
      subscription: data.subscription,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/auth/session - signup, login, logout, update_profile, delete_account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, fullName, username, email, password, birthday, avatar, newPassword } = body;

    if (action === "signup") {
      if (!email || !password) throw new Error("Email and password are required.");

      const authData = await identityToolkit("signUp", { email, password });
      const uid = authData.localId;
      const userDb = getUserDatabase(uid);

      const newUser: User = {
        id: uid,
        name: fullName || email.split("@")[0],
        email,
        avatar: avatar || `https://picsum.photos/seed/${uid}/100/100`,
        role: "owner",
        username: username || email.split("@")[0],
        birthday: birthday || "",
      };

      await userDb.update((schema) => {
        schema.users = [newUser];
        schema.currentUser = newUser;
        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: newUser.name,
          action: "User Registered & Logged In",
          ip: "unknown",
          details: `Account registered successfully for ${newUser.name} (${newUser.email}).`,
          timestamp: "Just now",
        });
      });

      const response = NextResponse.json({ success: true, user: newUser });
      await setSessionCookie(response, authData.idToken);
      return response;
    }

    if (action === "login") {
      if (!email || !password) throw new Error("Email and password are required.");

      const authData = await identityToolkit("signInWithPassword", { email, password });
      const uid = authData.localId;
      const userDb = getUserDatabase(uid);
      let data = await userDb.get();

      // First time this uid has ever logged in and there's no profile data yet.
      if (!data.currentUser) {
        // Convenience: if they sign in with an email containing "carter", give them
        // the fully-populated demo workspace so the product can be explored right away.
        if (email.toLowerCase().includes("carter")) {
          data = await userDb.seedDemoData();
        } else {
          const newUser: User = {
            id: uid,
            name: email.split("@")[0],
            email,
            avatar: `https://picsum.photos/seed/${uid}/100/100`,
            role: "owner",
            username: email.split("@")[0],
            birthday: "",
          };
          data = await userDb.update((schema) => {
            schema.users = [newUser];
            schema.currentUser = newUser;
          });
        }
      }

      await userDb.update((schema) => {
        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: schema.currentUser?.name || email,
          action: "User Logged In",
          ip: "unknown",
          details: `User ${schema.currentUser?.name || email} logged in successfully.`,
          timestamp: "Just now",
        });
      });

      const response = NextResponse.json({ success: true, user: data.currentUser });
      await setSessionCookie(response, authData.idToken);
      return response;
    }

    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return response;
    }

    if (action === "update_profile") {
      const uid = await getSessionUid();
      if (!uid) throw new Error("You must be signed in.");
      const userDb = getUserDatabase(uid);

      let updatedUser: User | null = null;
      await userDb.update((schema) => {
        if (!schema.currentUser) throw new Error("You must be signed in.");
        updatedUser = {
          ...schema.currentUser,
          name: fullName || schema.currentUser.name,
          username: username || schema.currentUser.username,
          email: email || schema.currentUser.email,
          birthday: birthday !== undefined ? birthday : schema.currentUser.birthday,
          avatar: avatar || schema.currentUser.avatar,
        };
        schema.currentUser = updatedUser;
        const idx = schema.users.findIndex((u) => u.id === uid);
        if (idx !== -1) schema.users[idx] = updatedUser;
        schema.auditLogs.unshift({
          id: "log-" + Date.now(),
          userId: uid,
          userName: updatedUser.name,
          action: "Profile Updated",
          ip: "unknown",
          details: "Modified personal account details.",
          timestamp: "Just now",
        });
      });

      if (newPassword) {
        await adminAuth.updateUser(uid, { password: newPassword });
      }

      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === "delete_account") {
      const uid = await getSessionUid();
      if (!uid) throw new Error("You must be signed in.");

      await getUserDatabase(uid).reset();
      await adminAuth.deleteUser(uid);

      const response = NextResponse.json({ success: true });
      response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return response;
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
