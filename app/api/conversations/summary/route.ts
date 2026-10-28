import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ conversations: [] }, { status: 401 });
  const db = adminSupabase();
  const memberships = await db.from("conversation_members").select("conversation_id").eq("user_id", user.id);
  const ids = (memberships.data ?? []).map((row: any) => row.conversation_id);
  if (!ids.length) return Response.json({ conversations: [] });
  const result = await db.from("conversations").select("id,request_id,request:service_requests(id,service,status,client:profiles!service_requests_client_id_fkey(full_name),provider:profiles!service_requests_provider_id_fkey(full_name)),messages(id,sender_id,read_at,body,created_at)").in("id", ids).limit(100);
  if (result.error) return Response.json({ error: "Não foi possível carregar as conversas." }, { status: 500 });
  const conversations = (result.data ?? []).map((row: any) => {
    const messages = (row.messages ?? []).sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));
    const last = messages[messages.length - 1];
    return { id: row.id, request_id: row.request_id, request: Array.isArray(row.request) ? row.request[0] : row.request, message_count: messages.length, unread_count: messages.filter((m: any) => m.sender_id !== user.id && !m.read_at).length, last_body: last?.body ?? null, last_created_at: last?.created_at ?? null };
  });
  return Response.json({ conversations });
}
