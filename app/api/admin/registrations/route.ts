import { adminSupabase, currentUser } from "@/lib/supabase-server";

async function admin(request: Request) {
  const u = await currentUser(request);
  if (!u) return null;
  const { data, error } = await adminSupabase().from("profiles").select("role").eq("id", u.id).maybeSingle();
  if (error || data?.role !== "admin") return null;
  return u;
}

export async function GET(request: Request) {
  if (!await admin(request)) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const db = adminSupabase();
  const providers = await db.from("provider_profiles").select("*").order("updated_at", { ascending: false });
  if (providers.error) {
    console.error("admin registrations provider_profiles", providers.error);
    return Response.json({ error: "Não foi possível consultar os perfis de prestador." }, { status: 500 });
  }
  const ids = (providers.data ?? []).map(row => row.id);
  if (!ids.length) return Response.json({ registrations: [] });
  const profiles = await db.from("profiles").select("id,full_name,phone,photo_url").in("id", ids);
  if (profiles.error) {
    console.error("admin registrations profiles", profiles.error);
    return Response.json({ error: "Não foi possível consultar os dados dos perfis." }, { status: 500 });
  }
  const documents = await db.from("provider_documents").select("*").in("provider_id", ids).order("created_at", { ascending: false });
  if (documents.error) {
    console.error("admin registrations documents", documents.error);
    return Response.json({ error: "Não foi possível consultar os documentos dos cadastros." }, { status: 500 });
  }
  const profileById = new Map((profiles.data ?? []).map(profile => [profile.id, profile]));
  const docsById = new Map<string, any[]>();
  for (const doc of documents.data ?? []) docsById.set(doc.provider_id, [...(docsById.get(doc.provider_id) ?? []), doc]);
  const registrations = await Promise.all((providers.data ?? []).map(async row => {
    const docs = await Promise.all((docsById.get(row.id) ?? []).map(async doc => {
      const signed = await db.storage.from("private-documents").createSignedUrl(doc.storage_path, 900);
      return { ...doc, url: signed.data?.signedUrl ?? null, storage_error: signed.error?.message ?? null };
    }));
    return { ...row, profile: profileById.get(row.id) ?? { full_name: "Perfil sem nome", phone: "", photo_url: null }, documents: docs };
  }));
  return Response.json({ registrations });
}

export async function PATCH(request: Request) {
  if (!await admin(request)) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const b = await request.json();
  if (!b.id || !["approved", "rejected"].includes(b.status)) return Response.json({ error: "Decisão inválida" }, { status: 400 });
  const db = adminSupabase();
  const { data: docs } = await db.from("provider_documents").select("kind").eq("provider_id", b.id).eq("status", "pending");
  const docUpdate = await db.from("provider_documents").update({ status: b.status, reviewed_at: new Date().toISOString() }).eq("provider_id", b.id).eq("status", "pending");
  if (docUpdate.error) return Response.json({ error: "Não foi possível atualizar o estado dos documentos." }, { status: 500 });
  const profileUpdate = await db.from("provider_profiles").update({ verification: b.status, certificate_count: (docs ?? []).filter(x => x.kind === "certificate" || x.kind === "licence").length }).eq("id", b.id);
  if (profileUpdate.error) return Response.json({ error: "Não foi possível atualizar o estado do prestador." }, { status: 500 });
  await db.from("notifications").insert({ user_id: b.id, title: b.status === "approved" ? "Perfil aprovado" : "Cadastro recusado", body: b.status === "approved" ? "O seu perfil está visível e pode receber pedidos." : "Revise os seus dados e documentos.", href: "/" });
  return Response.json({ ok: true });
}
