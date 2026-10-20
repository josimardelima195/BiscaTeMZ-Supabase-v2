import { adminSupabase } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminSupabase();
  const [providerResult, profileResult, portfolioResult, reviewsResult] = await Promise.all([
    db.from("provider_profiles").select("id,category,bio,services_offered,province,district,latitude,longitude,starting_price,years_experience,verification,certificate_count,completed_services,rating,review_count,available,working_hours,availability_note").eq("id", id).eq("verification", "approved").maybeSingle(),
    db.from("profiles").select("id,full_name,phone,photo_url,city").eq("id", id).maybeSingle(),
    db.from("provider_portfolio").select("id,file_name,caption,storage_path,created_at").eq("provider_id", id).order("created_at", { ascending: false }),
    db.from("reviews").select("id,client_id,rating,comment,created_at").eq("provider_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (providerResult.error) return Response.json({ error: "Não foi possível carregar o perfil." }, { status: 500 });
  if (!providerResult.data) return Response.json({ error: "Prestador não encontrado." }, { status: 404 });
  const reviews = reviewsResult.data ?? [];
  const clientIds = [...new Set(reviews.map((r:any) => r.client_id).filter(Boolean))];
  const clients = clientIds.length ? await db.from("profiles").select("id,full_name,photo_url").in("id", clientIds) : { data: [] as any[] };
  const clientMap = new Map((clients.data ?? []).map((c:any) => [c.id, c]));
  return Response.json({
    provider: { ...providerResult.data, profile: profileResult.data },
    portfolio: (portfolioResult.data ?? []).map(item => ({ ...item, url: db.storage.from("provider-portfolio").getPublicUrl(item.storage_path).data.publicUrl })),
    reviews: reviews.map((r:any) => ({ ...r, client: clientMap.get(r.client_id) ?? null })),
  });
}
