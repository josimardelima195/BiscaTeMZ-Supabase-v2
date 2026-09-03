import { adminSupabase,currentUser } from "@/lib/supabase-server";
export async function GET(request:Request){const u=await currentUser(request);if(!u)return Response.json({items:[]});const {data}=await adminSupabase().from("notifications").select().eq("user_id",u.id).order("created_at",{ascending:false}).limit(20);return Response.json({items:data??[]});}
