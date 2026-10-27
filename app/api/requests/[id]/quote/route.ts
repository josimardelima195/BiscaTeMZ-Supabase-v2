import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  const { id } = await params;
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const note = String(body.note ?? "").trim().slice(0, 600);
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: "Indique um valor estimado válido em MZN." }, { status: 400 });
  const db = adminSupabase();
  const { data: row } = await db.from("service_requests").select("id,client_id,provider_id,status,service").eq("id", id).maybeSingle();
  if (!row || row.provider_id !== user.id || row.status !== "requested") return Response.json({ error: "Este pedido não está disponível para orçamento." }, { status: 403 });
  const { data, error } = await db.from("service_requests").update({ estimated_amount: Math.round(amount * 100) / 100, estimate_note: note || null, estimated_at: new Date().toISOString() }).eq("id", id).eq("status", "requested").select("id,estimated_amount,estimate_note,estimated_at").single();
  if (error) return Response.json({ error: "Não foi possível guardar o orçamento." }, { status: 500 });
  await db.from("notifications").insert({ user_id: row.client_id, title: "Orçamento recebido", body: `O prestador enviou uma estimativa de ${Number(amount).toLocaleString("pt-MZ")} MZN para ${row.service}.`, href: `/conta#pedidos` });
  return Response.json({ quote: data });
}
