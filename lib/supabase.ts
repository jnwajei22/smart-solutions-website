import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { BusinessRole } from "./access";
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
export async function serverClient() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server component; proxy handles refresh. */
          }
        },
      },
    },
  );
}
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function currentUser() {
  if (!configured()) return null;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user;
}
export async function isAdmin(id: string) {
  const { data, error } = await adminClient()
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  return !error && data?.role === "admin";
}
/** Read current database permissions on every request; never trust user metadata. */
export async function businessRole(user: User): Promise<BusinessRole | null> {
  if (!user.email_confirmed_at || !user.email) return null;
  if (await isAdmin(user.id)) return "admin";
  const { data, error } = await adminClient()
    .from("business_access")
    .select("role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();
  if (error || !["manager", "viewer"].includes(data?.role)) return null;
  return data!.role as BusinessRole;
}
