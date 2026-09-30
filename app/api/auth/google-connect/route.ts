import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/session";

// GET /api/auth/google-connect - Kicks off the REAL Google OAuth flow.
// The user must already be signed in to our app; we then send them to
// Google's own consent screen to authorize access to their Business Profile.
export async function GET(req: Request) {
  const uid = await getSessionUid();
  const origin = new URL(req.url).origin;

  if (!uid) {
    // Not signed in - nothing to connect to. Send them home.
    return NextResponse.redirect(`${origin}/`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID is not configured." }, { status: 500 });
  }

  const redirectUri = `${origin}/api/auth/google-callback`;
  const scope = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/business.manage",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline", // needed to get a refresh_token
    prompt: "consent",       // forces Google to re-issue a refresh_token every time
    include_granted_scopes: "true",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}