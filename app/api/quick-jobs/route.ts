import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET() {
  const db = adminSupabase();
  const { data, error } = await db.from("quick_jobs").select("id,owner_id,title,details,category,budget,currency,mode,location,preferred_at,status,created_at,expires_at").eq("status", "open").order("created_at", { ascending: false }).limit(60);
  if (error) return Response.json({ error: "Não foi possível carregar os trabalhos rápidos." }, { status: 500 });
  const now = Date.now();
  const visible = (data ?? []).filter((job: any) => !job.expires_at || new Date(job.expires_at).getTime() > now);
  const ownerIds = [...new Set(visible.map((job: any) => job.owner_id).filter(Boolean))];
  const owners = ownerIds.length ? await db.from("profiles").select("id,full_name,photo_url,city").in("id", ownerIds) : { data: [] as any[] };
  const ownerMap = new Map((owners.data ?? []).map((owner: any) => [owner.id, owner]));
  return Response.json({ jobs: visible.map((job: any) => ({ ...job, owner: ownerMap.get(job.owner_id) ?? null })) });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Entre na sua conta para lançar um trabalho rápido." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const details = String(body.details ?? "").trim();
  const category = String(body.category ?? "Outro").trim().slice(0, 80) || "Outro";
  const mode = body.mode === "online" ? "online" : "presencial";
  const location = String(body.location ?? "").trim().slice(0, 180) || null;
  const budget = body.budget === "" || body.budget == null ? null : Number(body.budget);
  if (title.length < 5 || title.length > 120) return Response.json({ error: "Escreva um título entre 5 e 120 caracteres." }, { status: 400 });
  if (details.length < 10 || details.length > 1800) return Response.json({ error: "Descreva o trabalho entre 10 e 1800 caracteres." }, { status: 400 });
  if (budget !== null && (!Number.isFinite(budget) || budget < 0)) return Response.json({ error: "Indique um valor válido em meticais." }, { status: 400 });
  const preferredAt = body.preferredAt ? new Date(String(body.preferredAt)).toISOString() : null;
  if (body.preferredAt && Number.isNaN(new Date(String(body.preferredAt)).getTime())) return Response.json({ error: "Indique uma data ou horário válido." }, { status: 400 });
  const db = adminSupabase();
  const { data, error } = await db.from("quick_jobs").insert({ owner_id: user.id, title, details, category, budget, mode, location, preferred_at: preferredAt, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }).select("id,title,details,category,budget,currency,mode,location,preferred_at,status,created_at,expires_at").single();
  if (error) return Response.json({ error: "Não foi possível publicar o trabalho rápido." }, { status: 500 });
  return Response.json({ job: { ...data, owner_id: user.id }, message: "Trabalho rápido publicado para a comunidade." }, { status: 201 });
}
