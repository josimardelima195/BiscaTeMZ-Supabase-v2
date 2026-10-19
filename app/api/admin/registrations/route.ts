import { adminSupabase, currentUser } from "@/lib/supabase-server";

async function admin(request: Request) { const u = await currentUser(request); if (!u) return null; const { data } = await adminSupabase().from("profiles").select("role").eq("id", u.id).maybeSingle(); return data?.role === "admin" ? u : null; }

export async function GET(request: Request) {
  if (!await admin(request)) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const db = adminSupabase(); const providers = await db.from("provider_profiles").select("*").order("updated_at", { ascending: false });
  if (providers.error) return Response.json({ error: "Não foi possível consultar os perfis de prestador." }, { status: 500 });
  const ids = (providers.data ?? []).map(row => row.id); if (!ids.length) return Response.json({ registrations: [] });
  const [profiles, documents] = await Promise.all([db.from("profiles").select("id,full_name,phone,photo_url").in("id", ids), db.from("provider_documents").select("*").in("provider_id", ids).order("created_at", { ascending: false })]);
  if (profiles.error || documents.error) return Response.json({ error: "Não foi possível consultar os dados dos cadastros." }, { status: 500 });
  const profileById = new Map((profiles.data ?? []).map(profile => [profile.id, profile])); const docsById = new Map<string, any[]>();
  for (const doc of documents.data ?? []) docsById.set(doc.provider_id, [...(docsById.get(doc.provider_id) ?? []), doc]);
  const registrations = await Promise.all((providers.data ?? []).map(async row => { const docs = await Promise.all((docsById.get(row.id) ?? []).map(async doc => { const signed = await db.storage.from("private-documents").createSignedUrl(doc.storage_path, 900); return { ...doc, url: signed.data?.signedUrl ?? null, storage_error: signed.error?.message ?? null }; })); return { ...row, profile: profileById.get(row.id) ?? { full_name: "Perfil sem nome", phone: "", photo_url: null }, documents: docs }; }));
  return Response.json({ registrations });
}

export async function PATCH(request: Request) {
  const user = await admin(request); if (!user) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const b = await request.json(); if (!b.id || !["approved", "rejected"].includes(b.status)) return Response.json({ error: "Decisão inválida" }, { status: 400 });
  const db = adminSupabase(); const { data: docs } = await db.from("provider_documents").select("kind").eq("provider_id", b.id).eq("status", "pending");
  const docUpdate = await db.from("provider_documents").update({ status: b.status, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("provider_id", b.id).eq("status", "pending"); if (docUpdate.error) return Response.json({ error: "Não foi possível atualizar o estado dos documentos." }, { status: 500 });
  const profileUpdate = await db.from("provider_profiles").update({ verification: b.status, certificate_count: (docs ?? []).filter(x => x.kind === "certificate" || x.kind === "licence").length }).eq("id", b.id); if (profileUpdate.error) return Response.json({ error: "Não foi possível atualizar o estado do prestador." }, { status: 500 });
  await db.from("notifications").insert({ user_id: b.id, title: b.status === "approved" ? "Perfil aprovado" : "Cadastro recusado", body: b.status === "approved" ? "O seu perfil está visível e pode receber pedidos." : "Revise os seus dados e documentos.", href: "/" }); return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await admin(request); if (!user) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const body = await request.json().catch(() => ({})); const id = String(body.id ?? ""); if (!id || id === user.id) return Response.json({ error: "Não pode remover a própria conta administrativa." }, { status: 400 });
  const db = adminSupabase(); const { data: provider } = await db.from("provider_profiles").select("id").eq("id", id).maybeSingle(); if (!provider) return Response.json({ error: "Prestador não encontrado." }, { status: 404 });
  const { count: requestCount } = await db.from("service_requests").select("id", { count: "exact", head: true }).or(`client_id.eq.${id},provider_id.eq.${id}`); if ((requestCount ?? 0) > 0) return Response.json({ error: "Este prestador já tem pedidos ou histórico. Para proteger os registos, desative-o em vez de apagar a conta." }, { status: 409 });
  const docs = await db.from("provider_documents").select("storage_path").eq("provider_id", id); if (docs.data?.length) await db.storage.from("private-documents").remove(docs.data.map(x => x.storage_path));
  const portfolio = await db.from("provider_portfolio").select("storage_path").eq("provider_id", id); if (portfolio.data?.length) await db.storage.from("provider-portfolio").remove(portfolio.data.map(x => x.storage_path));
  const deleted = await db.auth.admin.deleteUser(id); if (deleted.error) return Response.json({ error: "Não foi possível remover a conta. " + deleted.error.message }, { status: 500 });
  await db.from("admin_access_logs").insert({ admin_id: user.id, resource_type: "provider", resource_id: id, action: "delete_account" });
  return Response.json({ ok: true });
}
