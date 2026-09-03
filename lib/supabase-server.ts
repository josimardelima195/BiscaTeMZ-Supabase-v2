import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;

export const adminSupabase = () => createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

export async function currentUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await adminSupabase().auth.getUser(token);
  return data.user ?? null;
}
