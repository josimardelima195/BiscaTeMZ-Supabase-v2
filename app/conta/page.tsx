"use client";

import { FormEvent, useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase";

const supabase = browserSupabase();

type Profile = { full_name: string; phone: string | null; photo_url: string | null; role: "client" | "provider" | "admin"; city: string | null };
type Provider = { category: string; bio: string; province: string; district: string; latitude: number | null; longitude: number | null; starting_price: number; years_experience: number; verification: string };

async function authFetch(url: string, init: RequestInit = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
}

function AccountActivity(){const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");useEffect(()=>{let active=true;(async()=>{const r=await authFetch("/api/service-requests");const j=await r.json();if(!r.ok){if(active)setError(j.error??"Não foi possível carregar os pedidos.");setLoading(false);return;}const requests=j.requests??[];const enriched=await Promise.all(requests.map(async(r:any)=>{const conversation=Array.isArray(r.conversation)?r.conversation[0]:r.conversation;if(!conversation?.id)return {...r,messages:[]};const m=await authFetch(`/api/conversations/${conversation.id}/messages`);const mj=await m.json();return {...r,messages:m.ok?(mj.messages??[]):[]};}));if(active){setItems(enriched);setLoading(false);}})();return()=>{active=false}},[]);if(loading)return <p className="privacy-note">A carregar pedidos e mensagens…</p>;if(error)return <p className="account-message">{error}</p>;if(!items.length)return <p>Nenhum pedido ainda. Quando pedir um serviço, ele aparecerá aqui.</p>;return <div className="account-activity">{items.map((r:any)=><article className="activity-card" key={r.id}><div><b>{r.service}</b><small>{r.service_mode==="online"?"Online / à distância":"Presencial"} · {r.preferred_at?new Date(r.preferred_at).toLocaleString("pt-MZ"):"Horário não definido"}</small><small>{r.address_area} · {r.status}</small><p>{r.details}</p></div>{r.messages?.length?<div className="activity-messages">{r.messages.map((m:any)=><p key={m.id}><b>{m.sender?.full_name||"Utilizador"}</b>{m.body}</p>)}</div>:((Array.isArray(r.conversation)?r.conversation[0]:r.conversation)?.id)?<a className="payment-link" href={`/?chat=${(Array.isArray(r.conversation)?r.conversation[0]:r.conversation).id}`}>Abrir conversa</a>:null}</article>)}</div>}
export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    const response = await authFetch("/api/account/profile");
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Não foi possível carregar a conta."); return; }
    setProfile(data.profile); setProvider(data.provider);
    setForm({ ...data.profile, ...(data.provider ?? {}) });
  })(); }, []);

  const update = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const useLocation = () => navigator.geolocation?.getCurrentPosition(position => {
    update("latitude", String(position.coords.latitude)); update("longitude", String(position.coords.longitude)); setMessage("Localização aproximada atualizada com consentimento.");
  }, () => setMessage("Não foi possível obter a localização. Pode continuar sem ela."), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formData = new FormData();
    formData.set("data", JSON.stringify(form)); if (photo) formData.set("photo", photo);
    const response = await authFetch("/api/account/profile", { method: "PATCH", body: formData });
    const data = await response.json(); setBusy(false); setMessage(response.ok ? "Dados atualizados com sucesso." : (data.error ?? "Não foi possível guardar as alterações."));
    if (response.ok) { setPhoto(null); const fresh = await authFetch("/api/account/profile"); const next = await fresh.json(); setProfile(next.profile); setProvider(next.provider); setForm({ ...next.profile, ...(next.provider ?? {}) }); }
  }

  if (!profile) return <main className="account-page"><section className="account-shell"><p>{message || "A carregar a sua conta…"}</p></section></main>;
  const isProvider = profile.role === "provider" || Boolean(provider);
  return <main className="account-page"><header className="account-top"><a className="brand" href="/"><b>B</b>BiscaTe<span>MZ</span></a><a href="/">Voltar ao início</a></header><section className="account-shell"><div className="account-heading"><div className="account-avatar">{profile.photo_url ? <img src={profile.photo_url} alt="Foto de perfil" /> : <span>{profile.full_name?.charAt(0).toUpperCase()}</span>}</div><div><p className="eyebrow">A MINHA CONTA</p><h1>{profile.full_name}</h1><span>{isProvider ? "Perfil profissional" : "Conta de cliente"} · sessão ativa</span></div></div><nav className="account-tabs"><a className="active" href="#perfil">Perfil</a><a href="#seguranca">Segurança</a><a href="#pedidos">Pedidos e conversas</a></nav><form onSubmit={save} id="perfil" className="account-form"><div className="form-card"><p className="eyebrow">DADOS PESSOAIS</p><h2>Como podemos encontrar você?</h2><label>Nome completo<input value={form.full_name ?? ""} minLength={3} required onChange={e => update("full_name", e.target.value)} /></label><label>Contacto<input value={form.phone ?? ""} inputMode="numeric" pattern="[0-9]{9}" maxLength={9} onChange={e => update("phone", e.target.value)} placeholder="9 dígitos" /></label><label>Zona/cidade<input value={form.city ?? ""} onChange={e => update("city", e.target.value)} placeholder="Ex.: Matola" /></label><label className="upload">Mudar foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />{photo && <small>{photo.name}</small>}</label></div>{isProvider && <div className="form-card"><p className="eyebrow">PERFIL PROFISSIONAL</p><h2>Mantenha o seu currículo atualizado</h2><label>Profissão<input value={form.category ?? ""} onChange={e => update("category", e.target.value)} /></label><label>Província<input value={form.province ?? ""} onChange={e => update("province", e.target.value)} /></label><label>Distrito<input value={form.district ?? ""} onChange={e => update("district", e.target.value)} /></label><label>Sobre o seu trabalho<textarea value={form.bio ?? ""} onChange={e => update("bio", e.target.value)} /></label><label>Anos de experiência<input type="number" min={0} value={form.years_experience ?? 0} onChange={e => update("years_experience", e.target.value)} /></label><button type="button" className="location-consent" onClick={useLocation}>⌖ Atualizar localização aproximada</button>{form.latitude && <small className="privacy-note">Localização aproximada guardada. O endereço exato nunca é mostrado.</small>}<p className="verification-note">Estado do perfil: <b>{provider?.verification === "approved" ? "Aprovado" : "Em análise"}</b>. O BI permanece protegido e não é editável nesta área.</p></div>}<button className="primary account-save" disabled={busy}>{busy ? "A guardar…" : "Guardar alterações"}</button>{message && <p className="account-message">{message}</p>}</form><section id="seguranca" className="form-card"><p className="eyebrow">SEGURANÇA</p><h2>Os seus dados continuam protegidos</h2><p>O BI e os certificados permanecem privados e só podem ser consultados no painel administrativo autorizado. Para alterar a palavra-passe, use o fluxo de recuperação de conta.</p></section><section id="pedidos" className="form-card"><p className="eyebrow">ATIVIDADE</p><h2>Pedidos e conversas</h2><AccountActivity /></section></section><div className="mobile-dock"><a href="/">⌂<small>Início</small></a><a href="/#prestadores">⌕<small>Explorar</small></a><a href="/#pedidos">▣<small>Pedidos</small></a><a href="/#pedidos">◌<small>Conversas</small></a><a className="dock-active" href="/conta">◉<small>Conta</small></a></div></main>;
}
