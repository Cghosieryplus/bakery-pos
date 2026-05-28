import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = {
  brown:"#5c3d1e", gold:"#c9933a", cream:"#fdf6ec", warm:"#f5e6c8",
  soft:"#e8d5b0", dark:"#2b1a0e", red:"#c0392b", green:"#1e7e4a",
};

const btn = (bg, color, x={}) => ({ padding:"11px 18px", background:bg, color, border:"none", borderRadius:9, fontWeight:700, fontSize:"0.9rem", cursor:"pointer", ...x });
const inp = (x={}) => ({ padding:"11px 13px", border:`1.5px solid ${C.soft}`, borderRadius:9, fontSize:"1rem", background:"white", color:C.dark, width:"100%", boxSizing:"border-box", fontFamily:"inherit", ...x });

function QC({ value, onChange }) {
  const qb = { width:34, height:34, borderRadius:"50%", border:`1.5px solid ${C.gold}`, background:"white", color:C.gold, fontSize:"1.2rem", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <button style={qb} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <span style={{ fontFamily:"Georgia,serif", fontSize:"1.4rem", fontWeight:900, minWidth:28, textAlign:"center", color:C.brown }}>{value}</span>
      <button style={qb} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export default function Order() {
  const [menuItems, setMenuItems] = useState([]);
  const [qtys, setQtys]           = useState({});
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [note, setNote]           = useState("");
  const [screen, setScreen]       = useState("menu"); // menu | review | done
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imgUrls, setImgUrls]     = useState({});

  useEffect(() => {
    supabase.from("menu_items").select("*").eq("hidden", false).order("sort_order").then(({ data }) => {
      if (data) {
        setMenuItems(data);
        const q = {};
        data.forEach(it => { q[it.id] = 0; });
        setQtys(q);
        // build signed URLs for images
        data.forEach(async it => {
          if (it.image_path) {
            const { data: url } = supabase.storage.from("item-images").getPublicUrl(it.image_path);
            if (url) setImgUrls(p => ({ ...p, [it.id]: url.publicUrl }));
          }
        });
      }
      setLoading(false);
    });
  }, []);

  const cats = [...new Set(menuItems.map(i => i.category))];
  const total = menuItems.reduce((s, it) => s + (qtys[it.id] || 0) * parseFloat(it.price), 0);
  const cartCount = Object.values(qtys).reduce((s, v) => s + v, 0);
  const cartItems = menuItems.filter(it => (qtys[it.id] || 0) > 0);

  const submit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    // Load current app state from Supabase
    const { data: stateRow } = await supabase.from("app_state").select("data").eq("id", "bakery_main").single();
    const s = stateRow?.data || {};
    const orders = s.orders || [];
    const stock  = s.stock  || {};
    const makeList = s.makeList || {};
    const weeklyData = s.weeklyData || {};
    const wk = s.currentWeekKey || new Date().toISOString().split("T")[0];

    // build items map using menu item id
    const items = {};
    menuItems.forEach(it => { if (qtys[it.id]) items[it.id] = qtys[it.id]; });

    // update stock / make list
    menuItems.forEach(it => {
      const want = qtys[it.id] || 0; if (!want) return;
      const cur = stock[it.id] || 0;
      const after = cur - want;
      if (after < 0) { makeList[it.id] = (makeList[it.id] || 0) + Math.abs(after); stock[it.id] = -makeList[it.id]; }
      else { stock[it.id] = after; }
    });

    // build order — online orders are unpaid by default (pay on pickup)
    const order = {
      id: Date.now().toString(),
      customer: name.trim() + (phone.trim() ? ` (${phone.trim()})` : ""),
      items, total,
      paid: 0, paidFull: false, exempt: false, pickedUp: false,
      note: note.trim() || "",
      online: true,
      ts: new Date().toISOString(),
    };

    // update weekly sold counts
    if (!weeklyData[wk]) weeklyData[wk] = { sold: {}, revenue: 0, charityDonated: 0 };
    menuItems.forEach(it => {
      weeklyData[wk].sold[it.id] = (weeklyData[wk].sold[it.id] || 0) + (qtys[it.id] || 0);
    });

    const newState = { ...s, orders: [order, ...orders], stock, makeList, weeklyData };
    await supabase.from("app_state").upsert({ id: "bakery_main", data: newState, updated_at: new Date().toISOString() });
    setSubmitting(false);
    setScreen("done");
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:"Georgia,serif", color:C.brown, fontSize:"1.2rem" }}>Loading menu...</div>
    </div>
  );

  if (screen === "done") return (
    <div style={{ minHeight:"100vh", background:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:16, padding:"36px 28px", maxWidth:420, width:"100%", textAlign:"center", border:`1px solid ${C.soft}` }}>
        <div style={{ fontSize:"3rem", marginBottom:12 }}>🎉</div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.5rem", color:C.brown, marginBottom:8 }}>Order placed!</div>
        <div style={{ color:"#666", fontSize:"0.95rem", lineHeight:1.6, marginBottom:24 }}>
          Thanks {name}! Your order is confirmed. We'll have it ready for pickup. Your total of <strong style={{ color:C.brown }}>${total.toFixed(2)}</strong> is due at pickup.
        </div>
        <div style={{ background:C.warm, borderRadius:10, padding:"14px 16px", marginBottom:20, textAlign:"left" }}>
          {cartItems.map(it => (
            <div key={it.id} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.9rem", color:C.dark, padding:"3px 0" }}>
              <span>{qtys[it.id]}× {it.name}</span>
              <span style={{ color:C.gold }}>${(qtys[it.id] * parseFloat(it.price)).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setScreen("menu"); setQtys(Object.fromEntries(menuItems.map(i => [i.id, 0]))); setName(""); setPhone(""); setNote(""); }} style={btn(C.brown, C.cream, { width:"100%" })}>Place Another Order</button>
      </div>
    </div>
  );

  if (screen === "review") return (
    <div style={{ minHeight:"100vh", background:C.cream, paddingBottom:100 }}>
      <div style={{ background:C.brown, padding:"16px 20px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => setScreen("menu")} style={{ background:"none", border:"none", color:C.gold, fontSize:"1.4rem", cursor:"pointer", padding:0 }}>←</button>
        <div>
          <div style={{ fontFamily:"Georgia,serif", color:C.gold, fontSize:"1.2rem" }}>Review Order</div>
          <div style={{ color:"rgba(232,213,176,.7)", fontSize:"0.75rem" }}>Confirm your details</div>
        </div>
      </div>
      <div style={{ padding:"20px 18px", display:"flex", flexDirection:"column", gap:14, maxWidth:520, margin:"0 auto" }}>
        <div style={{ background:"white", borderRadius:12, padding:"16px 18px", border:`1px solid ${C.soft}` }}>
          <div style={{ fontFamily:"Georgia,serif", color:C.brown, fontSize:"1rem", marginBottom:12 }}>Your items</div>
          {cartItems.map(it => (
            <div key={it.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.soft}` }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"0.88rem", color:C.dark }}>{it.name}</div>
                {it.description && <div style={{ fontSize:"0.75rem", color:"#aaa" }}>{it.description}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:"0.82rem", color:"#aaa" }}>×{qtys[it.id]}</span>
                <span style={{ fontFamily:"Georgia,serif", fontWeight:700, color:C.gold }}>${(qtys[it.id] * parseFloat(it.price)).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, paddingTop:6 }}>
            <span style={{ fontWeight:700, color:C.brown }}>Total due at pickup</span>
            <span style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", fontWeight:900, color:C.gold }}>${total.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ background:"white", borderRadius:12, padding:"16px 18px", border:`1px solid ${C.soft}`, display:"flex", flexDirection:"column", gap:11 }}>
          <div style={{ fontFamily:"Georgia,serif", color:C.brown, fontSize:"1rem", marginBottom:4 }}>Your details</div>
          <div>
            <label style={{ fontWeight:700, fontSize:"0.78rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inp({ marginTop:5 })} />
          </div>
          <div>
            <label style={{ fontWeight:700, fontSize:"0.78rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" type="tel" style={inp({ marginTop:5 })} />
          </div>
          <div>
            <label style={{ fontWeight:700, fontSize:"0.78rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any special requests?" rows={3} style={inp({ marginTop:5, resize:"vertical" })} />
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!name.trim() || submitting}
          style={btn(name.trim() ? C.brown : "#ccc", "white", { width:"100%", padding:14, fontSize:"1rem", opacity: submitting ? 0.7 : 1 })}
        >
          {submitting ? "Placing order..." : `Confirm Order · $${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );

  // Menu screen
  return (
    <div style={{ minHeight:"100vh", background:C.cream, paddingBottom:90 }}>
      <div style={{ background:C.brown, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"Georgia,serif", color:C.gold, fontSize:"1.3rem" }}>🥐 Crumb & Culture</div>
          <div style={{ color:"rgba(232,213,176,.7)", fontSize:"0.75rem" }}>Weekly pre-order · Pay at pickup</div>
        </div>
        {cartCount > 0 && (
          <div style={{ background:C.gold, color:"white", borderRadius:20, padding:"4px 12px", fontSize:"0.82rem", fontWeight:700 }}>
            {cartCount} item{cartCount !== 1 ? "s" : ""} · ${total.toFixed(2)}
          </div>
        )}
      </div>

      <div style={{ padding:"16px 16px", maxWidth:560, margin:"0 auto", display:"flex", flexDirection:"column", gap:20 }}>
        {cats.map(cat => {
          const catItems = menuItems.filter(it => it.category === cat);
          return (
            <div key={cat}>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"0.9rem", color:C.brown, fontWeight:700, borderBottom:`1.5px solid ${C.soft}`, paddingBottom:6, marginBottom:12, letterSpacing:1 }}>
                {cat}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {catItems.map(it => (
                  <div key={it.id} style={{ background:"white", borderRadius:12, border:`1px solid ${C.soft}`, overflow:"hidden", display:"flex", gap:0 }}>
                    {imgUrls[it.id] ? (
                      <img src={imgUrls[it.id]} alt={it.name} style={{ width:100, height:100, objectFit:"cover", flexShrink:0 }} />
                    ) : (
                      <div style={{ width:100, height:100, background:C.warm, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>🍞</div>
                    )}
                    <div style={{ flex:1, padding:"12px 14px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.dark, textTransform:"uppercase", letterSpacing:0.5 }}>{it.name}</div>
                        {it.description && <div style={{ fontSize:"0.75rem", color:"#aaa", marginTop:2 }}>{it.description}</div>}
                        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.05rem", fontWeight:700, color:C.gold, marginTop:4 }}>${parseFloat(it.price).toFixed(2)}</div>
                      </div>
                      <QC value={qtys[it.id] || 0} onChange={v => setQtys(p => ({ ...p, [it.id]: v }))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"14px 18px", background:C.brown, borderTop:`2px solid ${C.gold}` }}>
          <button onClick={() => setScreen("review")} style={btn(C.gold, C.dark, { width:"100%", padding:14, fontSize:"1rem" })}>
            Review Order · {cartCount} item{cartCount !== 1 ? "s" : ""} · ${total.toFixed(2)} →
          </button>
        </div>
      )}
    </div>
  );
}
