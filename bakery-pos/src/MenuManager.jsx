import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const C = { brown:"#5c3d1e", gold:"#c9933a", cream:"#fdf6ec", warm:"#f5e6c8", soft:"#e8d5b0", dark:"#2b1a0e", red:"#c0392b", green:"#1e7e4a" };
const inp = (x={}) => ({ padding:"9px 13px", border:`1.5px solid ${C.soft}`, borderRadius:8, fontSize:"0.95rem", background:C.cream, color:C.dark, width:"100%", boxSizing:"border-box", fontFamily:"inherit", ...x });
const btn = (bg, color, x={}) => ({ padding:"9px 16px", background:bg, color, border:"none", borderRadius:8, fontWeight:700, fontSize:"0.82rem", cursor:"pointer", letterSpacing:1, ...x });

const EMPTY = { name:"", category:"Big Challah", price:"", description:"", hidden:false, image_path:"", sort_order:0 };

export default function MenuManager() {
  const [items, setItems]     = useState([]);
  const [editing, setEditing] = useState(null); // null | "new" | item object
  const [form, setForm]       = useState(EMPTY);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState("");
  const [imgUrls, setImgUrls] = useState({});

  const load = async () => {
    const { data } = await supabase.from("menu_items").select("*").order("sort_order");
    if (data) {
      setItems(data);
      data.forEach(async it => {
        if (it.image_path) {
          const { data: u } = supabase.storage.from("item-images").getPublicUrl(it.image_path);
          if (u) setImgUrls(p => ({ ...p, [it.id]: u.publicUrl }));
        }
      });
    }
  };

  useEffect(() => { load(); }, []);

  const toast2 = msg => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const openNew = () => { setForm(EMPTY); setImgFile(null); setImgPreview(""); setEditing("new"); };
  const openEdit = it => { setForm({ name:it.name, category:it.category, price:String(it.price), description:it.description||"", hidden:it.hidden||false, image_path:it.image_path||"", sort_order:it.sort_order||0 }); setImgFile(null); setImgPreview(imgUrls[it.id]||""); setEditing(it); };

  const handleImg = e => {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) { toast2("Name and price required"); return; }
    setSaving(true);
    let image_path = form.image_path;

    if (imgFile) {
      const ext = imgFile.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-images").upload(path, imgFile, { upsert: true });
      if (!upErr) image_path = path;
    }

    const payload = { name: form.name.trim(), category: form.category, price: parseFloat(form.price), description: form.description.trim(), hidden: form.hidden, image_path, sort_order: parseInt(form.sort_order) || 0 };

    if (editing === "new") {
      await supabase.from("menu_items").insert(payload);
      toast2("Item added ✓");
    } else {
      await supabase.from("menu_items").update(payload).eq("id", editing.id);
      toast2("Item updated ✓");
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const toggleHide = async it => {
    await supabase.from("menu_items").update({ hidden: !it.hidden }).eq("id", it.id);
    load();
  };

  const del = async it => {
    if (!window.confirm(`Delete "${it.name}"? This cannot be undone.`)) return;
    await supabase.from("menu_items").delete().eq("id", it.id);
    toast2("Item deleted");
    load();
  };

  const cats = [...new Set(items.map(i => i.category))];

  return (
    <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:16 }}>
      {toast && <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", background:C.brown, color:"white", padding:"10px 22px", borderRadius:40, fontWeight:700, fontSize:"0.85rem", zIndex:999, border:`2px solid ${C.gold}` }}>{toast}</div>}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", color:C.brown, fontSize:"1rem" }}>Menu Items</div>
        <button onClick={openNew} style={btn(C.brown, C.cream)}>+ Add Item</button>
      </div>

      {cats.map(cat => (
        <div key={cat}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:"0.85rem", color:C.brown, fontWeight:700, borderBottom:`1px solid ${C.soft}`, paddingBottom:5, marginBottom:10, letterSpacing:1 }}>{cat}</div>
          {items.filter(it => it.category === cat).map(it => (
            <div key={it.id} style={{ background: it.hidden ? "#f9f9f9" : "white", border:`1.5px solid ${C.soft}`, borderRadius:10, padding:"11px 13px", marginBottom:8, display:"flex", alignItems:"center", gap:12, opacity: it.hidden ? 0.55 : 1 }}>
              {imgUrls[it.id] ? <img src={imgUrls[it.id]} alt={it.name} style={{ width:50, height:50, objectFit:"cover", borderRadius:7, flexShrink:0 }} /> : <div style={{ width:50, height:50, background:C.warm, borderRadius:7, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>🍞</div>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:"0.88rem", color:C.dark }}>{it.name} {it.hidden && <span style={{ fontSize:"0.7rem", color:C.red, fontWeight:700 }}>HIDDEN</span>}</div>
                {it.description && <div style={{ fontSize:"0.72rem", color:"#aaa" }}>{it.description}</div>}
                <div style={{ fontFamily:"Georgia,serif", fontSize:"0.95rem", color:C.gold, fontWeight:700 }}>${parseFloat(it.price).toFixed(2)}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
                <button onClick={() => openEdit(it)} style={btn(C.warm, C.brown, { padding:"5px 10px", fontSize:"0.72rem" })}>Edit</button>
                <button onClick={() => toggleHide(it)} style={btn(it.hidden ? C.green : "#eee", it.hidden ? "white" : C.brown, { padding:"5px 10px", fontSize:"0.72rem" })}>{it.hidden ? "Show" : "Hide"}</button>
                <button onClick={() => del(it)} style={btn("transparent", C.red, { padding:"5px 10px", fontSize:"0.72rem", border:`1px solid ${C.red}` })}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"white", borderRadius:14, padding:"22px 20px", maxWidth:460, width:"100%", boxShadow:"0 12px 40px rgba(0,0,0,.3)", borderTop:`5px solid ${C.gold}`, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ fontFamily:"Georgia,serif", color:C.brown, fontSize:"1.1rem", marginBottom:16 }}>{editing === "new" ? "Add New Item" : `Edit: ${editing.name}`}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              <div>
                <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Item Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} style={inp({ marginTop:5 })} />
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Category</label>
                <input value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))} placeholder="e.g. Big Challah, Sides" style={inp({ marginTop:5 })} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Price *</label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({...p, price:e.target.value}))} style={inp({ marginTop:5 })} />
                </div>
                <div>
                  <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Sort Order</label>
                  <input type="number" min="0" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order:e.target.value}))} style={inp({ marginTop:5 })} />
                </div>
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Description</label>
                <input value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} placeholder="e.g. ½ lb" style={inp({ marginTop:5 })} />
              </div>
              <div>
                <label style={{ fontWeight:700, fontSize:"0.75rem", color:C.brown, textTransform:"uppercase", letterSpacing:1 }}>Item Image</label>
                <input type="file" accept="image/*" onChange={handleImg} style={{ marginTop:6, fontSize:"0.85rem" }} />
                {imgPreview && <img src={imgPreview} alt="preview" style={{ marginTop:8, width:120, height:90, objectFit:"cover", borderRadius:8, border:`1px solid ${C.soft}` }} />}
              </div>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <input type="checkbox" checked={form.hidden} onChange={e => setForm(p => ({...p, hidden:e.target.checked}))} style={{ width:17, height:17 }} />
                <span style={{ fontWeight:700, fontSize:"0.82rem", color:C.red }}>Hide from storefront</span>
              </label>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={() => setEditing(null)} style={btn("#eee", C.brown, { flex:1 })}>Cancel</button>
              <button onClick={save} disabled={saving} style={btn(C.brown, C.cream, { flex:2, opacity: saving ? 0.7 : 1 })}>{saving ? "Saving..." : "Save Item"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
