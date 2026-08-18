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
5. Sign in once, then find your UID under **Authentication → Users**.
6. Paste that UID into `firestore.rules` in place of `PASTE_YOUR_UID_HERE`, then
   copy the file's contents into **Firestore Database → Rules → Publish**.

No account is hardcoded in the source. The first Google account to sign in
claims the tracker in that browser; the authoritative lock is the UID check in
`firestore.rules`.

The values in `firebase-config.js` are not secrets — Firebase web config is public
by design, and it is safe to commit. Your data is protected by `firestore.rules`,
which is what actually restricts reads and writes to your UID alone.

### Data layout

One document per year, so the whole view is a single read:

```
users/{uid}/years/{2026}
  periods:
    "2026-08": { dining: { date: "2026-08-17" }, uber: {...}, dunkin: {...} }
    "2026-H2": { resy:   { date: "2026-08-17" } }
```

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
