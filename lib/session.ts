import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

export const SESSION_COOKIE_NAME = "session";
// 14 days, in milliseconds (Firebase session cookies max out at 14 days)
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;

/**
 * Returns the signed-in user's Firebase uid, or null if there is no
 * valid session cookie (i.e. the visitor isn't logged in).
 */
export async function getSessionUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * Same as getSessionUid, but throws if the visitor isn't logged in.
 * Use this inside routes that should never run for anonymous visitors.
 */
export async function requireSessionUid(): Promise<string> {
  const uid = await getSessionUid();
  if (!uid) {
    throw new Error("Not signed in.");
  }
  return uid;
}
