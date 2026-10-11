import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { ACCOUNTS_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

// null until the Supabase project is set up (see config.ts).
export const sb: SupabaseClient | null = ACCOUNTS_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Only keep the login fresh while the app is open; it refreshes again when it comes back.
if (sb && Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => {
    if (s === "active") sb.auth.startAutoRefresh();
    else sb.auth.stopAutoRefresh();
  });
}
