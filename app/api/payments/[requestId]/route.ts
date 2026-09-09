import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const user = await currentUser(request); const { requestId } = await params;
  if (!user) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
  const db = adminSupabase(); const { data: row } = await db.from("service_payments").select("*").eq("request_id", requestId).maybeSingle();
  if (!row || (row.payer_id !== user.id && row.provider_id !== user.id)) return Response.json({ error: "Pagamento não encontrado." }, { status: 404 });
  return Response.json({ payment: row, payment_phone: "868787572", commission_percent: 7, provider_percent: 93 });
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const user = await currentUser(request); const { requestId } = await params;
  if (!user) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
  const form = await request.formData(); const candidate = form.get("proof");
  if (!(candidate instanceof File) || candidate.size === 0) return Response.json({ error: "Envie o comprovativo." }, { status: 400 });
  if (!candidate.type.startsWith("image/") && candidate.type !== "application/pdf") return Response.json({ error: "O comprovativo deve ser uma imagem ou PDF." }, { status: 400 });
  if (candidate.size > 8 * 1024 * 1024) return Response.json({ error: "O comprovativo não pode ultrapassar 8 MB." }, { status: 400 });
  const db = adminSupabase(); const { data: requestRow } = await db.from("service_requests").select("id,client_id,provider_id,status").eq("id", requestId).maybeSingle();
  if (!requestRow || requestRow.client_id !== user.id || !["accepted", "scheduled"].includes(requestRow.status)) return Response.json({ error: "O pagamento só pode ser enviado depois da aceitação do pedido." }, { status: 403 });
  const { data: provider } = await db.from("provider_profiles").select("starting_price").eq("id", requestRow.provider_id).maybeSingle();
  const gross = Number(form.get("amount") ?? provider?.starting_price ?? 0);
  if (!Number.isFinite(gross) || gross <= 0) return Response.json({ error: "Indique um valor válido para o serviço." }, { status: 400 });
  const path = `payments/${requestId}/${user.id}-${Date.now()}.${(candidate.name.split(".").pop() || "bin").toLowerCase()}`;
  const upload = await db.storage.from("private-documents").upload(path, Buffer.from(await candidate.arrayBuffer()), { contentType: candidate.type, upsert: false });
  if (upload.error) return Response.json({ error: "Não foi possível guardar o comprovativo." }, { status: 500 });
  const platform = Math.round(gross * 0.07 * 100) / 100;
  const values = { request_id: requestId, payer_id: requestRow.client_id, provider_id: requestRow.provider_id, gross_amount: gross, platform_fee_percent: 7, platform_fee_amount: platform, provider_amount: Math.round((gross - platform) * 100) / 100, currency: "MZN", provider: "transferencia_manual", status: "pending", payout_status: "due", payment_phone: "868787572", proof_storage_path: path, proof_file_name: candidate.name, proof_uploaded_at: new Date().toISOString(), payment_deadline_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() };
  const saved = await db.from("service_payments").upsert(values, { onConflict: "request_id" }).select().single();
  if (saved.error) return Response.json({ error: "O comprovativo foi guardado, mas não foi possível registar o pagamento." }, { status: 500 });
  const { data: admins } = await db.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) await db.from("notifications").insert(admins.map(admin => ({ user_id: admin.id, title: "Novo comprovativo de pagamento", body: `Pedido ${requestId} aguarda confirmação administrativa.`, href: "/admin" })));
  return Response.json({ ok: true, payment: saved.data });
}
