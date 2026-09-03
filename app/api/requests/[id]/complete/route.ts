import { adminSupabase, currentUser } from "@/lib/supabase-server";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request); const { id } = await params;
  if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const db = adminSupabase(); const { data: row } = await db.from("service_requests").select().eq("id", id).single();
  if (!row || row.provider_id !== user.id || !["accepted", "scheduled"].includes(row.status)) return Response.json({ error: "Este pedido não pode ser concluído." }, { status: 403 });
  await db.from("service_requests").update({ status: "completed" }).eq("id", id);
  const { count } = await db.from("service_requests").select("id", { count: "exact", head: true }).eq("provider_id", user.id).eq("status", "completed");
  await db.from("provider_profiles").update({ completed_services: count ?? 0 }).eq("id", user.id);
  await db.from("notifications").insert({ user_id: row.client_id, title: "Serviço concluído", body: "O prestador marcou o serviço como concluído. Pode deixar uma avaliação.", href: "/" });
  return Response.json({ ok: true });
}
