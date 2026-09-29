import { GoogleAccount, getUserDatabase } from "./database";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_MGMT_BASE = "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const MYBUSINESS_V4_BASE = "https://mybusiness.googleapis.com/v4";

function clientCreds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET environment variables are not set.");
  }
  return { clientId, clientSecret };
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Failed to exchange Google auth code.");
  return data as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Failed to refresh Google access token.");
  return data as { access_token: string; expires_in: number };
}

export async function getValidAccessToken(uid: string, googleAccount: GoogleAccount): Promise<string> {
  const bufferMs = 60_000;
  if (googleAccount.expiresAt > Date.now() + bufferMs) {
    return googleAccount.accessToken;
  }
  if (!googleAccount.refreshToken) {
    throw new Error("Google connection has expired and has no refresh token. Please reconnect your Google account.");
  }
  const refreshed = await refreshAccessToken(googleAccount.refreshToken);
  const newExpiresAt = Date.now() + refreshed.expires_in * 1000;

  const userDb = getUserDatabase(uid);
  await userDb.update((schema) => {
    if (schema.googleAccount) {
      schema.googleAccount.accessToken = refreshed.access_token;
      schema.googleAccount.expiresAt = newExpiresAt;
    }
  });

  return refreshed.access_token;
}

async function googleGet(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Google API request failed: ${url}`);
  return data;
}

export async function listGoogleAccounts(accessToken: string) {
  const data = await googleGet(`${ACCOUNT_MGMT_BASE}/accounts`, accessToken);
  return (data.accounts || []) as Array<{ name: string; accountName: string; type: string }>;
}

export async function listLocationsForAccount(accessToken: string, accountResourceName: string) {
  const readMask = "name,title,storefrontAddress,phoneNumbers,categories,metadata";
  const data = await googleGet(
    `${BUSINESS_INFO_BASE}/${accountResourceName}/locations?readMask=${encodeURIComponent(readMask)}&pageSize=100`,
    accessToken
  );
  return (data.locations || []) as Array<{
    name: string;
    title?: string;
    storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string };
    phoneNumbers?: { primaryPhone?: string };
    categories?: { primaryCategory?: { displayName?: string } };
  }>;
}

export async function listReviewsForLocation(accessToken: string, accountResourceName: string, locationName: string) {
  const locationId = locationName.split("/").pop();
  const parent = `${accountResourceName}/locations/${locationId}`;
  const data = await googleGet(`${MYBUSINESS_V4_BASE}/${parent}/reviews?pageSize=50`, accessToken);
  return {
    parent,
    reviews: (data.reviews || []) as Array<{
      reviewId: string;
      reviewer?: { displayName?: string; profilePhotoUrl?: string };
      starRating?: string;
      comment?: string;
      createTime?: string;
      name: string;
      reviewReply?: { comment: string };
    }>,
  };
}

export async function postReviewReply(accessToken: string, reviewResourceName: string, comment: string) {
  const res = await fetch(`${MYBUSINESS_V4_BASE}/${reviewResourceName}/reply`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Failed to post reply to Google.");
  return data;
}

export function starRatingToNumber(starRating?: string): number {
  switch (starRating) {
    case "ONE": return 1;
    case "TWO": return 2;
    case "THREE": return 3;
    case "FOUR": return 4;
    case "FIVE": return 5;
    default: return 5;
  }
}