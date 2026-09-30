import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// This file must NEVER be imported from a Client Component - it holds
// a private service account key with full admin access to your Firebase
// project. It is only safe to use inside app/api/*/route.ts files (or
// other server-only code), never inside components that render in the browser.

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Generate one in Firebase Console > Project Settings > Service Accounts > Generate new private key, " +
      "then paste the full JSON (or its base64 encoding) into a FIREBASE_SERVICE_ACCOUNT_KEY env var in Vercel."
    );
  }

  // Support pasting either the raw JSON or a base64-encoded copy of it
  // (base64 is handy because it avoids issues with newlines/quotes in env var UIs).
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  }
}

function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0];
  }
  return initializeApp({
    credential: cert(getServiceAccount()),
  });
}

const app = getAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
