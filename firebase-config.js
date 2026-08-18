// ---------------------------------------------------------------------------
// Firebase setup
//
// 1. Create a project at https://console.firebase.google.com
// 2. Build > Authentication > Sign-in method > enable "Google"
// 3. Build > Firestore Database > Create database (production mode)
// 4. Project settings > General > Your apps > Web app: copy the config below
// 5. Authentication > Settings > Authorized domains: add <you>.github.io
//
// These values are NOT secrets. Firebase web config is public by design --
// your data is protected by the rules in firestore.rules, not by this file.
//
// Leave this as-is to run in local-only mode (data stays in this browser).
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

// Only this Google account may use the app. Fill in your own email address.
// Leave empty to allow any Google account (each account still gets its own
// private data). The real enforcement lives in firestore.rules.
export const ALLOWED_EMAIL = "";
