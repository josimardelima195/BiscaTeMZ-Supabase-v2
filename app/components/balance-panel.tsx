"use client";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase";
const supabase = browserSupabase();
export default function BalancePanel() {
  const [data, setData] = useState<any>(null), [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const token = (await supabase.auth.getSession()).data.session?.access_token ?? ""; const response = await fetch("/api/account/balance", { headers: { Authorization: `Bearer ${token}` } }); if (response.ok) setData(await response.json()); setLoading(false); })(); }, []);
  if (loading) return <p className="privacy-note">A carregar o saldo…</p>;
  if (!data) return <p className="account-message">Não foi possível carregar o saldo.</p>;
  const methods = data.paymentMethods ?? {};
  return <section className="balance-panel"><div className="balance-hero"><span>Saldo disponível</span><strong>{Number(data.balance ?? 0).toLocaleString("pt-MZ")} MZN</strong><small>O valor é actualizado depois da confirmação administrativa do pagamento.</small></div><div className="balance-stats"><article><b>{data.confirmedRevenue.toLocaleString("pt-MZ")} MZN</b><small>Facturação confirmada</small></article><article><b>{data.completedServices}</b><small>Serviços concluídos</small></article><article><b>{data.activeServices}</b><small>Serviços em curso</small></article><article><b>{data.workedDays}</b><small>Dias trabalhados</small></article></div><div className="balance-methods"><div><p className="eyebrow">RECEBIMENTOS</p><h3>Os seus dados de pagamento</h3><p className="privacy-note">Para alterar estes dados, use o formulário do seu perfil e guarde as alterações.</p></div><dl><div><dt>M-Pesa</dt><dd>{methods.mpesa_number || "Ainda não definido"}</dd></div><div><dt>e-Mola</dt><dd>{methods.emola_number || "Ainda não definido"}</dd></div><div><dt>Banco / NIB</dt><dd>{methods.bank_name || "Ainda não definido"}{methods.bank_nib ? ` · ${methods.bank_nib}` : ""}</dd></div></dl></div></section>;
}
