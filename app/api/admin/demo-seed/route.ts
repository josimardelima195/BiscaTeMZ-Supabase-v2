import { adminSupabase, currentUser } from "@/lib/supabase-server";

const demos = [
  { full_name: "Amélia Manuel", email: "demo.electricista@biscatemz.com", password: "Demo-Bisca-2026!", phone: "+258841234567", category: "Eletricista", bio: "Instalações elétricas residenciais, manutenção preventiva e reparação de avarias com atenção à segurança.", province: "Maputo Cidade", district: "KaMpfumo", years_experience: 8, starting_price: 850 },
  { full_name: "Carlos Ernesto", email: "demo.psicologo@biscatemz.com", password: "Demo-Bisca-2026!", phone: "+258821234568", category: "Psicólogo", bio: "Acompanhamento psicológico, escuta ativa e apoio emocional para adultos e jovens em Maputo.", province: "Maputo Cidade", district: "Sommerschield", years_experience: 6, starting_price: 1200 },
  { full_name: "Lídia João", email: "demo.costureira@biscatemz.com", password: "Demo-Bisca-2026!", phone: "+258861234569", category: "Costureira", bio: "Alfaiataria, ajustes e confeção por medida para cerimónias, empresas e uso diário.", province: "Maputo Província", district: "Matola", years_experience: 10, starting_price: 500 },
];

async function requireAdmin(request: Request) {
  const user = await currentUser(request);
  if (!user) return null;
  const { data } = await adminSupabase().from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? user : null;
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return Response.json({ error: "Acesso administrativo recusado." }, { status: 403 });
  const db = adminSupabase();
  const created: { email: string; password: string; name: string }[] = [];
  for (const demo of demos) {
    const existing = await db.from("profiles").select("id").eq("full_name", demo.full_name).maybeSingle();
    if (existing.data?.id) continue;
    const result = await db.auth.admin.createUser({ email: demo.email, password: demo.password, email_confirm: true, user_metadata: { full_name: demo.full_name, role: "provider" } });
    if (result.error || !result.data.user) continue;
    const id = result.data.user.id;
    const profile = await db.from("profiles").insert({ id, full_name: demo.full_name, phone: demo.phone, photo_url: "/avatar.svg", role: "provider", city: demo.province });
    const provider = await db.from("provider_profiles").insert({ id, category: demo.category, bio: demo.bio, province: demo.province, district: demo.district, years_experience: demo.years_experience, starting_price: demo.starting_price, verification: "pending" });
    if (profile.error || provider.error) { await db.auth.admin.deleteUser(id); continue; }
    created.push({ email: demo.email, password: demo.password, name: demo.full_name });
  }
  return Response.json({ ok: true, created, message: created.length ? "Demonstrações adicionadas como pendentes." : "As demonstrações já existem." });
}
