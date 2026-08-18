# Amex Gold Benefit Tracker

A single-page tracker for the dining credits on the **American Express Gold Card (personal)**.
Mark each credit as used and the date you used it; the app shows what you've captured,
what's still open, and what has already expired.

Static site — no build step, no server. Host it free on GitHub Pages, with
Firebase Auth (Google sign-in) + Firestore for private, synced storage.

## What it tracks

| Credit | Amount | Resets | Where it works |
| --- | --- | --- | --- |
| Dining Credit | $10 | Monthly | Grubhub, Five Guys, The Cheesecake Factory, Goldbelly, Wine.com |
| Uber Cash | $10 | Monthly | Uber Eats orders and Uber rides (U.S.) |
| Dunkin' | $7 | Monthly | U.S. Dunkin' locations, $7+ purchases |
| Resy | $50 | Semi-annual (Jan–Jun, Jul–Dec) | U.S. Resy restaurants |

**$424/year total.** All four require one-time enrollment in the Benefits section
of your Amex account before spend counts, and none of them roll over.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. With no Firebase config it runs in local-only
mode and saves to `localStorage` in that browser.

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Sign-in method** → enable **Google**.
3. **Build → Firestore Database → Create database** → *Production mode*.
4. **Project settings → General → Your apps → Web app** (`</>`), register the app,
   and copy the `firebaseConfig` values into `firebase-config.js`.
5. Run the site and sign in once. With `ALLOWED_UID` still empty the app starts
   in **setup mode** and shows you your Firebase Auth UID.
6. Paste that UID into `ALLOWED_UID` in `firebase-config.js` **and** into
   `firestore.rules` in place of `PASTE_YOUR_UID_HERE`.
7. Copy the contents of `firestore.rules` into **Firestore Database → Rules →
   Publish**. Nothing is enforced until you do this.

### Data layout

One document per year, so the whole view is a single read:

```
users/{uid}/years/{2026}
  periods:
    "2026-08": { dining: { date: "2026-08-17" }, uber: {...}, dunkin: {...} }
    "2026-H2": { resy:   { date: "2026-08-17" } }
```

## Threat model

Everything in this repo is public, including `firebase-config.js`. That is
fine, and it was never the thing protecting the data. Worth writing down once
so it does not get re-litigated later.

### What is and is not protected

| | Protected? |
| --- | --- |
| The page (`index.html`, `app.js`, `styles.css`) | **No.** Static files on GitHub Pages are world-readable. |
| The Firebase config values | **No, by design.** They ship in the JS bundle of every Firebase web app. |
| Your benefit data in Firestore | **Yes.** Server-side rules, enforced by Google. |
| Your Firebase project's user list | **Partially.** See "Residual exposure" below. |

The API key and project ID are identifiers, not credentials. Hiding them would
buy nothing, which is why they are committed rather than gitignored. What would
be a real secret — a service-account JSON or Admin SDK private key — is not in
this repo and is not needed, since the app is client-side only.

### The actual boundary

`firestore.rules`:

```
allow read, write: if request.auth != null
                   && request.auth.uid == userId
                   && request.auth.uid == '<owner-uid>';
```

Both clauses must hold, so a signed-in stranger with UID `X` is denied on every
path: at `/users/X/...` the owner clause fails, and at `/users/<owner>/...` the
`uid == userId` clause fails. There is no route through it, and stripping the
client-side check out of `app.js` does not change the answer.

`ALLOWED_UID` in `firebase-config.js` is **UI only**. It exists so a stranger
sees a clear "not authorised" screen instead of an empty tracker. It ships to
every visitor and can be edited in devtools. Never treat it as the boundary.

Verified against the live project: anonymous read of `/users`, anonymous read of
the owner's document path, and an anonymous write all return
`PERMISSION_DENIED`.

### Residual exposure

`localhost` is an authorized domain by default. Anyone can therefore clone this
repo, run it locally, and complete Google sign-in against the project — which
creates a user record under **Authentication > Users**. They still read and
write nothing.

So the honest statement is: strangers cannot touch the data, but they can
create accounts in the project. That is nuisance-grade, not a breach.

To close it, remove `localhost` from **Authentication > Settings > Authorized
domains** once development is done; cloners then get `auth/unauthorized-domain`.
The cost is that local development needs it re-added, or needs the Auth
emulator.

### Deliberately not done

- **HTTP referrer restrictions on the browser API key.** Google's popup sign-in
  does not reliably set a referrer, and this is a known cause of broken
  `GoogleAuthProvider` flows: https://github.com/firebase/firebase-js-sdk/issues/5657
- **App Check.** The correct answer to "someone cloned my config" if junk
  accounts ever become a real problem. More setup than this app currently
  warrants.

## Deploy to GitHub Pages

```bash
git init && git add -A && git commit -m "Amex Gold benefit tracker"
git branch -M main
git remote add origin git@github.com:<you>/amex-benefit-tracker.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

Finally, add `<you>.github.io` under **Firebase → Authentication → Settings →
Authorized domains**, or Google sign-in will be rejected on the live site.

## Note on automatic tracking

There is no free American Express API for reading your own card transactions.
Amex's developer program is for merchants and partners, not cardholders, so
automatic detection would require a paid bank-data aggregator, and even then the
statement-credit posting is not reliably distinguishable from the underlying
charge. Manual marking is the practical approach here.
