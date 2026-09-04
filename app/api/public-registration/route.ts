import { adminSupabase } from "@/lib/supabase-server";
const docKinds = new Set(["bi_front","bi_back","certificate","licence","nuit","criminal_record"]);
export async function POST(request: Request) {
  let userId: string | null = null; let stage = "início";
  try {
    stage = "ler formulário"; const form = await request.formData(); const data = JSON.parse(String(form.get("data") ?? "{}")) as Record<string,string>;
    const photo = form.get("photo"); const docs = form.getAll("documents").filter((x): x is File => x instanceof File); const types = String(form.get("documentTypes") ?? "").split("|");
    if (!data.name || !/^\d{9}$/.test((data.phone ?? "").replace(/\D/g,"")) || !/^\S+@\S+\.\S+$/.test(data.email ?? "") || String(data.password ?? "").length < 6 || !data.category || !data.province || !data.district || (data.bio ?? "").length < 20) return Response.json({error:"Preencha todos os dados obrigatórios e use uma palavra-passe de pelo menos 6 caracteres."},{status:400});
    if (!(photo instanceof File) || !/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 5*1024*1024) return Response.json({error:"Foto obrigatória: JPG, PNG ou WebP até 5 MB."},{status:400});
    if (docs.length < 2 || !types.includes("bi_front") || !types.includes("bi_back") || docs.some(x=>x.size>8*1024*1024)) return Response.json({error:"Envie BI frente e verso; cada ficheiro até 8 MB."},{status:400});
    stage = "criar conta"; const db=adminSupabase();
    const created=await db.auth.admin.createUser({email:data.email.trim().toLowerCase(),password:String(data.password),email_confirm:true,user_metadata:{full_name:data.name.slice(0,120),role:"provider"}});
    if(created.error || !created.data.user)return Response.json({error:created.error?.message||"Não foi possível criar a conta."},{status:409});
    const id=created.data.user.id; userId=id; stage = "guardar foto de perfil"; const photoPath=`${id}/perfil-${crypto.randomUUID()}`;
    const {error:photoError}=await db.storage.from("profile-photos").upload(photoPath,photo,{contentType:photo.type,upsert:false}); if(photoError) throw photoError;
    const {data:photoUrl}=db.storage.from("profile-photos").getPublicUrl(photoPath);
    stage = "guardar perfil"; const {error:profileError}=await db.from("profiles").insert({id,full_name:data.name.slice(0,120),phone:`+258${data.phone.replace(/\D/g,"").slice(-9)}`,photo_url:photoUrl.publicUrl,role:"provider",city:data.province}); if(profileError) throw profileError;
    stage = "guardar dados profissionais"; const latitude=Number(data.latitude),longitude=Number(data.longitude); const safeLat=Number.isFinite(latitude)&&latitude>=-90&&latitude<=90?latitude:null; const safeLng=Number.isFinite(longitude)&&longitude>=-180&&longitude<=180?longitude:null; const {error:providerError}=await db.from("provider_profiles").insert({id,category:data.category.slice(0,80),bio:data.bio.slice(0,1200),province:data.province.slice(0,80),district:data.district.slice(0,120),starting_price:Number(data.price||0),years_experience:Number(data.experience||0),latitude:safeLat,longitude:safeLng}); if(providerError) throw providerError;
    stage = "guardar documentos"; await Promise.all(docs.map(async(file,i)=>{const kind=types[i];if(!docKinds.has(kind))return;const path=`${id}/${kind}/${crypto.randomUUID()}`;const up=await db.storage.from("private-documents").upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const row=await db.from("provider_documents").insert({provider_id:id,kind,storage_path:path,file_name:file.name.slice(0,180)});if(row.error)throw row.error;}));
    return Response.json({ok:true,message:"Cadastro enviado. Depois de aprovado, receberá acesso ao perfil profissional."});
  } catch (error) { console.error("public-registration failed",{stage,error}); if(userId) await adminSupabase().auth.admin.deleteUser(userId); return Response.json({error:`Não foi possível guardar o cadastro na etapa: ${stage}. Verifique a configuração do Supabase e tente novamente.`},{status:500}); }
}
