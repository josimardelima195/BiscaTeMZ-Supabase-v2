import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  const { id } = await params;
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const db = adminSupabase();
  const { data: row, error: requestError } = await db.from("service_requests").select("id,client_id,provider_id,status,service,estimated_amount,estimate_note").eq("id", id).maybeSingle();
  if (requestError || !row || row.provider_id !== user.id) return Response.json({ error: "Pedido indisponível" }, { status: 403 });
  if (!row.estimated_amount || Number(row.estimated_amount) <= 0) return Response.json({ error: "Envie primeiro o orçamento estimado da mão de obra antes de aceitar este pedido." }, { status: 409 });
  if (!["requested", "accepted", "scheduled"].includes(row.status)) return Response.json({ error: "Este pedido não está disponível para conversa." }, { status: 409 });

  let { data: conversation, error: conversationError } = await db.from("conversations").select("id").eq("request_id", id).maybeSingle();
  if (conversationError) return Response.json({ error: "Não foi possível localizar a conversa." }, { status: 500 });
  if (!conversation) {
    const created = await db.from("conversations").insert({ request_id: id }).select("id").single();
    conversation = created.data;
    conversationError = created.error;
    if (conversationError || !conversation) return Response.json({ error: "Falha ao abrir conversa. Tente novamente." }, { status: 500 });
  }
  const members = await db.from("conversation_members").upsert([{ conversation_id: conversation.id, user_id: row.client_id }, { conversation_id: conversation.id, user_id: row.provider_id }], { onConflict: "conversation_id,user_id", ignoreDuplicates: true });
  if (members.error) return Response.json({ error: "Falha ao ligar os participantes à conversa." }, { status: 500 });

  if (row.status === "requested") {
    const updated = await db.from("service_requests").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", id).eq("status", "requested");
    if (updated.error) return Response.json({ error: "Não foi possível aceitar o pedido." }, { status: 500 });
    const amount = Number(row.estimated_amount).toLocaleString("pt-MZ");
    await db.from("notifications").insert({ user_id: row.client_id, title: "Pedido aceite e orçamento enviado", body: `O prestador aceitou o pedido de ${row.service} com uma estimativa de ${amount} MZN.`, href: `/pagamento/${id}` });
    await db.from("messages").insert({ conversation_id: conversation.id, sender_id: row.provider_id, body: `Olá! Vi a sua requisição dos meus serviços. A estimativa da mão de obra é ${amount} MZN${row.estimate_note ? `. Observação: ${row.estimate_note}` : ""}. Podemos combinar aqui os detalhes. Depois do pagamento confirmado pela administração, o serviço poderá começar.`, expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() });
  }
  return Response.json({ conversationId: conversation.id });
}
