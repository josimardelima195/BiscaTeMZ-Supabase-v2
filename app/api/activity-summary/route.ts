import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ requests: 0, messages: 0, notifications: 0 });
  const db = adminSupabase();
  const [{ data: profile }, { data: rows }, { data: notifications }] = await Promise.all([
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    db.from("service_requests").select("id,status,client_id,provider_id,payment:service_payments(status)").or(`client_id.eq.${user.id},provider_id.eq.${user.id}`),
    db.from("notifications").select("id").eq("user_id", user.id),
  ]);
  const isProvider = profile?.role === "provider";
  const requests = (rows ?? []).filter((row: any) => isProvider ? row.status === "requested" : row.status === "accepted" && !row.payment?.[0]).length;
  const conversationIds = (await db.from("conversation_members").select("conversation_id").eq("user_id", user.id)).data?.map((x: any) => x.conversation_id) ?? [];
  let messages = 0;
  if (conversationIds.length) {
    const { count } = await db.from("messages").select("id", { count: "exact", head: true }).in("conversation_id", conversationIds).neq("sender_id", user.id).is("read_at", null);
    messages = count ?? 0;
  }
  return Response.json({ requests, messages, notifications: notifications?.length ?? 0 });
}
