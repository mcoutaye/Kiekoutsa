import { createClient } from "@supabase/supabase-js";

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          return fetch(url, { ...options, signal: controller.signal }).finally(
            () => clearTimeout(timer)
          );
        },
      },
    }
  );
}
