# Getting real Firebase login + storage working

## What changed
- Your login/signup now actually creates and verifies real Firebase accounts (previously any email/password combo just faked a login).
- All app data (reviews, business profiles, AI settings, team, notifications, subscription) is now stored in **Firestore**, one document per user, instead of a JSON file on disk. The JSON-file approach could never work on Vercel — its servers have a read-only, stateless filesystem, so nothing written there ever actually persisted.
- Every API route now requires a real signed-in session and only reads/writes that user's own data.

## The one thing you still need to do: add a service account key

Your server-side code (the API routes) needs admin-level access to Firebase to verify logins and read/write Firestore. This requires one new secret, in addition to the 8 environment variables you already have.

1. Go to the [Firebase Console](https://console.firebase.google.com/) → your project → the gear icon → **Project settings** → **Service accounts** tab.
2. Click **Generate new private key**. This downloads a `.json` file — keep it private, never commit it to GitHub.
3. Open that file, copy its entire contents.
4. In Vercel → your project → **Settings → Environment Variables**, add a new variable:
   - Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Value: paste the full JSON content
   - Environments: Production and Preview (same as your other Firebase vars)
5. Redeploy.

## Two more one-time steps in the Firebase Console

1. **Enable Email/Password sign-in**: Authentication → Sign-in method → enable "Email/Password".
2. **Create a Firestore database** (if you haven't already): Firestore Database → Create database → start in production mode. Then paste the contents of `firestore.rules` (included in this project) into the Rules tab and publish. This rule set denies all direct client access to Firestore — which is correct, since your app only ever reads/writes data through your own server (the Admin SDK), never directly from the browser.

## Housekeeping notes
- I removed `data/db.json` (the old fake database file) and `package-lock.json` (now out of date since `firebase` and `firebase-admin` were added to `package.json`). Vercel will regenerate the lockfile automatically on your next deploy since none is present — you don't need to do anything, just push as normal.

## After that
- Sign up for a brand-new account and it will be a genuinely empty workspace.
- Logging in with any email containing "carter" still loads the built-in demo data, so you (or anyone testing the product) can see it fully populated without manual setup.
- Your `GEMINI_API_KEY` was already set correctly, so AI reply generation should work as soon as the above is in place.

## Known limitation, not part of this fix
The "Connect Google Business Profile" button still **simulates** a connection with fake data — it doesn't call Google's real Business Profile API. Wiring that up for real requires its own Google Cloud OAuth consent screen and Business Profile API access approval from Google, which is a separate, larger project from getting login/storage working.
