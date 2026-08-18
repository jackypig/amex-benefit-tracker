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
  apiKey: "AIzaSyArUYk6FGiANpzT0nhCYDd8qO4w_n2Mxos",
  authDomain: "amex-benefit-tracker-a8c41.firebaseapp.com",
  projectId: "amex-benefit-tracker-a8c41",
  storageBucket: "amex-benefit-tracker-a8c41.firebasestorage.app",
  messagingSenderId: "332419102314",
  appId: "1:332419102314:web:228fb31540ca32037c7c13"
};

// No account is hardcoded here on purpose -- this file is public once the repo
// is. The first account to sign in claims the tracker on this device, and the
// real, server-side lock is the UID check in firestore.rules.
