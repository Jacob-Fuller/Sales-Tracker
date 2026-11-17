// App-wide settings. Profit Board keeps everything on the phone (no accounts).
export const APP_NAME = "Profit Board";

// Apple in-app purchases (create these in App Store Connect with the same ids).
export const PREMIUM_MONTHLY = "au.profitpocket.app.premium.monthly";
export const PREMIUM_LIFETIME = "au.profitpocket.app.premium.lifetime";
export const DEFAULT_PRICES = { monthly: "", lifetime: "$9.99" };
// Free limits; Premium removes them.
export const FREE_LIMITS = { groups: 1, items: 3, recurring: 3 };
// Switch to false to unlock everything for everyone (e.g. while testing in TestFlight).
export const PREMIUM_ENFORCED = true;

// Public pages (privacy policy and support), served by GitHub Pages from /docs.
export const SITE_URL = "https://jacob-fuller.github.io/Sales-Tracker/";
export const PRIVACY_URL = SITE_URL + "privacy.html";
export const SUPPORT_URL = SITE_URL + "support.html";
export const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
