import { adminSupabase,currentUser } from "@/lib/supabase-server";

export async function GET(request:Request){
  const u=await currentUser(request); if(!u)return Response.json({items:[]});
  const db=adminSupabase();
  const {data:requests}=await db.from("service_requests").select("id,service,status,client_id,provider_id,created_at,accepted_at,payment:service_payments(status,confirmed_at)").or(`client_id.eq.${u.id},provider_id.eq.${u.id}`).order("created_at",{ascending:false}).limit(100);
  const now=Date.now();
  for(const row of requests??[]){
    const age=now-new Date(row.accepted_at??row.created_at).getTime();
    const payment=Array.isArray(row.payment)?row.payment[0]:row.payment;
    if(row.provider_id===u.id && ["accepted","scheduled"].includes(row.status) && age>=24*60*60*1000 && payment?.status!=="paid"){
      const title="Pagamento do serviço pendente"; const exists=await db.from("notifications").select("id").eq("user_id",u.id).eq("title",title).ilike("body",`%${row.id}%`).limit(1);
      if(!exists.data?.length)await db.from("notifications").insert({user_id:u.id,title,body:`O pedido “${row.service}” aguarda confirmação do pagamento. Verifique a conversa e contacte o cliente. Referência: ${row.id}`,href:`/conversas?request=${row.id}`});
    }
    if(row.client_id===u.id && row.status!=="completed" && payment?.status==="paid" && age>=72*60*60*1000){
      const title="Confirme se o trabalho foi concluído"; const exists=await db.from("notifications").select("id").eq("user_id",u.id).eq("title",title).ilike("body",`%${row.id}%`).limit(1);
      if(!exists.data?.length)await db.from("notifications").insert({user_id:u.id,title,body:`O serviço “${row.service}” já foi pago. Abra a conversa, confirme a conclusão e avalie o prestador. Referência: ${row.id}`,href:`/conversas?request=${row.id}`});
    }
  }
  const {data}=await db.from("notifications").select("id,title,body,href,created_at").eq("user_id",u.id).order("created_at",{ascending:false}).limit(20);
  return Response.json({items:data??[]});
}
