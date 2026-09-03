import { adminSupabase, currentUser } from "@/lib/supabase-server";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request); const { id } = await params; if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json(); const rating = Number(body.rating); if (!Number.isInteger(rating) || rating < 1 || rating > 5) return Response.json({ error: "Escolha uma classificação de 1 a 5." }, { status: 400 });
  const db = adminSupabase(); const { data: row } = await db.from("service_requests").select().eq("id", id).single();
  if (!row || row.client_id !== user.id || row.status !== "completed") return Response.json({ error: "Avaliação indisponível." }, { status: 403 });
  const created = await db.from("reviews").insert({ request_id: id, client_id: user.id, provider_id: row.provider_id, rating, comment: String(body.comment ?? "").slice(0, 800) });
  if (created.error) return Response.json({ error: "Este pedido já foi avaliado." }, { status: 409 });
  const { data: reviews } = await db.from("reviews").select("rating").eq("provider_id", row.provider_id); const values = (reviews ?? []).map(x => x.rating); const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  await db.from("provider_profiles").update({ rating: Math.round(average * 10) / 10, review_count: values.length }).eq("id", row.provider_id);
  await db.from("notifications").insert({ user_id: row.provider_id, title: "Nova avaliação", body: `Recebeu ${rating} estrela(s) por um serviço concluído.`, href: "/" });
  return Response.json({ ok: true });
}
