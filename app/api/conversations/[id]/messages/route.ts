import { adminSupabase, currentUser } from "@/lib/supabase-server";

async function member(id: string, userId: string) {
  const { data } = await adminSupabase().from("conversation_members").select("user_id").eq("conversation_id", id).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function isAdmin(userId: string) {
  const { data } = await adminSupabase().from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request); const { id } = await params;
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const db = adminSupabase(); const admin = await isAdmin(user.id); const allowed = await member(id, user.id);
  if (!allowed && !admin) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { data, error } = await db.from("messages").select("*,sender:profiles!messages_sender_id_fkey(full_name,photo_url)").eq("conversation_id", id).gt("expires_at", new Date().toISOString()).order("created_at");
  if (admin && !allowed) await db.from("admin_access_logs").insert({ admin_id: user.id, resource_type: "conversation", resource_id: id, action: "read_messages" });
  if (error) return Response.json({ error: "Não foi possível carregar a conversa." }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request); const { id } = await params;
  if (!user || !await member(id, user.id)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { body } = await request.json();
  if (!String(body ?? "").trim()) return Response.json({ error: "Escreva uma mensagem." }, { status: 400 });
  const { data, error } = await adminSupabase().from("messages").insert({ conversation_id: id, sender_id: user.id, body: String(body).trim().slice(0, 2000), expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() }).select().single();
  if (error) return Response.json({ error: "Falha ao enviar." }, { status: 500 });
  return Response.json({ message: data }, { status: 201 });
}
