# Profit Board (iPhone app)

A native app built with React Native and Expo, rebuilt from the Sales Tracker
web app. Everything stays on the phone (no accounts).

## What's in it
- Overview: profit, money in/out and recurring costs for this month, this
  financial year or all time, plus a six-month chart
- Projects as folders of items (each app, product line or stall), with shared
  project-wide costs and per-item profit; custom icon (logo, letters, colour)
- Sales against products, with channel fees, quantity, discount and customer
- One-off expenses and recurring costs (weekly to yearly) with stop/resume
- Products and customers
- Settings: currency, financial-year start, sales channels and their fees,
  expense categories, Premium
- Premium through Apple: monthly or lifetime, with restore. Free plan limits are
  in `src/lib/config.ts` (`FREE_LIMITS`), as are the product ids and prices

## Checks
`npm test` checks the money maths (fees, discounts, recurring dates, financial
years), deletes and the sync merge. `npx tsc --noEmit` type-checks. GitHub runs
both on every push to `mobile/` (Actions → "Profit Board check").

## Building for TestFlight (no Mac needed)
GitHub builds it on its Macs (`.github/workflows/ios-testflight.yml`, same setup as
Budget Board). A commit on main with `[testflight]` in its message builds and uploads
a TestFlight build; or Actions → "iOS build to TestFlight" → Run workflow.
It needs four repo secrets (Settings → Secrets and variables → Actions), the same
values as the Budget Board repo: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `MATCH_PASSWORD`.

## Before submitting
- See `APP-STORE-LISTING.md` for the listing text, in-app purchases and privacy answers.
- Turn on GitHub Pages for this repo (Settings → Pages → main branch, `/docs`)
  so the privacy and support pages are live, and put the contact email in them.

## Running locally
    npm install
    npx expo start
