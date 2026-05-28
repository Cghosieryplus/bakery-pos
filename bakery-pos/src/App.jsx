import { useState, useEffect, useCallback, useRef } from "react";
import { loadState, saveState } from "./supabase";

const ITEMS = [
  { id: "bg_regular", name: "Big Regular",   price: 18,   cat: "Big",   desc: "" },
  { id: "bg_sesame",  name: "Big Sesame",    price: 18,   cat: "Big",   desc: "" },
  { id: "sm_regular", name: "Small Regular", price: 10,   cat: "Small", desc: "" },
  { id: "sm_sesame",  name: "Small Sesame",  price: 10,   cat: "Small", desc: "" },
  { id: "chummus",    name: "Chummus",       price: 5.99, cat: "Sides", desc: "½ lb" },
  { id: "techina",    name: "Techina",       price: 5.99, cat: "Sides", desc: "½ lb" },
];

const CATS = [
  { cat: "Big",   icon: "🍞", label: "Big Challah" },
  { cat: "Small", icon: "🍞", label: "Small Challah" },
  { cat: "Sides", icon: "🫙", label: "Sides" },
];

const C = {
  brown:"#5c3d1e", gold:"#c9933a", cream:"#fdf6ec", warm:"#f5e6c8",
  soft:"#e8d5b0", dark:"#2b1a0e", red:"#c0392b", green:"#1e7e4a",
  greenLight:"#eafaf1", greenBorder:"#a8d5b5", orange:"#e07b1a", charity:"#7b5ea7",
};

function getWeekKey(date=new Date()){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return d.toISOString().split("T")[0];}
function weekLabel(key){const d=new Date(key+"T00:00:00");const e=new Date(d);e.setDate(d.getDate()+6);const f=x=>x.toLocaleDateString("en-US",{month:"short",day:"numeric"});return `${f(d)} – ${f(e)}`;}

const emptyQty   = () => ITEMS.reduce((a, it) => ({ ...a, [it.id]: 0 }), {});
const emptyStock = () => ITEMS.reduce((a, it) => ({ ...a, [it.id]: 0 }), {});

const DEF = { stock: emptyStock(), orders: [], makeList: {}, weeklyData: {}, currentWeekKey: getWeekKey() };

const row=(x={})=>({display:"flex",alignItems:"center",gap:10,...x});
const col=(x={})=>({display:"flex",flexDirection:"column",gap:6,...x});
const card=(x={})=>({background:"white",borderRadius:12,boxShadow:"0 4px 20px rgba(92,61,30,.10)",border:`1px solid ${C.soft}`,overflow:"hidden",...x});
const ph={background:C.brown,color:C.cream,padding:"12px 18px",fontFamily:"Georgia,serif",fontSize:"1.05rem",display:"flex",alignItems:"center",gap:10};
const badge={marginLeft:"auto",background:C.gold,color:"white",fontSize:"0.7rem",fontWeight:700,padding:"2px 10px",borderRadius:20};
const btn=(bg=C.brown,color=C.cream,x={})=>({padding:"9px 16px",background:bg,color,border:"none",borderRadius:8,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",letterSpacing:1,textTransform:"uppercase",...x});
const inp=(x={})=>({padding:"9px 13px",border:`1.5px solid ${C.soft}`,borderRadius:8,fontSize:"1rem",background:C.cream,color:C.dark,width:"100%",fontFamily:"inherit",...x});
const qb={width:30,height:30,borderRadius:"50%",border:`1.5px solid ${C.gold}`,background:"white",color:C.gold,fontSize:"1.1rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"};
const g2={display:"grid",gridTemplateColumns:"1fr 1fr",gap:12};

function Toast({msg,type}){if(!msg)return null;const bg=type==="error"?C.red:type==="success"?C.green:type==="charity"?C.charity:C.brown;return <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:bg,color:"white",padding:"11px 22px",borderRadius:40,fontWeight:700,fontSize:"0.85rem",boxShadow:"0 8px 24px rgba(0,0,0,.2)",zIndex:999,whiteSpace:"nowrap",border:`2px solid ${C.gold}`}}>{msg}</div>;}

function Modal({title,msg,onConfirm,onCancel,confirmLabel="Confirm",confirmColor=C.orange}){return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div style={{background:"white",borderRadius:14,padding:"24px 22px",maxWidth:360,width:"100%",boxShadow:"0 12px 40px rgba(0,0,0,.3)",borderTop:`5px solid ${confirmColor}`}}><div style={{fontFamily:"Georgia,serif",color:C.brown,fontSize:"1.1rem",marginBottom:8}}>{title}</div><div style={{fontSize:"0.88rem",color:"#555",lineHeight:1.6,marginBottom:18}}>{msg}</div><div style={row()}><button onClick={onCancel} style={btn(C.soft,C.brown,{flex:1})}>Cancel</button><button onClick={onConfirm} style={btn(confirmColor,"white",{flex:2})}>{confirmLabel}</button></div></div></div>;}

function QC({value,onChange,min=0,big=false}){return <div style={row({gap:8})}><button style={qb} onClick={()=>onChange(Math.max(min,value-1))}>−</button><span style={{fontFamily:"Georgia,serif",fontSize:big?"2rem":"1.3rem",fontWeight:900,minWidth:big?44:28,textAlign:"center",color:C.brown}}>{value}</span><button style={qb} onClick={()=>onChange(value+1)}>+</button></div>;}

export default function App() {
  const [st, setSt]         = useState(DEF);
  const [screen, setScreen] = useState("order");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [toast, setToast]   = useState({ msg: "", type: "" });
  const [confirm, setConfirm] = useState(null);
  const [orderTab, setOrderTab] = useState("unpaid");
  const tt  = useRef(null);
  const saveTimer = useRef(null);

  const [custName, setCustName] = useState("");
  const [fq, setFq]             = useState(emptyQty());
  const [amtPaid, setAmtPaid]   = useState("");
  const [paidFull, setPaidFull] = useState(false);
  const [exempt, setExempt]     = useState(false);
  const [editOrd, setEditOrd]   = useState(null);
  const [eq, setEq]             = useState({});
  const [ep, setEp]             = useState("");
  const [epf, setEpf]           = useState(false);
  const [eex, setEex]           = useState(false);
  const [sInp, setSInp]         = useState({});
  const [vw, setVw]             = useState(getWeekKey());
  const [don, setDon]           = useState("");
  const [mi, setMi]             = useState({});

  const toast2 = (msg, type="") => {
    setToast({ msg, type });
    if (tt.current) clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast({ msg: "", type: "" }), 2800);
  };

  // Load from Supabase on mount
  useEffect(() => {
    loadState().then(remote => {
      if (remote) {
        const mergedStock = { ...emptyStock(), ...(remote.stock || {}) };
        setSt({ ...DEF, ...remote, stock: mergedStock });
        if (remote.currentWeekKey) setVw(remote.currentWeekKey);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Debounced save to Supabase
  const scheduleSave = useCallback((newState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveState(newState)
        .then(() => setSaveError(false))
        .catch(() => setSaveError(true));
    }, 800);
  }, []);

  const upd = useCallback(fn => setSt(p => {
    const n = fn({ ...p, stock: { ...p.stock }, orders: [...p.orders], makeList: { ...p.makeList }, weeklyData: { ...p.weeklyData } });
    scheduleSave(n);
    return n;
  }), [scheduleSave]);

  const ot = ITEMS.reduce((s, it) => s + (fq[it.id] || 0) * it.price, 0);
  const pa = exempt ? 0 : (paidFull ? ot : parseFloat(amtPaid) || 0);
  const bal = ot - pa;
  const unpaid = st.orders.filter(o => !o.pickedUp && !o.exempt && !(o.paidFull || o.paid >= o.total));
  const paid   = st.orders.filter(o => !o.pickedUp && (o.exempt || o.paidFull || o.paid >= o.total));
  const picked = st.orders.filter(o => o.pickedUp);
  const mke    = Object.entries(st.makeList).filter(([, q]) => q > 0);

  const placeOrder = () => {
    if (!custName.trim()) { toast2("Enter a customer name", "error"); return; }
    if (!ITEMS.some(it => (fq[it.id] || 0) > 0)) { toast2("Add at least one item", "error"); return; }
    upd(s => {
      const qtys = { ...fq };
      ITEMS.forEach(it => {
        const want = qtys[it.id] || 0; if (!want) return;
        const cur = s.stock[it.id] || 0;
        const after = cur - want;
        if (after < 0) { s.makeList[it.id] = (s.makeList[it.id] || 0) + Math.abs(after); s.stock[it.id] = -s.makeList[it.id]; }
        else { s.stock[it.id] = after; }
      });
      const ap  = exempt ? 0 : (paidFull ? ot : parseFloat(amtPaid) || 0);
      const ipf = !exempt && (paidFull || ap >= ot);
      const order = { id: Date.now().toString(), customer: custName.trim(), items: qtys, total: ot, paid: ap, paidFull: ipf, exempt: !!exempt, pickedUp: false, ts: new Date().toISOString() };
      s.orders = [order, ...s.orders];
      const wk = s.currentWeekKey;
      if (!s.weeklyData[wk]) s.weeklyData[wk] = { sold: {}, revenue: 0, charityDonated: 0 };
      ITEMS.forEach(it => { s.weeklyData[wk].sold[it.id] = (s.weeklyData[wk].sold[it.id] || 0) + (qtys[it.id] || 0); });
      if (!exempt && ipf) s.weeklyData[wk].revenue += ot;
      return s;
    });
    setCustName(""); setFq(emptyQty()); setAmtPaid(""); setPaidFull(false); setExempt(false);
    toast2("Order placed! 🎉", "success");
  };

  const markPaid = id => { upd(s => { const o = s.orders.find(x => x.id === id); if (!o) return s; const prev = o.paid || 0; o.paid = o.total; o.paidFull = true; const wk = s.currentWeekKey; if (!s.weeklyData[wk]) s.weeklyData[wk] = { sold: {}, revenue: 0, charityDonated: 0 }; s.weeklyData[wk].revenue += o.total - prev; return s; }); toast2("Marked as paid ✓", "success"); };
  const markPickedUp = id => { upd(s => { const o = s.orders.find(x => x.id === id); if (o) o.pickedUp = !o.pickedUp; return s; }); };
  const deleteOrder  = id => { const o = st.orders.find(x => x.id === id); setConfirm({ title: "🗑 Delete Order?", msg: `Delete order for ${o.customer}? ($${o.total.toFixed(2)})`, confirmColor: C.red, onConfirm: () => { upd(s => { s.orders = s.orders.filter(x => x.id !== id); return s; }); toast2("Order deleted"); } }); };
  const openEdit = id => { const o = st.orders.find(x => x.id === id); if (!o) return; setEditOrd(o); setEq({ ...o.items }); setEp(o.paid.toFixed(2)); setEpf(o.paidFull || o.paid >= o.total); setEex(!!o.exempt); };
  const saveEdit = () => { if (!editOrd) return; let t = 0; ITEMS.forEach(it => t += (eq[it.id] || 0) * it.price); const p = eex ? 0 : parseFloat(ep) || 0; const pf = !eex && (epf || p >= t); upd(s => { const o = s.orders.find(x => x.id === editOrd.id); if (!o) return s; ITEMS.forEach(it => { const diff = (eq[it.id] || 0) - (o.items[it.id] || 0); if (diff > 0) { const avail = Math.max(0, s.stock[it.id] || 0); const extra = Math.max(0, diff - avail); if (extra > 0) s.makeList[it.id] = (s.makeList[it.id] || 0) + extra; } else if (diff < 0) { const red = Math.abs(diff); const inMk = s.makeList[it.id] || 0; s.makeList[it.id] = Math.max(0, inMk - Math.min(red, inMk)); if (s.makeList[it.id] <= 0) delete s.makeList[it.id]; } const mq = s.makeList[it.id] || 0; s.stock[it.id] = mq > 0 ? -mq : Math.max(0, s.stock[it.id] || 0); }); o.customer = editOrd.customer; o.items = { ...eq }; o.total = t; o.paid = eex ? 0 : (pf ? t : p); o.paidFull = pf; o.exempt = eex; return s; }); setEditOrd(null); toast2("Order updated ✓", "success"); };

  const markMade = id => { const needed = st.makeList[id] || 0; const val = parseInt(mi[id] || ""); const making = isNaN(val) || val <= 0 ? needed : Math.min(val, needed); const rem = needed - making; upd(s => { if (rem <= 0) { delete s.makeList[id]; s.stock[id] = 0; } else { s.makeList[id] = rem; s.stock[id] = -rem; } return s; }); setMi(p => { const n = { ...p }; delete n[id]; return n; }); toast2(rem > 0 ? `Made ${making}, ${rem} still needed` : "All made ✓", "success"); };
  const setStock  = id => { const val = parseInt(sInp[id] || ""); if (isNaN(val) || val < 0) { toast2("Enter a valid number", "error"); return; } upd(s => { s.stock[id] = val; return s; }); setSInp(p => { const n = { ...p }; delete n[id]; return n; }); toast2("Stock updated ✓", "success"); };
  const adjStock  = (id, d) => { upd(s => { s.stock[id] = Math.max(0, (s.stock[id] || 0) + d); return s; }); };

  const startNewWeek = () => setConfirm({ title: "🗓 Start New Week?", confirmColor: C.charity, confirmLabel: "Start New Week", msg: "Clears paid & picked-up orders. Unpaid orders carry over. Stock, make list & baking plan stay.", onConfirm: () => { upd(s => { s.orders = s.orders.filter(o => !(o.exempt || o.paidFull || o.paid >= o.total) || !o.pickedUp); const prev = s.weeklyData[s.currentWeekKey] || {}; const owed = Math.max(0, (prev.revenue || 0) * 0.1 - (prev.charityDonated || 0)); s.currentWeekKey = getWeekKey(); if (!s.weeklyData[s.currentWeekKey]) s.weeklyData[s.currentWeekKey] = { sold: {}, revenue: 0, charityDonated: 0 }; if (owed > 0) s.weeklyData[s.currentWeekKey].charityCarriedOver = (s.weeklyData[s.currentWeekKey].charityCarriedOver || 0) + owed; return s; }); setVw(getWeekKey()); toast2("New week started! 🗓", "success"); } });

  const wd  = st.weeklyData[vw] || { sold: {}, revenue: 0, charityDonated: 0 };
  const rev = wd.revenue || 0; const ctw = rev * 0.1; const co = wd.charityCarriedOver || 0; const ct = ctw + co; const cd = wd.charityDonated || 0; const cow = Math.max(0, ct - cd);
  const logDon = () => { const amt = parseFloat(don) || 0; if (amt <= 0) { toast2("Enter a donation amount", "error"); return; } upd(s => { if (!s.weeklyData[vw]) s.weeklyData[vw] = { sold: {}, revenue: 0, charityDonated: 0 }; s.weeklyData[vw].charityDonated = (s.weeklyData[vw].charityDonated || 0) + amt; return s; }); setDon(""); toast2(`$${amt.toFixed(2)} donation recorded 🕊`, "charity"); };

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, background: C.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: `4px solid ${C.soft}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontFamily: "Georgia,serif", color: C.brown, fontSize: "1.1rem", letterSpacing: 2 }}>Loading your bakery…</div>
    </div>
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "Inter,system-ui,sans-serif", color: C.dark, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: C.brown, borderBottom: `3px solid ${C.gold}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", ...col({ gap: 10 }) }}>
          <div style={row({ justifyContent: "space-between" })}>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "1.4rem", letterSpacing: 2, color: C.gold }}>🥯 Crumb & Culture</div>
              <div style={{ fontSize: "0.6rem", letterSpacing: 2, textTransform: "uppercase", color: C.soft, opacity: .7 }}>Bakery POS</div>
            </div>
            <div style={row({ gap: 8 })}>
              {saveError && <span style={{ fontSize: "0.65rem", color: "#ff9999", fontWeight: 700 }}>⚠ Save failed</span>}
              <button onClick={startNewWeek} style={{ padding: "7px 14px", background: "rgba(201,147,58,.15)", color: C.gold, border: "1.5px solid rgba(201,147,58,.5)", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>🗓 New Week</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "16px 14px" }}>

        {/* ── ORDER ── */}
        {screen === "order" && <div style={col({ gap: 18 })}>
          <div style={card()}><div style={ph}><span>🛒</span> New Order</div>
            <div style={{ padding: "16px 18px", ...col({ gap: 14 }) }}>
              <div style={col({ gap: 5 })}><label style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>Customer Name</label><input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Enter customer name…" style={inp()} /></div>
              {CATS.map(({ cat, icon, label }) => <div key={cat}>
                <div style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", color: C.brown, fontWeight: 700, borderBottom: `2px solid ${C.soft}`, paddingBottom: 6, marginBottom: 10, letterSpacing: 1 }}>{icon} {label}</div>
                <div style={g2}>{ITEMS.filter(it => it.cat === cat).map(it => { const qty = fq[it.id] || 0; const stk = st.stock[it.id] || 0; const ov = qty > stk; return <div key={it.id} style={{ background: ov ? "#fff8f0" : C.cream, border: `1.5px solid ${ov ? C.orange : C.soft}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ fontWeight: 700, fontSize: "0.85rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>{it.name}</div><div style={{ fontSize: "0.75rem", color: "#aaa" }}>${it.price.toFixed(2)}{it.desc && <span style={{ marginLeft: 5, color: "#bbb" }}>· {it.desc}</span>}</div><div style={{ fontSize: "0.75rem", fontWeight: 700, color: stk === 0 ? C.red : C.green, marginBottom: 6 }}>In stock: {stk}</div>{ov && <div style={{ fontSize: "0.7rem", color: C.orange, fontWeight: 700, marginBottom: 4 }}>⚠ Exceeds stock</div>}<QC value={qty} onChange={v => setFq(p => ({ ...p, [it.id]: Math.max(0, v) }))} /></div>; })}</div>
              </div>)}
              {!exempt && <div style={{ background: C.warm, borderRadius: 10, padding: "14px 16px", border: `1.5px solid ${C.soft}`, ...col({ gap: 10 }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, color: C.brown, textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: 1 }}>Order Total</span><span style={{ fontFamily: "Georgia,serif", fontSize: "1.5rem", fontWeight: 900, color: C.gold }}>${ot.toFixed(2)}</span></div>
                <div style={row()}><label style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>Amount Paid</label><input type="number" min="0" step="0.01" value={amtPaid} onChange={e => { setAmtPaid(e.target.value); setPaidFull(false); }} placeholder="0.00" style={inp({ textAlign: "right", flex: 1 })} /></div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={paidFull} onChange={e => { setPaidFull(e.target.checked); if (e.target.checked) setAmtPaid(ot.toFixed(2)); }} style={{ width: 18, height: 18, accentColor: C.green }} /><span style={{ fontWeight: 700, fontSize: "0.85rem", color: C.green, textTransform: "uppercase", letterSpacing: 1 }}>Paid in Full</span></label>
                {ot > 0 && <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: `1px dashed ${C.soft}` }}><span style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase" }}>{bal > 0 ? "Balance Due" : bal === 0 ? "" : "Change"}</span><span style={{ fontFamily: "Georgia,serif", fontSize: "1.1rem", fontWeight: 900, color: bal > 0 ? C.red : bal === 0 ? C.green : C.brown }}>{bal > 0 ? `$${bal.toFixed(2)} owed` : bal === 0 ? "Paid in full ✓" : `$${Math.abs(bal).toFixed(2)} change`}</span></div>}
              </div>}
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={exempt} onChange={e => setExempt(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.charity }} /><span style={{ fontWeight: 700, fontSize: "0.85rem", color: C.charity, textTransform: "uppercase", letterSpacing: 1 }}>Exempt — No Payment Required</span></label>
              <button onClick={placeOrder} style={{ width: "100%", padding: 13, background: C.brown, color: C.cream, border: "none", borderRadius: 10, fontSize: "1rem", fontWeight: 700, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase" }}>Place Order</button>
            </div>
          </div>
        </div>}

        {/* ── ORDERS ── */}
        {screen === "orders" && <div style={card()}>
          <div style={ph}><span>📋</span> Orders <span style={badge}>{unpaid.length} unpaid</span></div>
          <div style={{ paddingBottom: 16 }}>
            <div style={{ display: "flex", borderBottom: `2px solid ${C.soft}` }}>{[{ id: "unpaid", l: "⏳ Unpaid", list: unpaid }, { id: "paid", l: "✅ Paid", list: paid }, { id: "pickedup", l: "📦 Picked Up", list: picked }].map(t => <button key={t.id} onClick={() => setOrderTab(t.id)} style={{ flex: 1, padding: "10px 4px", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: .5, color: orderTab === t.id ? C.brown : "#aaa", borderBottom: orderTab === t.id ? `3px solid ${C.gold}` : "3px solid transparent", marginBottom: -2 }}>{t.l} <span style={{ background: orderTab === t.id ? C.gold : C.soft, color: orderTab === t.id ? "white" : C.brown, borderRadius: 20, padding: "1px 7px", fontSize: "0.68rem" }}>{t.list.length}</span></button>)}</div>
            <div style={{ padding: "14px 16px", ...col({ gap: 10 }) }}>
              {(orderTab === "unpaid" ? unpaid : orderTab === "paid" ? paid : picked).map(o => {
                const isPd = o.exempt || o.paidFull || o.paid >= o.total; const status = o.exempt ? "exempt" : isPd ? "paid" : o.paid > 0 ? "partial" : "unpaid";
                const sl = o.exempt ? "Exempt 🕊" : isPd ? "Paid ✓" : o.paid > 0 ? "Partial" : "Unpaid";
                const bl = o.total - o.paid; const det = ITEMS.filter(it => (o.items[it.id] || 0) > 0).map(it => `${o.items[it.id]} × ${it.name}`).join(", ");
                const dt = new Date(o.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                const bg = isPd || o.exempt ? "#eafaf1" : "#fff8f0"; const br = isPd || o.exempt ? "#a8d5b5" : o.paid > 0 ? C.orange : "#f0d5a8";
                const bc = { "unpaid": ["#fdebd0", "#c0392b"], "partial": ["#fef0e0", C.orange], "paid": ["#d5f5e3", C.green], "exempt": ["#f3eeff", C.charity] }[status] || ["#fdebd0", "#c0392b"];
                return <div key={o.id} style={{ background: bg, border: `1.5px solid ${br}`, borderRadius: 10, padding: "13px 15px", ...col({ gap: 6 }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: "0.95rem", color: C.brown }}>👤 {o.customer}</span><span style={{ fontSize: "0.7rem", color: "#aaa" }}>{dt}</span></div>
                  <div style={{ fontSize: "0.84rem", color: "#666" }}>{det}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 2 }}>
                    <span style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", fontWeight: 700, color: C.gold }}>${o.total.toFixed(2)}</span>
                    {!o.exempt && o.paid > 0 && <span style={{ fontSize: "0.8rem", color: "#555" }}>Paid: ${o.paid.toFixed(2)}</span>}
                    {!o.exempt && bl > 0 && <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.red }}>Owes: ${bl.toFixed(2)}</span>}
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: bc[0], color: bc[1], border: `1px solid ${bc[1]}`, textTransform: "uppercase" }}>{sl}</span>
                    {o.pickedUp && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "#e0f0ff", color: "#1a6fa8", border: "1px solid #a8d0f0", textTransform: "uppercase" }}>📦 Picked Up</span>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {!o.exempt && !isPd && <button onClick={() => markPaid(o.id)} style={btn(C.green, "white", { padding: "6px 12px", fontSize: "0.75rem" })}>Mark Paid</button>}
                    {!o.pickedUp ? <button onClick={() => markPickedUp(o.id)} style={btn("#1a6fa8", "white", { padding: "6px 12px", fontSize: "0.75rem" })}>📦 Picked Up</button> : <button onClick={() => markPickedUp(o.id)} style={{ padding: "6px 12px", background: "transparent", color: "#1a6fa8", border: "1.5px solid #1a6fa8", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>Undo Pickup</button>}
                    <button onClick={() => openEdit(o.id)} style={btn(C.gold, "white", { padding: "6px 12px", fontSize: "0.75rem" })}>Edit</button>
                    <button onClick={() => deleteOrder(o.id)} style={{ padding: "6px 11px", background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>Delete</button>
                  </div>
                </div>;
              })}
              {(orderTab === "unpaid" ? unpaid : orderTab === "paid" ? paid : picked).length === 0 && <div style={{ textAlign: "center", color: "#bbb", padding: 20, fontSize: "0.9rem" }}>No orders here</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><button onClick={() => setConfirm({ title: "🗑 Clear All Orders", msg: "Delete all orders?", confirmColor: C.red, onConfirm: () => { upd(s => { s.orders = []; s.makeList = {}; return s; }); toast2("All orders cleared"); } })} style={{ padding: "6px 14px", background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 7, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: .7 }}>🗑 Clear All Orders</button></div>
            </div>
          </div>
        </div>}

        {/* ── BAKE ── */}
        {screen === "bake" && <div style={col({ gap: 18 })}>
          <div style={card()}>
            <div style={ph}><span>🔥</span> Needs to Be Made <span style={badge}>{mke.length} items</span></div>
            <div style={{ padding: "16px 18px", ...col({ gap: 12 }) }}>
              {mke.length === 0 ? <div style={{ textAlign: "center", color: "#bbb", padding: 20 }}>Nothing to make right now</div> : mke.map(([id, qty]) => { const it = ITEMS.find(x => x.id === id); return <div key={id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.cream, border: `1.5px solid ${C.orange}`, borderRadius: 10, padding: "12px 14px" }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: "0.85rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>{it?.name || id}</div>{it?.desc && <div style={{ fontSize: "0.72rem", color: "#aaa" }}>{it.desc}</div>}<div style={{ fontSize: "0.72rem", color: "#aaa" }}>needed</div></div><div style={{ fontFamily: "Georgia,serif", fontSize: "2.2rem", fontWeight: 900, color: C.orange, minWidth: 42, textAlign: "center" }}>{qty}</div><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><input type="number" min="1" max={qty} placeholder="qty" value={mi[id] || ""} onChange={e => setMi(p => ({ ...p, [id]: e.target.value }))} style={{ width: 60, padding: "5px 8px", border: `1.5px solid ${C.soft}`, borderRadius: 6, fontSize: "0.9rem", textAlign: "center", background: "white" }} /><div style={{ fontSize: "0.65rem", color: "#aaa" }}>made</div></div><button onClick={() => markMade(id)} style={btn(C.green, "white", { padding: "7px 13px", fontSize: "0.78rem" })}>Made ✓</button></div>; })}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><button onClick={() => setConfirm({ title: "🗑 Clear Make List", msg: "Clear the make list?", confirmColor: C.red, onConfirm: () => { upd(s => { s.makeList = {}; return s; }); toast2("Make list cleared"); } })} style={{ padding: "6px 14px", background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 7, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: .7 }}>🗑 Clear Make List</button></div>
            </div>
          </div>
        </div>}

        {/* ── STOCK ── */}
        {screen === "stock" && <div style={card()}>
          <div style={ph}><span>📦</span> Stock Inventory</div>
          <div style={{ padding: "16px 18px", ...col({ gap: 14 }) }}>
            {CATS.map(({ cat, icon, label }) => <div key={cat}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", color: C.brown, fontWeight: 700, borderBottom: `2px solid ${C.soft}`, paddingBottom: 6, marginBottom: 10, letterSpacing: 1 }}>{icon} {label}</div>
              <div style={g2}>{ITEMS.filter(i => i.cat === cat).map(it => { const qty = st.stock[it.id] || 0; return <div key={it.id} style={{ background: C.cream, border: `1.5px solid ${C.soft}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{it.name}</div>
                {it.desc && <div style={{ fontSize: "0.7rem", color: "#bbb", marginBottom: 6 }}>{it.desc}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><button style={qb} onClick={() => adjStock(it.id, -1)}>−</button><span style={{ fontFamily: "Georgia,serif", fontSize: "1.5rem", fontWeight: 900, minWidth: 34, textAlign: "center", color: qty < 0 ? C.red : qty === 0 ? C.red : qty <= 3 ? C.orange : C.brown }}>{qty}</span><button style={qb} onClick={() => adjStock(it.id, 1)}>+</button></div>
                <div style={{ display: "flex", gap: 6 }}><input type="number" min="0" placeholder="set" value={sInp[it.id] || ""} onChange={e => setSInp(p => ({ ...p, [it.id]: e.target.value }))} style={{ width: 65, padding: "5px 8px", border: `1.5px solid ${C.soft}`, borderRadius: 6, fontSize: "0.88rem", textAlign: "center", background: "white" }} /><button onClick={() => setStock(it.id)} style={btn(C.gold, "white", { padding: "5px 12px", fontSize: "0.78rem" })}>Set</button></div>
              </div>; })}</div>
            </div>)}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><button onClick={() => setConfirm({ title: "🗑 Reset Inventory", msg: "Reset all stock to zero?", confirmColor: C.red, onConfirm: () => { upd(s => { ITEMS.forEach(it => s.stock[it.id] = 0); return s; }); toast2("Inventory reset"); } })} style={{ padding: "6px 14px", background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 7, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: .7 }}>🗑 Reset Inventory</button></div>
          </div>
        </div>}

        {/* ── REPORT ── */}
        {screen === "report" && <div style={card()}>
          <div style={ph}><span>📊</span> Weekly Report</div>
          <div style={{ padding: "16px 18px", ...col({ gap: 16 }) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", color: C.brown, fontWeight: 700 }}>Week of {weekLabel(vw)}</div>
              <div style={row({ gap: 6 })}>
                <button onClick={() => { const d = new Date(vw + "T00:00:00"); d.setDate(d.getDate() - 7); setVw(getWeekKey(d)); }} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${C.gold}`, background: "white", color: C.gold, fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>‹</button>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: C.brown, minWidth: 80, textAlign: "center" }}>{Math.round((new Date(vw) - new Date(getWeekKey())) / (7 * 86400000)) === 0 ? "This Week" : Math.round((new Date(vw) - new Date(getWeekKey())) / (7 * 86400000)) < 0 ? `${Math.abs(Math.round((new Date(vw) - new Date(getWeekKey())) / (7 * 86400000)))}w ago` : `${Math.round((new Date(vw) - new Date(getWeekKey())) / (7 * 86400000))}w ahead`}</span>
                <button onClick={() => { const d = new Date(vw + "T00:00:00"); d.setDate(d.getDate() + 7); setVw(getWeekKey(d)); }} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${C.gold}`, background: "white", color: C.gold, fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>›</button>
              </div>
            </div>
            {CATS.map(({ cat, icon, label }) => <div key={cat}><div style={{ fontFamily: "Georgia,serif", fontSize: "0.85rem", color: C.brown, fontWeight: 700, borderBottom: `1px solid ${C.soft}`, paddingBottom: 5, marginBottom: 10, letterSpacing: 1 }}>{icon} {label}</div><div style={g2}>{ITEMS.filter(i => i.cat === cat).map(it => <div key={it.id} style={{ background: C.cream, border: `1.5px solid ${C.soft}`, borderRadius: 10, padding: "13px 15px" }}><div style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>{it.name}</div>{it.desc && <div style={{ fontSize: "0.7rem", color: "#bbb", marginBottom: 2 }}>{it.desc}</div>}<div style={{ fontFamily: "Georgia,serif", fontSize: "1.8rem", fontWeight: 900, color: C.gold }}>{wd.sold?.[it.id] || 0}</div><div style={{ fontSize: "0.75rem", color: "#888" }}>sold this week</div></div>)}</div></div>)}
            <div style={{ background: C.warm, border: `1.5px solid ${C.soft}`, borderRadius: 10, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: "0.88rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>💰 Weekly Revenue</span><span style={{ fontFamily: "Georgia,serif", fontSize: "1.5rem", fontWeight: 900, color: C.green }}>${rev.toFixed(2)}</span></div>
            {ct > 0 && <div style={{ background: "linear-gradient(135deg,#f3eeff 0%,#ede0ff 100%)", border: "2px solid #c4a8e8", borderRadius: 12, padding: "16px 18px", ...col({ gap: 12 }) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div><div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: "0.95rem", color: C.charity, letterSpacing: 1 }}>🕊 Charity Fund — 10% of Sales</div>{co > 0 && <div style={{ fontSize: "0.72rem", color: C.charity, fontWeight: 700, marginTop: 3 }}>Includes ${co.toFixed(2)} carried from last week</div>}</div>
                <div style={{ fontFamily: "Georgia,serif", fontSize: "1.7rem", fontWeight: 900, color: C.charity }}>${ct.toFixed(2)}</div>
              </div>
              {cow <= 0 ? <div style={{ background: "#e8f8ef", border: "1.5px solid #a8d5b5", borderRadius: 10, padding: "13px 15px", textAlign: "center", fontFamily: "Georgia,serif", fontSize: "1rem", color: C.green, letterSpacing: 1 }}>✓ Charity fully paid for this week</div> : <>
                <div style={g2}>
                  <div style={{ background: "#e8f8ef", border: "1.5px solid #a8d5b5", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontWeight: 700, fontSize: "0.75rem", color: C.green, textTransform: "uppercase", letterSpacing: 1 }}>✓ Donated</div><div style={{ fontFamily: "Georgia,serif", fontSize: "1.4rem", fontWeight: 900, color: C.green }}>${cd.toFixed(2)}</div></div>
                  <div style={{ background: "#fef0f0", border: "1.5px solid #f5b8b8", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontWeight: 700, fontSize: "0.75rem", color: C.red, textTransform: "uppercase", letterSpacing: 1 }}>⏳ Still Owed</div><div style={{ fontFamily: "Georgia,serif", fontSize: "1.4rem", fontWeight: 900, color: C.red }}>${cow.toFixed(2)}</div></div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ fontWeight: 700, fontSize: "0.78rem", color: C.charity, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>Log $</label>
                  <input type="number" min="0" step="0.01" placeholder="0.00" value={don} onChange={e => setDon(e.target.value)} style={{ flex: 1, padding: "7px 11px", border: "1.5px solid #c4a8e8", borderRadius: 7, fontSize: "0.95rem", background: "white", maxWidth: 100, textAlign: "right" }} />
                  <button onClick={logDon} style={btn(C.charity, "white", { padding: "8px 14px", fontSize: "0.78rem" })}>Record ✓</button>
                  <button onClick={() => setConfirm({ title: "🗑 Clear Charity", msg: "Reset donated amount?", confirmColor: C.red, onConfirm: () => { upd(s => { if (s.weeklyData[vw]) s.weeklyData[vw].charityDonated = 0; return s; }); toast2("Charity cleared"); } })} style={{ padding: "6px 11px", background: "transparent", color: C.red, border: `1.5px solid ${C.red}`, borderRadius: 7, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", opacity: .7 }}>🗑</button>
                </div>
              </>}
            </div>}
          </div>
        </div>}

      </div>

      {/* Bottom Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.brown, borderTop: `3px solid ${C.gold}`, display: "flex", zIndex: 200 }}>
        {[{ id: "order", icon: "🛒", label: "Order", b: 0 }, { id: "orders", icon: "📋", label: "Orders", b: unpaid.length }, { id: "bake", icon: "🔥", label: "Bake", b: mke.length }, { id: "stock", icon: "📦", label: "Stock", b: 0 }, { id: "report", icon: "📊", label: "Report", b: 0 }].map(t => <button key={t.id} onClick={() => setScreen(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 2px 7px", background: "none", border: "none", cursor: "pointer", color: screen === t.id ? C.gold : "rgba(232,213,176,.5)", position: "relative", gap: 2, borderTop: screen === t.id ? `2px solid ${C.gold}` : "2px solid transparent" }}>
          <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{t.icon}</span>
          <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: .5, textTransform: "uppercase" }}>{t.label}</span>
          {t.b > 0 && <span style={{ position: "absolute", top: 4, right: "calc(50% - 20px)", background: C.red, color: "white", fontSize: "0.52rem", fontWeight: 900, padding: "1px 5px", borderRadius: 20, minWidth: 15, textAlign: "center" }}>{t.b}</span>}
        </button>)}
      </nav>

      {/* Edit Modal */}
      {editOrd && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "white", borderRadius: 14, padding: "22px 20px", maxWidth: 500, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,.3)", borderTop: `5px solid ${C.gold}`, maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ fontFamily: "Georgia,serif", color: C.brown, fontSize: "1.15rem", marginBottom: 14 }}>✏️ Edit Order</div>
          <div style={{ marginBottom: 12 }}><label style={{ fontWeight: 700, fontSize: "0.78rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1 }}>Customer Name</label><input value={editOrd.customer} onChange={e => setEditOrd({ ...editOrd, customer: e.target.value })} style={inp({ marginTop: 5 })} /></div>
          {CATS.map(({ cat, icon, label }) => <div key={cat}><div style={{ fontFamily: "Georgia,serif", fontSize: "0.9rem", color: C.brown, fontWeight: 700, borderBottom: `2px solid ${C.soft}`, paddingBottom: 5, margin: "12px 0 8px", letterSpacing: 1 }}>{icon} {label}</div><div style={g2}>{ITEMS.filter(i => i.cat === cat).map(it => <div key={it.id} style={{ background: C.cream, border: `1.5px solid ${C.soft}`, borderRadius: 9, padding: "10px 12px" }}><div style={{ fontWeight: 700, fontSize: "0.78rem", color: C.brown, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{it.name}</div>{it.desc && <div style={{ fontSize: "0.68rem", color: "#bbb", marginBottom: 4 }}>{it.desc}</div>}<QC value={eq[it.id] || 0} onChange={v => setEq(p => ({ ...p, [it.id]: Math.max(0, v) }))} /></div>)}</div></div>)}
          {!eex && <div style={{ background: C.warm, borderRadius: 9, padding: "12px 14px", margin: "12px 0", border: `1.5px solid ${C.soft}`, ...col({ gap: 9 }) }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: "0.82rem", color: C.brown, textTransform: "uppercase" }}>Total</span><span style={{ fontFamily: "Georgia,serif", fontSize: "1.3rem", fontWeight: 900, color: C.gold }}>${ITEMS.reduce((s, it) => s + (eq[it.id] || 0) * it.price, 0).toFixed(2)}</span></div>
            <div style={row()}><label style={{ fontWeight: 700, fontSize: "0.78rem", color: C.brown, textTransform: "uppercase", whiteSpace: "nowrap" }}>Paid</label><input type="number" min="0" step="0.01" value={ep} onChange={e => { setEp(e.target.value); setEpf(false); }} style={inp({ textAlign: "right", flex: 1 })} /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={epf} onChange={e => { setEpf(e.target.checked); if (e.target.checked) setEp(ITEMS.reduce((s, it) => s + (eq[it.id] || 0) * it.price, 0).toFixed(2)); }} style={{ width: 18, height: 18, accentColor: C.green }} /><span style={{ fontWeight: 700, fontSize: "0.82rem", color: C.green, textTransform: "uppercase" }}>Paid in Full</span></label>
          </div>}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}><input type="checkbox" checked={eex} onChange={e => { setEex(e.target.checked); if (e.target.checked) { setEp("0"); setEpf(false); } }} style={{ width: 18, height: 18, accentColor: C.charity }} /><span style={{ fontWeight: 700, fontSize: "0.82rem", color: C.charity, textTransform: "uppercase" }}>Exempt</span></label>
          <div style={row()}><button onClick={() => setEditOrd(null)} style={btn(C.soft, C.brown, { flex: 1, padding: 11 })}>Cancel</button><button onClick={saveEdit} style={btn(C.brown, C.cream, { flex: 2, padding: 11 })}>Save Changes</button></div>
        </div>
      </div>}

      {confirm && <Modal {...confirm} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.onConfirm(); setConfirm(null); }} />}
      <Toast {...toast} />
    </div>
  );
}
