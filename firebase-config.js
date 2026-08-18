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

// The only account allowed to use this tracker, as a Firebase Auth UID.
//
// A UID is an opaque random string -- it does not reveal your email address,
// so it is safe to commit to a public repo. Leave it empty and the app runs in
// setup mode: sign in once and it will show you your UID to paste in here.
//
// This constant drives the UI. The binding check is the identical UID in
// firestore.rules, which Google enforces server-side.
export const ALLOWED_UID = "8npYmYebGoVvkogINsvq5b9YM0z2";
