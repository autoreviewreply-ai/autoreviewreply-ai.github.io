import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/session";
import { getUserDatabase } from "@/lib/database";
import {
  exchangeCodeForTokens,
  listGoogleAccounts,
  listLocationsForAccount,
} from "@/lib/google-business";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/?google_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?google_error=${encodeURIComponent(
        "Google did not return an authorization code."
      )}`
    );
  }

  const uid = await getSessionUid();

  if (!uid) {
    return NextResponse.redirect(
      `${origin}/?google_error=${encodeURIComponent(
        "Please sign in before connecting Google."
      )}`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/google-callback`;

    // Exchange Google's authorization code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get Google Business Profile accounts
    const accounts = await listGoogleAccounts(tokens.access_token);

    if (!accounts.length) {
      return NextResponse.redirect(
        `${origin}/?google_error=${encodeURIComponent(
          "No Google Business Profile account was found."
        )}`
      );
    }

    const googleAccount = accounts[0];

    // Get real Business Profile locations
    const locations = await listLocationsForAccount(
      tokens.access_token,
      googleAccount.name
    );

    if (!locations.length) {
      return NextResponse.redirect(
        `${origin}/?google_error=${encodeURIComponent(
          "No Google Business Profile locations were found."
        )}`
      );
    }

    const userDb = getUserDatabase(uid);

    await userDb.update((schema) => {
      // Save the REAL Google account
      schema.googleAccount = {
        id: googleAccount.name,
        email: "",
        name: googleAccount.accountName || "Google Business Profile",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        expiresAt: Date.now() + tokens.expires_in * 1000,
        isConnected: true,
      };

      // Save REAL Google locations
      schema.businessProfiles = locations.map((location) => {
        const locationId = location.name.split("/").pop() || location.name;

        const address = [
          ...(location.storefrontAddress?.addressLines || []),
          location.storefrontAddress?.locality,
          location.storefrontAddress?.administrativeArea,
          location.storefrontAddress?.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: locationId,
          googleAccountId: googleAccount.name,
          name: location.title || "Google Business Profile",
          category:
            location.categories?.primaryCategory?.displayName || "Business",
          address,
          phone: location.phoneNumbers?.primaryPhone || "",
          website: "",
          isAutoReplyEnabled: false,
          averageRating: 0,
          totalReviewsCount: 0,
        };
      });

      // Remove the old model/demo reviews
      schema.reviews = [];
      schema.replies = [];
      schema.notifications = [];
    });

    return NextResponse.redirect(
      `${origin}/?google_connected=true`
    );
  } catch (error: any) {
    console.error("Google OAuth callback error:", error);

    return NextResponse.redirect(
      `${origin}/?google_error=${encodeURIComponent(
        error?.message || "Failed to connect Google Business Profile."
      )}`
    );
  }
}