import { createClient } from "@supabase/supabase-js";
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co").replace(/\/rest\/v1\/?$/, "");
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_placeholder";
function browserStorage(){
  if(typeof window === "undefined") return undefined;
  const projectRef = (()=>{ try { return new URL(url).hostname.split(".")[0]; } catch { return "biscatemz"; } })();
  try { for(const key of Object.keys(window.localStorage)) if(key.startsWith(`sb-${projectRef}-auth-token`)) window.localStorage.removeItem(key); } catch {}
  return window.sessionStorage;
}
export const browserSupabase = () => createClient(url, publishable, { auth: { storage: browserStorage(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
