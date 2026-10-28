import { adminSupabase, currentUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Entre na sua conta." }, { status: 401 });
  const db = adminSupabase();
  const [{ data: provider }, { data: payments }, { data: completed }, { data: active }] = await Promise.all([
    db.from("provider_profiles").select("balance_amount,mpesa_number,emola_number,bank_name,bank_account,bank_nib").eq("id", user.id).maybeSingle(),
    db.from("service_payments").select("provider_amount,status,confirmed_at,created_at").eq("provider_id", user.id).order("created_at", { ascending: false }).limit(200),
    db.from("service_requests").select("id,created_at").eq("provider_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(200),
    db.from("service_requests").select("id,status").eq("provider_id", user.id).in("status", ["accepted", "scheduled"]).limit(100),
  ]);
  const paid = (payments ?? []).filter((row: any) => row.status === "paid");
  const days = new Set(paid.map((row: any) => String(row.confirmed_at ?? row.created_at).slice(0, 10)));
  const confirmedRevenue = paid.reduce((sum: number, row: any) => sum + Number(row.provider_amount ?? 0), 0);
  return Response.json({ balance: provider?.balance_amount ?? confirmedRevenue, confirmedRevenue, completedServices: completed?.length ?? 0, activeServices: active?.length ?? 0, workedDays: days.size, paymentMethods: { mpesa_number: provider?.mpesa_number ?? "", emola_number: provider?.emola_number ?? "", bank_name: provider?.bank_name ?? "", bank_account: provider?.bank_account ?? "", bank_nib: provider?.bank_nib ?? "" } });
}
