import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
  const db = adminSupabase();
  const [profile, provider] = await Promise.all([
    db.from("profiles").select("id,full_name,phone,photo_url,role,city").eq("id", user.id).maybeSingle(),
    db.from("provider_profiles").select("category,bio,province,district,latitude,longitude,starting_price,years_experience,verification").eq("id", user.id).maybeSingle(),
  ]);
  if (profile.error) return Response.json({ error: "Não foi possível carregar a conta." }, { status: 500 });
  return Response.json({ profile: profile.data, provider: provider.data ?? null });
}

export async function PATCH(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
  const db = adminSupabase();
  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, string> = {};
  let photo: File | null = null;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    body = JSON.parse(String(form.get("data") ?? "{}"));
    const candidate = form.get("photo");
    if (candidate instanceof File && candidate.size > 0) photo = candidate;
  } else body = await request.json();

  const name = String(body.full_name ?? "").trim();
  if (name && name.length < 3) return Response.json({ error: "O nome deve ter pelo menos 3 caracteres." }, { status: 400 });
  if (body.phone && !/^\d{9}$/.test(String(body.phone))) return Response.json({ error: "O contacto deve ter exatamente 9 dígitos." }, { status: 400 });

  let photoUrl: string | undefined;
  if (photo) {
    if (!photo.type.startsWith("image/") || photo.size > 5 * 1024 * 1024) return Response.json({ error: "A foto deve ser uma imagem até 5 MB." }, { status: 400 });
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/profile-${Date.now()}.${ext}`;
    const upload = await db.storage.from("profile-photos").upload(path, Buffer.from(await photo.arrayBuffer()), { contentType: photo.type, upsert: false });
    if (upload.error) return Response.json({ error: "Não foi possível guardar a nova foto de perfil." }, { status: 500 });
    photoUrl = db.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
  }

  const profileUpdate: Record<string, unknown> = {};
  for (const key of ["full_name", "phone", "city"]) if (body[key] !== undefined) profileUpdate[key] = String(body[key]).trim();
  if (photoUrl) profileUpdate.photo_url = photoUrl;
  if (Object.keys(profileUpdate).length) {
    const updated = await db.from("profiles").update(profileUpdate).eq("id", user.id);
    if (updated.error) return Response.json({ error: "Não foi possível atualizar os dados da conta." }, { status: 500 });
  }

  const providerKeys = ["category", "bio", "province", "district", "latitude", "longitude", "starting_price", "years_experience"];
  const providerUpdate: Record<string, unknown> = {};
  for (const key of providerKeys) if (body[key] !== undefined && body[key] !== "") providerUpdate[key] = ["latitude", "longitude", "starting_price"].includes(key) ? Number(body[key]) : ["years_experience"].includes(key) ? Number(body[key]) : String(body[key]).trim();
  if (Object.keys(providerUpdate).length) {
    const updated = await db.from("provider_profiles").update(providerUpdate).eq("id", user.id);
    if (updated.error) return Response.json({ error: "Não foi possível atualizar os dados profissionais." }, { status: 500 });
  }
  return Response.json({ ok: true, photo_url: photoUrl ?? null });
}
