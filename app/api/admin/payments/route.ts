import { adminSupabase, currentUser } from "@/lib/supabase-server";

async function requireAdmin(request: Request) {
  const user = await currentUser(request); if (!user) return null;
  const { data } = await adminSupabase().from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin" ? user : null;
}

export async function GET(request: Request) {
  const user = await requireAdmin(request); if (!user) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const db = adminSupabase();
  const { data, error } = await db.from("service_payments").select("*,request:service_requests!service_payments_request_id_fkey(service,details,client_id,provider_id),payer:profiles!service_payments_payer_id_fkey(full_name,phone),provider_profile:profiles!service_payments_provider_id_fkey(full_name,phone)").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Não foi possível carregar as transações." }, { status: 500 });
  const payments = await Promise.all((data ?? []).map(async payment => {
    let proofUrl: string | null = null;
    if (payment.proof_storage_path) proofUrl = (await db.storage.from("private-documents").createSignedUrl(payment.proof_storage_path, 900)).data?.signedUrl ?? null;
    return { ...payment, proof_url: proofUrl };
  }));
  return Response.json({ payments });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin(request); if (!user) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const body = await request.json(); if (!body.id || !["confirm", "reject", "mark_payout_sent"].includes(body.action)) return Response.json({ error: "Ação inválida." }, { status: 400 });
  const db = adminSupabase(); const { data: payment } = await db.from("service_payments").select("*").eq("id", body.id).maybeSingle();
  if (!payment) return Response.json({ error: "Transação não encontrada." }, { status: 404 });
  if (body.action === "confirm") {
    const updated = await db.from("service_payments").update({ status: "paid", confirmed_by: user.id, confirmed_at: new Date().toISOString(), payout_status: "due" }).eq("id", body.id);
    if (updated.error) return Response.json({ error: "Não foi possível confirmar o comprovativo." }, { status: 500 });
    await db.from("notifications").insert([{ user_id: payment.payer_id, title: "Pagamento confirmado", body: "O pagamento foi confirmado pela administração.", href: "/" }, { user_id: payment.provider_id, title: "Pagamento confirmado", body: `O valor devido ao seu trabalho é ${payment.provider_amount} MZN.`, href: "/" }]);
  } else if (body.action === "reject") {
    await db.from("service_payments").update({ status: "failed", confirmed_by: user.id, confirmed_at: new Date().toISOString(), payout_status: "not_started" }).eq("id", body.id);
  } else {
    if (payment.status !== "paid") return Response.json({ error: "Confirme primeiro o pagamento." }, { status: 409 });
    await db.from("service_payments").update({ payout_status: "sent", payout_reference: String(body.reference ?? "").slice(0, 120), payout_sent_at: new Date().toISOString() }).eq("id", body.id);
    await db.from("notifications").insert({ user_id: payment.provider_id, title: "Pagamento ao prestador registado", body: `Foi registado o envio de ${payment.provider_amount} MZN.`, href: "/" });
  }
  return Response.json({ ok: true });
}
