# Abacus Board (iPhone app)

A native app built with React Native and Expo, rebuilt from the Sales Tracker
web app. It works fully on the phone; an optional account backs up and syncs.

## What's in it
- Overview: profit, money in/out and recurring costs for this month, this
  financial year or all time, plus a six-month chart
- Projects as folders of items (each app, product line or stall), with shared
  project-wide costs and per-item profit; custom icon (logo, letters, colour)
- Sales against products, with channel fees, quantity, discount and customer
- One-off expenses and recurring costs (weekly to yearly) with stop/resume
- Products and customers
- Settings: currency, financial-year start, sales channels and their fees,
  expense categories, optional account (email + 6-digit code), Premium
- Premium through Apple: monthly or lifetime, with restore. Free plan limits are
  in `src/lib/config.ts` (`FREE_LIMITS`), as are the product ids and prices

## Checks
`npm test` checks the money maths (fees, discounts, recurring dates, financial
years), deletes and the sync merge. `npx tsc --noEmit` type-checks. GitHub runs
both on every push to `mobile/` (Actions → "Abacus Board check").

## Building for TestFlight (no Mac needed)
Codemagic builds it from `codemagic.yaml` at the repo root (workflow
"Abacus Board iOS → TestFlight"), using the same App Store Connect key as Wisebyte.
Before the first build:
1. App Store Connect → Apps → + → New App: "Abacus Board", bundle id
   `au.profitpocket.app` (register it under Identifiers first).
2. Codemagic → add this repo as an app.

## Before submitting
- See `APP-STORE-LISTING.md` for the listing text, in-app purchases and privacy answers.
- Turn on GitHub Pages for this repo (Settings → Pages → main branch, `/docs`)
  so the privacy and support pages are live, and put the contact email in them.
- Accounts: optional; follow `supabase/README.md`, then fill in `src/lib/config.ts`.

## Running locally
    npm install
    npx expo start
