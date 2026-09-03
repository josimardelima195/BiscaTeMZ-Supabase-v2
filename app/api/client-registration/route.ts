import { adminSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || String(name).trim().length < 2 || !/^\S+@\S+\.\S+$/.test(String(email ?? "")) || String(password ?? "").length < 6) return Response.json({ error: "Indique nome, e-mail válido e palavra-passe de pelo menos 6 caracteres." }, { status: 400 });
    const db = adminSupabase();
    const created = await db.auth.admin.createUser({ email: String(email).trim().toLowerCase(), password: String(password), email_confirm: true, user_metadata: { full_name: String(name).trim().slice(0, 120), role: "client" } });
    if (created.error || !created.data.user) return Response.json({ error: created.error?.message ?? "Não foi possível criar a conta." }, { status: 409 });
    const { error } = await db.from("profiles").insert({ id: created.data.user.id, full_name: String(name).trim().slice(0, 120), role: "client" });
    if (error) { await db.auth.admin.deleteUser(created.data.user.id); throw error; }
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Não foi possível criar a conta. Tente novamente." }, { status: 500 }); }
}
