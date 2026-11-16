# Profit Board (iPhone app)

A native app built with React Native and Expo, rebuilt from the Sales Tracker
web app. It works fully on the phone; an optional account backs up and syncs.

## What's in it
Styled like Budget Board (charcoal and gold, dark hero card, colour-coded cards),
with four tabs:
- Home: profit for this month, this financial year or all time (in, out, margin),
  how much to put aside for tax, every project's profit, and repeating costs
  due in the next 30 days
- Sales and Expenses: grouped by month, with search; repeating costs (weekly to
  yearly) with stop/resume
- Insights: the last 12 months in and out, where money comes from (by project
  or channel) and where it goes (by category), best sellers and key figures
  (average sale, margin, store fees, discounts, best month)
- Projects with their own colour, profit, best sellers and repeating costs;
  products; "Sell Again" on any sale
- The eye button hides every amount
- Tax Reports: a PDF per financial year, and a CSV spreadsheet of every sale
  and payment
- Settings: currency, financial-year start, sales channels and fees, expense
  categories, tax set-aside %, appearance, optional account (email + 6-digit
  code), Premium
- Premium through Apple: one-off lifetime unlock, with restore. Free plan limits
  are in `src/lib/config.ts` (`FREE_LIMITS`), as are the product ids and prices

## Checks
`npm test` checks the money maths (fees, discounts, recurring dates, financial
years), the Insights figures, coming-up costs, tax set-aside, CSV export, deletes
and the sync merge. `npx tsc --noEmit` type-checks. GitHub runs
both on every push to `mobile/` (Actions → "Profit Board check").

## Building for TestFlight (no Mac needed)
Codemagic builds it from `codemagic.yaml` at the repo root (workflow
"Profit Board iOS → TestFlight"), using the same App Store Connect key as Wisebyte.
Before the first build:
1. App Store Connect → Apps → + → New App: "Profit Board", bundle id
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
