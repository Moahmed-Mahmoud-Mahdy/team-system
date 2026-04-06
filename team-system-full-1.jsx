
import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { db } from "./src/firebase";
import { collection, getDocs, setDoc, doc, query, orderBy, addDoc, deleteDoc } from "firebase/firestore";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FONTS & GLOBAL STYLES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GF = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{overflow-x:hidden;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#04090f;}
::-webkit-scrollbar-thumb{background:#1a3050;border-radius:3px;}
input[type=range]{-webkit-appearance:none;height:6px;border-radius:3px;background:#1a3050;outline:none;width:100%;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00c9f7;cursor:pointer;box-shadow:0 0 8px #00c9f770;}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4);}
input[type=number]::-webkit-inner-spin-button{opacity:0.4;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.fade-in{animation:fadeIn .25s ease}
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS & MEMBER DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const RL = { team_leader:"قائد الفريق", builder:"Builder", sales:"Sales", content:"Content", operation:"Operation" };
const RC = { team_leader:"#00c9f7", builder:"#06b6d4", sales:"#f97316", content:"#a855f7", operation:"#22c55e" };

const MEMBERS = [
  { id:"amr",   name:"Amr Sherif",           phone:"01113801276", role:"team_leader", hours:"5-10",  isAdmin:true },
  { id:"asmaa",  name:"Asmaa Said",           phone:"01019203325", role:"content",     hours:"5-10" },
  { id:"hassan",  name:"Hassan Wael",          phone:"01000765342", role:"builder",     hours:"10-15" },
  { id:"mahdy",   name:"Damn it's Mahdy",         phone:"01101891846", role:"builder",     hours:"5-10",  isSubLeader:true, subTeams:["builder"] },
  { id:"elsayed", name:"Mohamed Elsayed",       phone:"01508783863", role:"builder",     hours:"5-10" },
  { id:"hussein", name:"Hussein Afifi",         phone:"01113023088", role:"sales",       hours:"5-10" },
  { id:"mahmoud", name:"Mahmoud Medhat",        phone:"01014127767", role:"sales",       hours:"10-15", isSubLeader:true, subTeams:["sales","content"] },
  { id:"manar_a", name:"Manar Ahmed",           phone:"01121267772", role:"content",     hours:"5-10" },
  { id:"aya",     name:"Aya Elshenawy",         phone:"01223533000", role:"content",     hours:"5-10" },
  { id:"jana",    name:"Jana Ahmed",            phone:"01288892193", role:"content",     hours:"5-10" },
  { id:"mohand",  name:"Mohand Said",           phone:"01507778247", role:"content",     hours:"5-10" },
  { id:"mona",    name:"Mona Ahmad",            phone:"01099287237", role:"operation",   hours:"5-10",  isAdmin:true },
];

const AV = { amr:"AS", asmaa:"AS", hassan:"HW", mahdy:"MM", elsayed:"ME", hussein:"HA", mahmoud:"MD", manar_a:"MA", aya:"AY", jana:"JA", mohand:"MH", mona:"MO" };
const CLR = { amr:"#00c9f7", asmaa:"#a855f7", hassan:"#0ea5e9", mahdy:"#06b6d4", elsayed:"#38bdf8", hussein:"#f97316", mahmoud:"#ea580c", manar_a:"#a855f7", aya:"#9333ea", jana:"#7c3aed", mohand:"#6d28d9", mona:"#22c55e" };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SK = { session: "tcc6-sess" };

// Session remains in localStorage for convenience
const saveSession = (user) => localStorage.setItem(SK.session, JSON.stringify(user));
const loadSession = () => {
  const s = localStorage.getItem(SK.session);
  return s ? JSON.parse(s) : null;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TODAY = new Date().toISOString().split("T")[0];
const DOW   = new Date().getDay(); // 0=Sun 4=Thu 5=Fri
const uid   = () => Math.random().toString(36).slice(2, 9);

const addDays = (dateStr, n) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const weekStart = (() => {
  const d = new Date(TODAY); d.setDate(d.getDate() - 6);
  return d.toISOString().split("T")[0];
})();

const calcPts = (log) => {
  let rev  = (log.revenue  || 0) * 1;
  let lead = (log.leads    || 0) * 5;
  let cont = (log.posts    || 0) * 2 + (log.videos || 0) * 5;
  let build = (log.buildDemos || 0) * 50 + (log.buildTemplates || 0) * 10;
  if (log.tasksDesc && log.tasksDesc.trim().length > 0) build += 3;

  if (log.doublePoints) rev *= 2;
  return {
    rev, lead, cont, build,
    total: Math.round(rev * 0.7 + lead * 0.2 + cont * 0.1 + build),
  };
};

const memberPts = (memberId, logs, range = "week") => {
  const cut = range === "week" ? weekStart : range === "month" ? TODAY.slice(0, 7) : "0000";
  const filtered = logs.filter(l => l.memberId === memberId && (range === "month" ? l.date.startsWith(cut) : l.date >= cut));
  return filtered.reduce((acc, l) => {
    const p = calcPts(l);
    return { rev: acc.rev + p.rev, lead: acc.lead + p.lead, cont: acc.cont + p.cont, build: (acc.build||0) + (p.build||0), total: acc.total + p.total };
  }, { rev: 0, lead: 0, cont: 0, build: 0, total: 0 });
};

const memberWeekStats = (memberId, logs) => {
  const wl = logs.filter(l => l.memberId === memberId && l.date >= weekStart);
  return {
    revenue:  wl.reduce((a, l) => a + (l.revenue  || 0), 0),
    dms:      wl.reduce((a, l) => a + (l.dms      || 0), 0),
    closings: wl.reduce((a, l) => a + (l.closings || 0), 0),
    leads:    wl.reduce((a, l) => a + (l.leads    || 0), 0),
    posts:    wl.reduce((a, l) => a + (l.posts    || 0), 0),
    videos:   wl.reduce((a, l) => a + (l.videos   || 0), 0),
    days:     wl.length,
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = { bg:"#030b15", card:"#060f1c", card2:"#09152a", border:"#142840", text:"#dce8f2", muted:"#4a6582" };

const Av = ({ id, sz = 34 }) => {
  const col = CLR[id] || "#64748b";
  return (
    <div style={{ width:sz, height:sz, borderRadius:sz*.28, background:`${col}30`, border:`1.5px solid ${col}50`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:sz*.32, fontWeight:"700", color:col, flexShrink:0, fontFamily:"'Cairo',sans-serif" }}>
      {AV[id] || "??"}
    </div>
  );
};

const Badge = ({ color, children, sm }) => (
  <span style={{ display:"inline-block", padding:sm?"1px 7px":"3px 9px", borderRadius:"6px", background:`${color}20`, color, fontSize:sm?9:10, fontWeight:"700", border:`1px solid ${color}30`, fontFamily:"'Cairo',sans-serif", whiteSpace:"nowrap" }}>
    {children}
  </span>
);

const PBar = ({ pct, color, h = 6 }) => (
  <div style={{ height:h, borderRadius:h/2, background:C.border, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, right:0, height:"100%", width:`${Math.min(100, Math.max(0, pct || 0))}%`, background:color, borderRadius:h/2, transition:"width .5s ease", boxShadow:`0 0 5px ${color}50` }} />
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:"13px", padding:"16px", ...style }}>
    {children}
  </div>
);

const ST = ({ children, color }) => (
  <div style={{ fontSize:"10px", fontWeight:"700", color:color||C.muted, marginBottom:"13px", textTransform:"uppercase", letterSpacing:"1.5px" }}>
    {children}
  </div>
);

const Inp = (props) => (
  <input style={{ background:"#030b15", border:`1px solid ${C.border}`, borderRadius:"9px", padding:"10px 12px", color:C.text, fontFamily:"'Cairo',sans-serif", fontSize:"13px", width:"100%", outline:"none", direction:"rtl" }} {...props} />
);

const TA = (props) => (
  <textarea style={{ background:"#030b15", border:`1px solid ${C.border}`, borderRadius:"9px", padding:"10px 12px", color:C.text, fontFamily:"'Cairo',sans-serif", fontSize:"13px", width:"100%", outline:"none", direction:"rtl", resize:"vertical", minHeight:"72px" }} {...props} />
);

const Btn = ({ color = "#00c9f7", outline, children, onClick, style = {} }) => (
  <button onClick={onClick} style={{ background:outline?`${color}15`:`linear-gradient(135deg,${color},${color}cc)`, border:outline?`1px solid ${color}40`:"none", borderRadius:"9px", padding:"10px 18px", color:outline?color:"#000", fontFamily:"'Cairo',sans-serif", fontWeight:"700", fontSize:"13px", cursor:"pointer", ...style }}>
    {children}
  </button>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"#000000e8", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
    <div className="fade-in" style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"22px", width:"520px", maxWidth:"100%", maxHeight:"94vh", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
        <div style={{ fontWeight:"900", fontSize:"15px" }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"20px", lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const NumField = ({ label, val, onChange, color, unit = "" }) => (
  <div>
    <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>{label}</label>
    <div style={{ position:"relative" }}>
      <input type="number" min={0} value={val} onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{ background:"#030b15", border:`1px solid ${color}40`, borderRadius:"9px", padding:"10px 12px", color, fontFamily:"'Space Mono',monospace", fontWeight:"700", fontSize:"16px", width:"100%", outline:"none", textAlign:"center" }} />
      {unit && <div style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", fontSize:"10px", color:C.muted }}>{unit}</div>}
    </div>
  </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGIN SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PASSWORD HELPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ROLE_INITIAL = { team_leader:"L", builder:"B", content:"C", sales:"S", operation:"O" };
const getPassword = (member) => {
  const initial = ROLE_INITIAL[member.role] || "X";
  const digits  = member.phone.replace(/\D/g, ""); // strip any spaces/dashes
  const last3   = digits.slice(-3);
  return initial + last3;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const Login = ({ onLogin }) => {
  const [step,     setStep]     = useState("list");
  const [sel,      setSel]      = useState(null);
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [err,      setErr]      = useState("");

  const verifyPhone = () => {
    if (phone.trim() === sel.phone) { setStep("password"); setErr(""); }
    else setErr("رقم التليفون غلط — جرب تاني!");
  };

  const verifyPassword = () => {
    if (password.trim() === getPassword(sel)) onLogin(sel);
    else setErr("كلمة السر غلط — جرب تاني!");
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", direction:"rtl", fontFamily:"'Cairo',sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:"28px" }}>
        <div style={{ width:"60px", height:"60px", background:"linear-gradient(135deg,#00c9f7,#0050d0)", borderRadius:"16px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"26px", margin:"0 auto 12px", boxShadow:"0 0 30px #00c9f750" }}>⚡</div>
        <div style={{ fontWeight:"900", fontSize:"20px", background:"linear-gradient(90deg,#00c9f7,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>مركز قيادة الفريق</div>
        <div style={{ color:C.muted, fontSize:"11px", marginTop:"4px" }}>القطاع الصحي & عيادات التجميل والليزر</div>
        <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginTop:"8px" }}>
          <Badge color="#06b6d4">Builder</Badge>
          <Badge color="#f97316">Sales</Badge>
          <Badge color="#a855f7">Content</Badge>
          <Badge color="#22c55e">Operation</Badge>
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:"440px" }}>
        {step === "list" ? (
          <Card>
            <ST>اختار اسمك من القائمة</ST>
            <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
              {MEMBERS.map(m => (
                <button key={m.id} onClick={() => { setSel(m); setStep("verify"); setPhone(""); setErr(""); }}
                  style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"10px", background:`${CLR[m.id]}0d`, border:`1px solid ${CLR[m.id]}28`, cursor:"pointer", width:"100%", textAlign:"right", transition:"all .15s" }}>
                  <Av id={m.id} sz={34} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:"700", fontSize:"13px", color:C.text }}>{m.name}</div>
                    <div style={{ fontSize:"10px", color:CLR[m.id], marginTop:"1px" }}>
                      {RL[m.role]}{m.isAdmin?" · أدمن":m.isSubLeader?" · قائد فريق":""} · ⏱ {m.hours}h/week
                    </div>
                  </div>
                  <span style={{ color:C.muted, fontSize:"12px" }}>→</span>
                </button>
              ))}
            </div>
          </Card>
        ) : step === "verify" ? (
          <Card>
            <button onClick={() => { setStep("list"); setErr(""); }} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"12px", marginBottom:"14px", display:"flex", alignItems:"center", gap:"5px" }}>
              ← رجوع للقائمة
            </button>
            <div style={{ display:"flex", gap:"10px", alignItems:"center", padding:"12px", borderRadius:"10px", background:`${CLR[sel.id]}12`, border:`1px solid ${CLR[sel.id]}30`, marginBottom:"18px" }}>
              <Av id={sel.id} sz={42} />
              <div>
                <div style={{ fontWeight:"700", fontSize:"14px" }}>{sel.name}</div>
                <div style={{ fontSize:"11px", color:CLR[sel.id] }}>{RL[sel.role]}</div>
              </div>
            </div>
            <div style={{ marginBottom:"14px" }}>
              <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"6px", fontWeight:"700" }}>١. أدخل رقم تليفونك للتأكيد</label>
              <Inp type="tel" placeholder="01xxxxxxxxx" value={phone} onChange={e => { setPhone(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && verifyPhone()} />
            </div>
            {err && (
              <div style={{ color:"#f04060", fontSize:"12px", marginBottom:"12px", padding:"8px 10px", background:"#f0406015", borderRadius:"7px", border:"1px solid #f0406028" }}>❌ {err}</div>
            )}
            <Btn color={CLR[sel.id]} onClick={verifyPhone} style={{ width:"100%", textAlign:"center" }}>التالي →</Btn>
          </Card>
        ) : (
          <Card>
            <button onClick={() => { setStep("verify"); setPassword(""); setErr(""); }} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"12px", marginBottom:"14px", display:"flex", alignItems:"center", gap:"5px" }}>
              ← رجوع
            </button>
            <div style={{ display:"flex", gap:"10px", alignItems:"center", padding:"12px", borderRadius:"10px", background:`${CLR[sel.id]}12`, border:`1px solid ${CLR[sel.id]}30`, marginBottom:"18px" }}>
              <Av id={sel.id} sz={42} />
              <div>
                <div style={{ fontWeight:"700", fontSize:"14px" }}>{sel.name}</div>
                <div style={{ fontSize:"11px", color:CLR[sel.id] }}>{RL[sel.role]}</div>
              </div>
            </div>
            <div style={{ marginBottom:"14px" }}>
              <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"6px", fontWeight:"700" }}>٢. أدخل كلمة السر</label>
              <Inp type="password" placeholder="••••" value={password} onChange={e => { setPassword(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && verifyPassword()} />
            </div>
            {err && (
              <div style={{ color:"#f04060", fontSize:"12px", marginBottom:"12px", padding:"8px 10px", background:"#f0406015", borderRadius:"7px", border:"1px solid #f0406028" }}>❌ {err}</div>
            )}
            <Btn color={CLR[sel.id]} onClick={verifyPassword} style={{ width:"100%", textAlign:"center" }}>دخول ⚡</Btn>
          </Card>
        )}
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DAILY LOG FORM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DailyLogForm = ({ user, logs, onSubmit }) => {
  const existing = logs.find(l => l.memberId === user.id && l.date === TODAY);
  const emptyF   = { didToday:"", results:"", tomorrow:"", revenue:0, dms:0, closings:0, leads:0, posts:0, videos:0, buildDemos:0, buildTemplates:0, tasksDesc:"", opUpdate:"", doublePoints:false, screenshots:false };
  const [form, setForm]       = useState(existing || emptyF);
  const [editing, setEditing] = useState(!existing);
  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const pts = calcPts(form);
  const col = CLR[user.id];
  const isSales   = user.role === "sales"   || user.extraRole === "content";
  const isContent = user.role === "content" || (user.role === "sales" && user.extraRole === "content");
  const isBuilder = user.role === "builder";
  const isOp      = user.role === "operation";
  const isThu     = DOW === 4;
  const isFri     = DOW === 5;

  const handleSave = () => {
    if (!form.didToday.trim()) return;
    const log = { ...form, id: existing?.id || uid(), memberId:user.id, date:TODAY, submittedAt:new Date().toISOString() };
    onSubmit(log);
    setEditing(false);
  };

  if (!editing && existing) {
    const p = calcPts(existing);
    return (
      <div className="fade-in">
        <div style={{ textAlign:"center", padding:"22px 16px", background:"#22c55e0e", border:"1px solid #22c55e28", borderRadius:"13px", marginBottom:"14px" }}>
          <div style={{ fontSize:"36px", marginBottom:"8px" }}>✅</div>
          <div style={{ fontWeight:"900", fontSize:"15px", color:"#22c55e" }}>سجّلت يومك النهارده!</div>
          <div style={{ color:C.muted, fontSize:"12px", marginTop:"3px" }}>{TODAY}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:"16px", marginTop:"14px", flexWrap:"wrap" }}>
            {[{l:"إيراد",v:p.rev,c:"#f97316"},{l:"Leads",v:p.lead,c:"#00c9f7"},{l:"Content",v:p.cont,c:"#a855f7"},{l:"Builder",v:p.build||0,c:"#06b6d4"},{l:"الإجمالي",v:p.total,c:"#22c55e"}].map((x,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:x.c, fontSize:"18px" }}>{x.v}</div>
                <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px" }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        <Card style={{ marginBottom:"12px" }}>
          <ST>تفاصيل تقريرك</ST>
          {[["عملت إيه؟", existing.didToday], ["النتيجة؟", existing.results], ["بكرا؟", existing.tomorrow]].map(([l,v],i) => v ? (
            <div key={i} style={{ marginBottom:"10px" }}>
              <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", marginBottom:"3px" }}>{l}</div>
              <div style={{ fontSize:"13px", lineHeight:1.6, color:C.text }}>{v}</div>
            </div>
          ) : null)}
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"8px" }}>
            {existing.revenue>0&&<Badge color="#f97316">💰 ${existing.revenue}</Badge>}
            {existing.dms>0&&<Badge color="#06b6d4">📩 {existing.dms} DM</Badge>}
            {existing.closings>0&&<Badge color="#22c55e">🤝 {existing.closings} closing</Badge>}
            {existing.leads>0&&<Badge color="#00c9f7">🎯 {existing.leads} lead</Badge>}
            {existing.posts>0&&<Badge color="#a855f7">📝 {existing.posts} post</Badge>}
            {existing.videos>0&&<Badge color="#9333ea">🎬 {existing.videos} video</Badge>}
            {existing.doublePoints&&<Badge color="#fbbf24">🃏 Double Pts</Badge>}
            {existing.screenshots&&<Badge color="#22c55e">📸 Screenshots</Badge>}
          </div>
        </Card>

        <Btn outline color={col} onClick={() => { setForm(existing); setEditing(true); }} style={{ width:"100%", textAlign:"center" }}>
          ✏️ تعديل التقرير
        </Btn>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
      {/* Alerts */}
      {isThu && (
        <div style={{ background:"#f9731612", border:"1px solid #f9731640", borderRadius:"11px", padding:"12px 14px", display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"22px" }}>💰</span>
          <div>
            <div style={{ fontWeight:"700", fontSize:"13px", color:"#f97316" }}>يوم الخميس = Sales Day! 🔥</div>
            <div style={{ fontSize:"11px", color:C.muted }}>النهارده كلنا Sales — ابعت ٥٠ DM على الأقل</div>
          </div>
        </div>
      )}
      {isFri && (
        <div style={{ background:"#00c9f712", border:"1px solid #00c9f730", borderRadius:"11px", padding:"12px 14px", display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"22px" }}>📅</span>
          <div>
            <div style={{ fontWeight:"700", fontSize:"13px", color:"#00c9f7" }}>ميتينج النهارده الساعة ٩ الصبح</div>
            <div style={{ fontSize:"11px", color:C.muted }}>Live أسبوعي مع أستاذ عبد الله</div>
          </div>
        </div>
      )}

      {/* 3 Core Questions */}
      <Card>
        <ST>📋 تقرير اليوم — {TODAY}</ST>
        <div style={{ display:"flex", flexDirection:"column", gap:"11px" }}>
          <div>
            <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>١. عملت إيه النهارده؟ *</label>
            <TA placeholder="اكتب كل حاجة عملتها بالتفصيل..." value={form.didToday} onChange={e => up("didToday", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>٢. النتيجة إيه على اللي عملته؟</label>
            <TA placeholder="إيه الأثر / النتيجة / الرد اللي جاك..." value={form.results} onChange={e => up("results", e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>٣. بكرا هتعمل إيه؟</label>
            <TA placeholder="خطة بكرا بالتفصيل..." value={form.tomorrow} onChange={e => up("tomorrow", e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Sales KPIs */}
      {(user.role === "sales" || isThu) && (
        <Card>
          <ST color="#f97316">💰 بيانات Sales</ST>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
            <NumField label="إيراد (دولار) 💵" val={form.revenue} onChange={v => up("revenue", v)} color="#f97316" unit="$" />
            <NumField label="DMs بعتها 📩" val={form.dms} onChange={v => up("dms", v)} color="#06b6d4" />
            <NumField label="Closings أتحققت 🤝" val={form.closings} onChange={v => up("closings", v)} color="#22c55e" />
            <NumField label="Leads مؤهلة 🎯" val={form.leads} onChange={v => up("leads", v)} color="#00c9f7" />
          </div>
          <div style={{ background:"#fbbf2410", border:"1px solid #fbbf2428", borderRadius:"9px", padding:"10px 12px", display:"flex", gap:"10px", alignItems:"center" }}>
            <input type="checkbox" checked={form.doublePoints} onChange={e => up("doublePoints", e.target.checked)} style={{ width:"16px", height:"16px", cursor:"pointer", accentColor:"#fbbf24" }} />
            <div>
              <div style={{ fontSize:"12px", fontWeight:"700", color:"#fbbf24" }}>🃏 Double Points Card مفعّل</div>
              <div style={{ fontSize:"10px", color:C.muted }}>لازم يتفعّل قبل البيع — النقاط هتتضاعف</div>
            </div>
          </div>
          {/* Min sale reminder */}
          <div style={{ fontSize:"10px", color:C.muted, marginTop:"8px", padding:"8px", background:"#f0406010", borderRadius:"7px" }}>
            ⚠️ أقل بيعة مقبولة = $50 · هدف الشهر للفريق = $500
          </div>
        </Card>
      )}

      {/* Content KPIs */}
      {(isContent) && (
        <Card>
          <ST color="#a855f7">📱 بيانات Content</ST>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
            <NumField label="Posts نشرتها 📝 (+2 نقطة)" val={form.posts} onChange={v => up("posts", v)} color="#a855f7" />
            <NumField label="Videos نشرتها 🎬 (+5 نقاط)" val={form.videos} onChange={v => up("videos", v)} color="#9333ea" />
          </div>
          <div style={{ fontSize:"10px", color:C.muted, padding:"8px", background:"#a855f710", borderRadius:"7px" }}>
            ⚠️ المحتوى لازم مرتبط بالمشروع (قطاع صحي / عيادات تجميل) — محتوى عشوائي = صفر نقاط
          </div>
        </Card>
      )}

      {/* Builder */}
      {isBuilder && (
        <Card>
          <ST color="#06b6d4">🔧 بيانات Builder</ST>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
            <NumField label="Demos / مشاريع 🚀 (+50)" val={form.buildDemos} onChange={v => up("buildDemos", v)} color="#06b6d4" />
            <NumField label="Templates / Auto (+10)" val={form.buildTemplates} onChange={v => up("buildTemplates", v)} color="#38bdf8" />
          </div>
          <div style={{ fontSize:"10px", color:C.muted, padding:"8px", background:"#06b6d410", borderRadius:"7px", marginBottom:"12px" }}>
            🎁 بونص ثابت: 3 نقاط بمجرد كتابة الريبورت والتفاصيل!
          </div>
          <div>
            <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>إيه اللي بنيته / طورته النهارده؟</label>
            <TA placeholder="تفاصيل الـ Demo جهزته، Template، Automation، Prompt، Sheet، Script..." value={form.tasksDesc} onChange={e => up("tasksDesc", e.target.value)} />
          </div>
        </Card>
      )}

      {/* Operation */}
      {isOp && (
        <Card>
          <ST color="#22c55e">⚙️ بيانات Operation</ST>
          <div>
            <label style={{ fontSize:"10px", color:C.muted, display:"block", marginBottom:"5px", fontWeight:"700" }}>إيه اللي اتحدث في الداشبورد / التايملاين؟</label>
            <TA placeholder="التحديثات اللي عملتها اليوم..." value={form.opUpdate} onChange={e => up("opUpdate", e.target.value)} />
          </div>
        </Card>
      )}

      {/* Thursday — everyone sends DMs */}
      {isThu && user.role !== "sales" && (
        <Card>
          <ST color="#f97316">📩 Sales Day — DMs</ST>
          <NumField label="كام DM بعتت النهارده؟ (الهدف ٥٠+)" val={form.dms} onChange={v => up("dms", v)} color="#f97316" />
        </Card>
      )}

      {/* Screenshots */}
      <Card>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <input type="checkbox" checked={form.screenshots} onChange={e => up("screenshots", e.target.checked)} style={{ width:"16px", height:"16px", cursor:"pointer", accentColor:"#22c55e" }} />
          <div>
            <div style={{ fontSize:"13px", fontWeight:"700" }}>📸 عندي Screenshots لكل حاجة</div>
            <div style={{ fontSize:"10px", color:C.muted, marginTop:"2px" }}>مفيش إثبات = مفيش نقاط (Leads / Sales / Content)</div>
          </div>
        </div>
      </Card>

      {/* Points Preview */}
      <div style={{ background:`${col}0e`, border:`1px solid ${col}25`, borderRadius:"11px", padding:"14px" }}>
        <div style={{ fontSize:"10px", color:C.muted, marginBottom:"10px", fontWeight:"700" }}>💎 نقاطك المتوقعة النهارده</div>
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
          {[{l:"إيراد (٧٠٪)", v:pts.rev, c:"#f97316"}, {l:"Leads (٢٠٪)", v:pts.lead, c:"#00c9f7"}, {l:"Content (١٠٪)", v:pts.cont, c:"#a855f7"}, {l:"Builder", v:pts.build||0, c:"#06b6d4"}, {l:"الإجمالي", v:pts.total, c:col}].map((x, i) => (
            <div key={i} style={{ flex:1, minWidth:"60px", textAlign:"center", background:`${x.c}10`, borderRadius:"8px", padding:"8px 6px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:x.c, fontSize:"16px" }}>{x.v}</div>
              <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px" }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <Btn color={col} onClick={handleSave} style={{ width:"100%", textAlign:"center", opacity:form.didToday.trim()?"1":"0.5" }}>
        💾 حفظ تقرير اليوم
      </Btn>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBER VIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MemberView = ({ user, logs, tasks, onSubmit, onLogout }) => {
  const [tab, setTab] = useState("daily");
  const col  = CLR[user.id];
  const pts  = memberPts(user.id, logs, "week");
  const ptsM = memberPts(user.id, logs, "month");
  const wst  = memberWeekStats(user.id, logs);
  const myLogs = logs.filter(l => l.memberId === user.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ direction:"rtl", fontFamily:"'Cairo',sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      {/* Header */}
      <div style={{ background:C.card2, borderBottom:`1px solid ${C.border}`, padding:"11px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <Av id={user.id} sz={38} />
          <div>
            <div style={{ fontWeight:"900", fontSize:"14px" }}>{user.name}</div>
            <div style={{ fontSize:"10px", color:col }}>{RL[user.role]}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"17px", fontWeight:"700", color:col }}>{pts.total}</div>
            <div style={{ fontSize:"8px", color:C.muted }}>نقاط الأسبوع</div>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"7px", padding:"6px 11px", color:C.muted, cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontSize:"11px" }}>خروج</button>
        </div>
      </div>

      {/* Team Tasks (Global) */}
      {tasks?.length > 0 && (
        <div style={{ margin:"14px 16px 0", background:"#a855f715", border:"1px solid #a855f730", padding:"12px", borderRadius:"10px", animation:"fadeIn .5s ease" }}>
          <div style={{ fontSize:"11px", color:"#a855f7", fontWeight:"700", marginBottom:"6px", display:"flex", alignItems:"center", gap:"5px" }}>
            <span style={{fontSize:"14px"}}>📌</span> مهام الفريق المطلوبة:
          </div>
          <ul style={{ margin:0, padding:"0 20px", color:C.text, fontSize:"13px", lineHeight:1.6 }}>
            {tasks.map(t => <li key={t.id}>{t.text}</li>)}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:"2px", padding:"8px 16px 0", borderBottom:`1px solid ${C.border}` }}>
        {[{id:"daily",i:"📋",l:"تقرير اليوم"},{id:"stats",i:"📊",l:"أدائي"},{id:"history",i:"📅",l:"سجلي"}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"7px 13px", borderRadius:"7px 7px 0 0", border:"none", cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontWeight:tab===t.id?"700":"500", fontSize:"12px", background:tab===t.id?`${col}18`:"transparent", color:tab===t.id?col:C.muted, borderBottom:`2px solid ${tab===t.id?col:"transparent"}` }}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px 16px", maxHeight:"calc(100vh - 108px)", overflowY:"auto" }}>
        {tab === "daily" && <DailyLogForm user={user} logs={logs} onSubmit={onSubmit} />}

        {tab === "stats" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {/* Points */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {[{l:"نقاط الأسبوع",v:pts.total,c:col},{l:"نقاط الشهر",v:ptsM.total,c:"#a855f7"},{l:"إيراد الأسبوع",v:`$${wst.revenue}`,c:"#f97316"},{l:"DMs الأسبوع",v:wst.dms,c:"#06b6d4"}].map((s,i) => (
                <div key={i} style={{ background:`${s.c}0e`, border:`1px solid ${s.c}22`, borderRadius:"10px", padding:"12px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"20px", fontWeight:"700", color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:"9px", color:C.muted, marginTop:"3px" }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Points breakdown */}
            <Card>
              <ST>توزيع النقاط الأسبوعية</ST>
              {[{l:"نقاط الإيراد",v:pts.rev,c:"#f97316",max:200},{l:"نقاط Leads",v:pts.lead,c:"#00c9f7",max:50},{l:"نقاط Content",v:pts.cont,c:"#a855f7",max:70},{l:"نقاط Builder",v:pts.build||0,c:"#06b6d4",max:150}].map((p,i) => (
                <div key={i} style={{ marginBottom:"11px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", marginBottom:"4px" }}>
                    <span style={{ color:C.muted }}>{p.l}</span>
                    <span style={{ color:p.c, fontWeight:"700", fontFamily:"'Space Mono',monospace" }}>{p.v}</span>
                  </div>
                  <PBar pct={(p.v/p.max)*100} color={p.c} />
                </div>
              ))}
            </Card>

            {/* Role KPIs */}
            {user.role === "sales" && (
              <Card>
                <ST color="#f97316">KPIs Sales — هذا الأسبوع</ST>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"8px" }}>
                  {[
                    {l:"DMs",v:wst.dms,target:350,c:"#06b6d4",note:"هدف: ٥٠/يوم"},
                    {l:"Closings",v:wst.closings,target:4,c:"#22c55e",note:"هدف: ٤/أسبوع"},
                    {l:"Leads مؤهلة",v:wst.leads,target:20,c:"#00c9f7",note:"٥ نقاط/lead"},
                    {l:"الإيراد ($)",v:wst.revenue,target:125,c:"#f97316",note:"هدف: $125/أسبوع"},
                  ].map((k,i) => (
                    <div key={i} style={{ background:`${k.c}0e`, border:`1px solid ${k.c}20`, borderRadius:"9px", padding:"10px" }}>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:k.c, fontSize:"18px" }}>{k.v}</div>
                      <div style={{ fontSize:"10px", color:C.muted, margin:"2px 0" }}>{k.l}</div>
                      <div style={{ fontSize:"9px", color:k.c, opacity:.7, marginBottom:"5px" }}>{k.note}</div>
                      <PBar pct={(k.v/k.target)*100} color={k.c} h={4} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {(user.role === "builder" || user.extraRole === "builder") && (
              <Card>
                <ST color="#06b6d4">KPIs Builder — هذا الأسبوع</ST>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {[{l:"Demos / مشاريع",v:logs.filter(l=>l.memberId===user.id&&l.date>=weekStart).reduce((a,l)=>a+(l.buildDemos||0),0),c:"#06b6d4"},{l:"Templates / Auto",v:logs.filter(l=>l.memberId===user.id&&l.date>=weekStart).reduce((a,l)=>a+(l.buildTemplates||0),0),c:"#38bdf8"}].map((k,i) => (
                    <div key={i} style={{ background:`${k.c}0e`, border:`1px solid ${k.c}20`, borderRadius:"9px", padding:"12px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:k.c, fontSize:"22px" }}>{k.v}</div>
                      <div style={{ fontSize:"10px", color:C.muted, margin:"3px 0" }}>{k.l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {(user.role === "content" || user.extraRole === "content") && (
              <Card>
                <ST color="#a855f7">KPIs Content — هذا الأسبوع</ST>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {[{l:"Posts",v:wst.posts,target:14,c:"#a855f7",note:"هدف: ٢/يوم"},{l:"Videos",v:wst.videos,target:14,c:"#9333ea",note:"هدف: ٢/يوم"}].map((k,i) => (
                    <div key={i} style={{ background:`${k.c}0e`, border:`1px solid ${k.c}20`, borderRadius:"9px", padding:"12px", textAlign:"center" }}>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:k.c, fontSize:"22px" }}>{k.v}</div>
                      <div style={{ fontSize:"10px", color:C.muted, margin:"3px 0" }}>{k.l}</div>
                      <div style={{ fontSize:"9px", color:k.c, opacity:.7, marginBottom:"6px" }}>{k.note}</div>
                      <PBar pct={(k.v/k.target)*100} color={k.c} h={5} />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="fade-in">
            <ST>سجل تقاريرك اليومية</ST>
            {myLogs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"50px", color:C.muted }}>ما فيش تقارير لحد دلوقتي</div>
            ) : myLogs.map(l => {
              const p = calcPts(l);
              return (
                <Card key={l.id} style={{ marginBottom:"9px", borderRight:`3px solid ${col}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                    <div style={{ fontWeight:"700", fontSize:"13px" }}>{l.date}</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"12px", color:col, fontWeight:"700" }}>{p.total} pt</div>
                  </div>
                  <div style={{ fontSize:"12px", color:C.muted, lineHeight:1.5, marginBottom:"7px" }}>
                    {l.didToday?.slice(0, 120)}{(l.didToday?.length||0) > 120 ? "..." : ""}
                  </div>
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                    {l.revenue>0&&<Badge color="#f97316" sm>${l.revenue}</Badge>}
                    {l.dms>0&&<Badge color="#06b6d4" sm>{l.dms} DM</Badge>}
                    {l.closings>0&&<Badge color="#22c55e" sm>{l.closings} close</Badge>}
                    {l.leads>0&&<Badge color="#00c9f7" sm>{l.leads} lead</Badge>}
                    {l.posts>0&&<Badge color="#a855f7" sm>{l.posts} post</Badge>}
                    {l.videos>0&&<Badge color="#9333ea" sm>{l.videos} vid</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AdminDashboard = ({ user, logs, tasks, onAddTask, onDeleteTask, onLogout }) => {
  const [tab, setTab]         = useState("overview");
  const [dateFilter, setDateF] = useState(TODAY);
  const [pulse, setPulse]     = useState(false);
  const [logModal, setLogModal] = useState(null); // view full log
  const [newTask, setNewTask] = useState("");

  useEffect(() => { const i = setInterval(() => setPulse(p => !p), 1400); return () => clearInterval(i); }, []);

  // Computed
  const todayLogs   = logs.filter(l => l.date === TODAY);
  const whoMissed   = MEMBERS.filter(m => !todayLogs.find(l => l.memberId === m.id));
  const monthRev    = logs.filter(l => l.date.startsWith(TODAY.slice(0, 7))).reduce((a, l) => a + (l.revenue || 0), 0);
  const weekRev     = logs.filter(l => l.date >= weekStart).reduce((a, l) => a + (l.revenue || 0), 0);

  const leaderboard = MEMBERS.map(m => {
    const p  = memberPts(m.id, logs, "week");
    const wst = memberWeekStats(m.id, logs);
    return { ...m, pts:p.total, ptsDet:p, ...wst };
  }).sort((a, b) => b.pts - a.pts);

  const teamRank = ["sales","builder","content","operation"].map(role => {
    const mems = MEMBERS.filter(m => m.role === role);
    const pts  = mems.reduce((a, m) => a + memberPts(m.id, logs, "week").total, 0);
    const rev  = mems.reduce((a, m) => a + memberWeekStats(m.id, logs).revenue, 0);
    return { role, label:RL[role], color:RC[role], count:mems.length, pts, rev };
  }).sort((a, b) => b.pts - a.pts);

  const last7 = Array.from({ length:7 }, (_, i) => {
    const d  = new Date(TODAY); d.setDate(d.getDate() - (6-i));
    const ds = d.toISOString().split("T")[0];
    const dl = logs.filter(l => l.date === ds);
    return {
      day: d.toLocaleDateString("ar-EG", { weekday:"short" }),
      إيراد: dl.reduce((a, l) => a + (l.revenue || 0), 0),
      نقاط:  dl.reduce((a, l) => a + calcPts(l).total, 0),
      تقارير: dl.length,
    };
  });

  const pieData = [
    { name:"Sales",    value:logs.filter(l=>MEMBERS.find(m=>m.id===l.memberId&&m.role==="sales")).reduce((a,l)=>a+(l.revenue||0),0) || 1, color:"#f97316" },
    { name:"Builder",  value:logs.filter(l=>l.date>=weekStart).reduce((a,l)=>a+(calcPts(l).build||0),0) || 1, color:"#06b6d4" },
    { name:"Content",  value:logs.filter(l=>l.date>=weekStart).reduce((a,l)=>a+calcPts(l).cont,0) || 1, color:"#a855f7" },
    { name:"Operation",value:1, color:"#22c55e" },
  ];

  const TABS = [
    {id:"overview",  i:"⚡", l:"القيادة"},
    {id:"tasks",     i:"📌", l:"المهام", badge:tasks?.length},
    {id:"leaderboard",i:"🏆",l:"الترتيب"},
    {id:"logs",      i:"📋", l:"السجلات", badge:whoMissed.length},
    {id:"team",      i:"👥", l:"الفريق"},
    {id:"kpis",      i:"📊", l:"الأداء"},
    {id:"alerts",    i:"🔔", l:"التنبيهات", badge:whoMissed.length + (monthRev<500?1:0)},
  ];

  return (
    <div style={{ direction:"rtl", fontFamily:"'Cairo',sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      {/* HEADER */}
      <div style={{ background:C.card2, borderBottom:`1px solid ${C.border}`, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <div style={{ width:"34px", height:"34px", background:"linear-gradient(135deg,#00c9f7,#0050d0)", borderRadius:"9px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", boxShadow:"0 0 14px #00c9f750" }}>⚡</div>
          <div>
            <div style={{ fontWeight:"900", fontSize:"14px", background:"linear-gradient(90deg,#00c9f7,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>مركز قيادة الفريق</div>
            <div style={{ fontSize:"9px", color:C.muted, fontFamily:"'Space Mono',monospace" }}>ADMIN · {user.name}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"5px", background:"#041a08", border:"1px solid #16a34a44", borderRadius:"20px", padding:"4px 9px", fontSize:"9px", color:"#22c55e", fontFamily:"'Space Mono',monospace", fontWeight:"700" }}>
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:pulse?"#22c55e":"#16a34a", boxShadow:pulse?"0 0 6px #22c55e":"none", transition:"all .5s" }} />
            LIVE
          </div>
          <div style={{ fontSize:"10px", color:C.muted }}>{todayLogs.length}/{MEMBERS.length} سجّلوا</div>
          <button onClick={onLogout} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"7px", padding:"5px 10px", color:C.muted, cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontSize:"11px" }}>خروج</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", gap:"2px", padding:"8px 18px 0", borderBottom:`1px solid ${C.border}`, overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"7px 12px", borderRadius:"7px 7px 0 0", border:"none", cursor:"pointer", fontFamily:"'Cairo',sans-serif", fontWeight:tab===t.id?"700":"500", fontSize:"11px", background:tab===t.id?"#00c9f718":"transparent", color:tab===t.id?"#00c9f7":C.muted, borderBottom:`2px solid ${tab===t.id?"#00c9f7":"transparent"}`, whiteSpace:"nowrap", position:"relative" }}>
            {t.i} {t.l}
            {(t.badge||0)>0 && <span style={{ position:"absolute", top:"2px", left:"2px", minWidth:"14px", height:"14px", borderRadius:"7px", background:"#f04060", fontSize:"8px", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", padding:"0 2px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px 18px", maxHeight:"calc(100vh - 108px)", overflowY:"auto" }}>

        {/* Team Tasks (Global - visible to Admin in overview) */}
        {tasks?.length > 0 && tab === "overview" && (
          <div style={{ marginBottom:"14px", background:"#a855f715", border:"1px solid #a855f730", padding:"12px", borderRadius:"10px", animation:"fadeIn .5s ease" }}>
            <div style={{ fontSize:"11px", color:"#a855f7", fontWeight:"700", marginBottom:"6px", display:"flex", alignItems:"center", gap:"5px" }}>
              <span style={{fontSize:"14px"}}>📌</span> مهام الفريق المطلوبة:
            </div>
            <ul style={{ margin:0, padding:"0 20px", color:C.text, fontSize:"13px", lineHeight:1.6 }}>
              {tasks.map(t => <li key={t.id}>{t.text}</li>)}
            </ul>
          </div>
        )}

        {/* ═══ TASKS ═══ */}
        {tab === "tasks" && (
          <div className="fade-in">
            {user.id === "amr" && (
              <Card style={{ marginBottom: "14px" }}>
                <ST color="#a855f7">إضافة مهمة جديدة للفريق</ST>
                <div style={{ display:"flex", gap:"10px" }}>
                  <Inp placeholder="اكتب المهمة هنا..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => {
                    if (e.key === "Enter" && newTask.trim()) { onAddTask(newTask); setNewTask(""); }
                  }} />
                  <Btn color="#a855f7" onClick={() => {
                    if(newTask.trim()) { onAddTask(newTask); setNewTask(""); }
                  }}>إضافة 📌</Btn>
                </div>
              </Card>
            )}

            <Card>
              <ST>مهام الفريق الحالية</ST>
              {tasks?.length === 0 ? (
                <div style={{color:C.muted, fontSize:"12px", textAlign:"center", padding:"20px"}}>لا توجد مهام حالياً</div>
              ) : (
                <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "10px", background:`${C.border}30`, borderRadius:"8px" }}>
                      <div style={{fontSize:"13px"}}>{t.text}</div>
                      {user.id === "amr" && (
                        <button onClick={() => onDeleteTask(t.id)} style={{background:"none", border:"none", color:"#f04060", cursor:"pointer", fontSize:"12px", fontWeight:"700", padding:"4px 8px"}}>
                          حذف
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <div className="fade-in">
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"10px", marginBottom:"14px" }}>
              {[
                {l:"إيراد الأسبوع",    v:`$${weekRev}`,                  c:"#f97316", i:"💰"},
                {l:"إيراد الشهر",      v:`$${monthRev}`,                 c:"#22c55e", i:"📈", sub:`من $500`},
                {l:"سجّلوا اليوم",    v:`${todayLogs.length}/${MEMBERS.length}`, c:"#00c9f7", i:"📋"},
                {l:"لم يسجّلوا",      v:whoMissed.length,               c:whoMissed.length>0?"#f04060":"#22c55e", i:"⚠️"},
                {l:"نقاط الأسبوع",   v:leaderboard.reduce((a,m)=>a+m.pts,0), c:"#a855f7", i:"💎"},
              ].map((k,i) => (
                <div key={i} style={{ background:`${k.c}0e`, border:`1px solid ${k.c}22`, borderRadius:"12px", padding:"12px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:"-8px", left:"-8px", width:"35px", height:"35px", borderRadius:"50%", background:`${k.c}18`, filter:"blur(10px)" }} />
                  <div style={{ fontSize:"14px", marginBottom:"2px" }}>{k.i}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:"19px", fontWeight:"700", color:k.c, lineHeight:1 }}>{k.v}</div>
                  <div style={{ fontSize:"9px", color:C.muted, marginTop:"3px" }}>{k.l}</div>
                  {k.sub && <div style={{ fontSize:"8px", color:k.c, opacity:.6 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:"14px" }}>
              {/* Area chart */}
              <Card>
                <ST>📈 الإيرادات والنقاط — آخر ٧ أيام</ST>
                <ResponsiveContainer width="100%" height={155}>
                  <AreaChart data={last7}>
                    <defs>
                      <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={.2}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill:C.muted, fontSize:9, fontFamily:"Cairo" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:"8px", fontFamily:"Cairo", fontSize:"10px" }} />
                    <Area type="monotone" dataKey="إيراد" stroke="#f97316" fill="url(#gr1)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="نقاط"  stroke="#a855f7" fill="url(#gr2)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Team rank */}
              <Card>
                <ST>🏅 ترتيب الفرق — الأسبوع</ST>
                {teamRank.map((t,i) => (
                  <div key={t.role} style={{ display:"flex", gap:"9px", alignItems:"center", marginBottom:"10px" }}>
                    <div style={{ width:"22px", textAlign:"center", fontSize:"13px" }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"④"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                        <span style={{ fontWeight:"700", fontSize:"12px" }}>{t.label}</span>
                        <span style={{ fontFamily:"'Space Mono',monospace", color:t.color, fontWeight:"700", fontSize:"11px" }}>{t.pts} pt</span>
                      </div>
                      <PBar pct={(t.pts/Math.max(...teamRank.map(x=>x.pts),1))*100} color={t.color} h={5} />
                      <div style={{ fontSize:"9px", color:C.muted, marginTop:"2px" }}>{t.count} عضو · ${t.rev}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Today status grid */}
            <Card style={{ marginTop:"14px" }}>
              <ST>📅 حالة تسجيل اليوم — {TODAY}</ST>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:"7px" }}>
                {MEMBERS.map(m => {
                  const l = todayLogs.find(x => x.memberId === m.id);
                  const p = l ? calcPts(l) : null;
                  return (
                    <div key={m.id} style={{ display:"flex", gap:"8px", alignItems:"center", padding:"8px 10px", borderRadius:"9px", background:l?"#22c55e0a":"#f040600a", border:`1px solid ${l?"#22c55e":"#f04060"}1a` }}>
                      <Av id={m.id} sz={26} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"11px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name.split(" ")[0]}</div>
                        <div style={{ fontSize:"9px", color:CLR[m.id] }}>{RL[m.role]}</div>
                      </div>
                      <div style={{ fontSize:"13px" }}>{l ? "✅" : "❌"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ LEADERBOARD ═══ */}
        {tab === "leaderboard" && (
          <div className="fade-in">
            {/* Bonus cards reminder */}
            <div style={{ background:"#fbbf2410", border:"1px solid #fbbf2428", borderRadius:"11px", padding:"12px 14px", marginBottom:"14px" }}>
              <div style={{ fontWeight:"700", fontSize:"12px", color:"#fbbf24", marginBottom:"6px" }}>🎁 بونص الفرق المتاح</div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", fontSize:"10px", color:C.muted }}>
                <Badge color="#fbbf24">أول بيعة في الشهر → +50 نقطة</Badge>
                <Badge color="#f97316">أول $100 في الشهر → +50 نقطة</Badge>
                <Badge color="#22c55e">أول بيعة $100+ → +100 نقطة</Badge>
              </div>
            </div>

            {leaderboard.map((m, i) => (
              <div key={m.id} className="fade-in" style={{ display:"flex", gap:"10px", alignItems:"center", padding:"11px 12px", borderRadius:"11px", background:`${CLR[m.id]}08`, border:`1px solid ${CLR[m.id]}18`, marginBottom:"7px" }}>
                <div style={{ width:"24px", textAlign:"center", fontSize:"15px", flexShrink:0 }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":<span style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:C.muted, fontSize:"12px" }}>{i+1}</span>}
                </div>
                <Av id={m.id} sz={34} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                    <div>
                      <span style={{ fontWeight:"700", fontSize:"13px" }}>{m.name}</span>
                      <span style={{ fontSize:"10px", color:CLR[m.id], marginRight:"6px" }}> · {RL[m.role]}</span>
                    </div>
                    <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:CLR[m.id], fontSize:"15px" }}>{m.pts} pt</span>
                  </div>
                  <div style={{ display:"flex", gap:"5px", flexWrap:"wrap", marginBottom:"5px" }}>
                    {m.revenue>0&&<Badge color="#f97316" sm>${m.revenue}</Badge>}
                    {m.dms>0&&<Badge color="#06b6d4" sm>{m.dms} DM</Badge>}
                    {m.closings>0&&<Badge color="#22c55e" sm>{m.closings} close</Badge>}
                    {m.leads>0&&<Badge color="#00c9f7" sm>{m.leads} lead</Badge>}
                    {m.posts>0&&<Badge color="#a855f7" sm>{m.posts} post</Badge>}
                    {m.videos>0&&<Badge color="#9333ea" sm>{m.videos} vid</Badge>}
                    {m.days===0&&<Badge color="#f04060" sm>لم يسجّل</Badge>}
                  </div>
                  <PBar pct={(m.pts/Math.max(leaderboard[0]?.pts||1,1))*100} color={CLR[m.id]} h={4} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ LOGS ═══ */}
        {tab === "logs" && (
          <div className="fade-in">
            <div style={{ display:"flex", gap:"10px", marginBottom:"14px", flexWrap:"wrap", alignItems:"center" }}>
              <input type="date" value={dateFilter} onChange={e => setDateF(e.target.value)}
                style={{ background:"#030b15", border:`1px solid ${C.border}`, borderRadius:"8px", padding:"8px 11px", color:C.text, fontFamily:"'Cairo',sans-serif", fontSize:"12px", outline:"none" }} />
              <div style={{ fontSize:"11px", color:C.muted }}>{logs.filter(l=>l.date===dateFilter).length} تقرير</div>
            </div>

            {/* Missing today */}
            {dateFilter === TODAY && whoMissed.length > 0 && (
              <div style={{ background:"#f0406010", border:"1px solid #f0406028", borderRadius:"10px", padding:"12px 14px", marginBottom:"12px" }}>
                <div style={{ fontWeight:"700", fontSize:"12px", color:"#f04060", marginBottom:"7px" }}>❌ لم يسجّلوا النهارده ({whoMissed.length})</div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {whoMissed.map(m => (
                    <div key={m.id} style={{ display:"flex", gap:"6px", alignItems:"center", padding:"5px 9px", background:"#f0406015", borderRadius:"7px", fontSize:"11px" }}>
                      <Av id={m.id} sz={18} />
                      <span style={{ color:C.text }}>{m.name.split(" ")[0]}</span>
                      <span style={{ color:C.muted, fontSize:"10px" }}>{m.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {logs.filter(l => l.date === dateFilter).length === 0 ? (
              <div style={{ textAlign:"center", padding:"50px", color:C.muted }}>ما فيش تقارير في التاريخ ده</div>
            ) : logs.filter(l => l.date === dateFilter).sort((a,b)=>b.submittedAt?.localeCompare(a.submittedAt||"")||0).map(l => {
              const m = MEMBERS.find(x => x.id === l.memberId); if (!m) return null;
              const p = calcPts(l);
              return (
                <Card key={l.id} style={{ marginBottom:"9px", borderRight:`3px solid ${CLR[m.id]||"#64748b"}` }}>
                  <div style={{ display:"flex", gap:"9px", alignItems:"flex-start" }}>
                    <Av id={m.id} sz={32} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                        <div>
                          <span style={{ fontWeight:"700", fontSize:"13px" }}>{m.name}</span>
                          <span style={{ fontSize:"10px", color:CLR[m.id], marginRight:"6px" }}> · {RL[m.role]}</span>
                        </div>
                        <div style={{ display:"flex", gap:"5px", alignItems:"center" }}>
                          <span style={{ fontFamily:"'Space Mono',monospace", fontSize:"11px", color:CLR[m.id], fontWeight:"700" }}>{p.total} pt</span>
                          <button onClick={() => setLogModal(l)} style={{ background:`${CLR[m.id]}20`, border:"none", borderRadius:"5px", padding:"3px 8px", color:CLR[m.id], cursor:"pointer", fontSize:"10px", fontFamily:"'Cairo',sans-serif" }}>عرض</button>
                        </div>
                      </div>
                      {l.didToday && <div style={{ fontSize:"12px", color:C.text, marginBottom:"5px", lineHeight:1.5 }}><span style={{ color:C.muted, fontSize:"10px" }}>عمل: </span>{l.didToday.slice(0,100)}{l.didToday.length>100?"...":""}</div>}
                      <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                        {l.revenue>0&&<Badge color="#f97316" sm>💰 ${l.revenue}</Badge>}
                        {l.dms>0&&<Badge color="#06b6d4" sm>📩 {l.dms} DM</Badge>}
                        {l.closings>0&&<Badge color="#22c55e" sm>🤝 {l.closings}</Badge>}
                        {l.leads>0&&<Badge color="#00c9f7" sm>🎯 {l.leads} lead</Badge>}
                        {l.posts>0&&<Badge color="#a855f7" sm>📝 {l.posts}</Badge>}
                        {l.videos>0&&<Badge color="#9333ea" sm>🎬 {l.videos}</Badge>}
                        {l.doublePoints&&<Badge color="#fbbf24" sm>🃏 2x</Badge>}
                        {l.screenshots&&<Badge color="#22c55e" sm>📸</Badge>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ═══ TEAM ═══ */}
        {tab === "team" && (
          <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"12px" }}>
            {MEMBERS.map(m => {
              const wst  = memberWeekStats(m.id, logs);
              const pts  = memberPts(m.id, logs, "week");
              const col  = CLR[m.id];
              const submitted = !!logs.find(l => l.memberId === m.id && l.date === TODAY);
              return (
                <Card key={m.id} style={{ background:`linear-gradient(135deg,${col}08,${C.card2})`, border:`1px solid ${col}22` }}>
                  <div style={{ display:"flex", gap:"10px", alignItems:"center", marginBottom:"12px" }}>
                    <Av id={m.id} sz={44} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        <span style={{ fontWeight:"900", fontSize:"14px" }}>{m.name}</span>
                        <span style={{ fontSize:"13px" }}>{submitted?"✅":"❌"}</span>
                      </div>
                      <div style={{ fontSize:"11px", color:col }}>{RL[m.role]}{m.isAdmin?" · Admin":m.isSubLeader?" · قائد فريق":""}</div>
                      <div style={{ fontSize:"9px", color:C.muted, marginTop:"1px" }}>📞 {m.phone} · ⏱ {m.hours}h/week</div>
                    </div>
                  </div>
                  <div style={{ marginBottom:"10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", marginBottom:"4px" }}>
                      <span style={{ color:C.muted }}>نقاط الأسبوع</span>
                      <span style={{ color:col, fontWeight:"700", fontFamily:"'Space Mono',monospace" }}>{pts.total}</span>
                    </div>
                    <PBar pct={pts.total/5} color={col} h={6} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"6px" }}>
                    {[{l:"إيراد",v:`$${wst.revenue}`,c:"#f97316"},{l:"DMs",v:wst.dms,c:"#06b6d4"},{l:"Leads",v:wst.leads,c:"#00c9f7"},{l:"Posts / Vids",v:`${wst.posts}/${wst.videos}`,c:"#a855f7"},{l:"نقاط بناء",v:pts.build||0,c:"#38bdf8"},{l:"أيام مسجّلة",v:wst.days,c:col}].map((s,i) => (
                      <div key={i} style={{ background:`${s.c}0d`, borderRadius:"7px", padding:"6px", textAlign:"center" }}>
                        <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", color:s.c, fontSize:"12px" }}>{s.v}</div>
                        <div style={{ fontSize:"8px", color:C.muted, marginTop:"1px" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ═══ KPIs ═══ */}
        {tab === "kpis" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {/* Monthly target */}
            <Card style={{ background:"linear-gradient(135deg,#22c55e0a,#f9731608)", border:"1px solid #22c55e22" }}>
              <ST>🎯 هدف الشهر — $500 للفريق كله</ST>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"8px" }}>
                <span style={{ fontFamily:"'Space Mono',monospace", fontWeight:"700", fontSize:"24px", color:monthRev>=500?"#22c55e":"#f97316" }}>${monthRev}</span>
                <span style={{ color:C.muted, fontSize:"12px" }}>المتبقي: ${Math.max(0, 500-monthRev)}</span>
              </div>
              <PBar pct={(monthRev/500)*100} color={monthRev>=500?"#22c55e":"#f97316"} h={10} />
            </Card>

            {/* Sales table */}
            <Card>
              <ST color="#f97316">Sales KPIs — هذا الأسبوع</ST>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                      {["العضو","DMs","هدف DMs","Closings","هدف Close","Leads","الإيراد","النقاط"].map(h => (
                        <th key={h} style={{ padding:"8px 6px", textAlign:"right", color:C.muted, fontWeight:"700", fontSize:"10px", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.filter(m => m.role === "sales").map(m => {
                      const dmsOk = m.dms >= 350, closeOk = m.closings >= 4;
                      return (
                        <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}18` }}>
                          <td style={{ padding:"8px 6px" }}><div style={{ display:"flex", gap:"7px", alignItems:"center" }}><Av id={m.id} sz={22}/><span style={{ fontWeight:"700" }}>{m.name.split(" ")[0]}</span></div></td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#06b6d4", fontWeight:"700" }}>{m.dms}</td>
                          <td style={{ padding:"8px 6px" }}><Badge color={dmsOk?"#22c55e":"#f04060"} sm>{dmsOk?"✓ ٣٥٠":"٣٥٠"}</Badge></td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#22c55e", fontWeight:"700" }}>{m.closings}</td>
                          <td style={{ padding:"8px 6px" }}><Badge color={closeOk?"#22c55e":"#f04060"} sm>{closeOk?"✓ ٤":"٤"}</Badge></td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#00c9f7", fontWeight:"700" }}>{m.leads}</td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#f97316", fontWeight:"700" }}>${m.revenue}</td>
                          <td style={{ padding:"8px 6px" }}><Badge color={CLR[m.id]} sm>{m.pts}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Content table */}
            <Card>
              <ST color="#a855f7">Content KPIs — هذا الأسبوع</ST>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                      {["العضو","Posts","هدف Posts","Videos","هدف Videos","نقاط Content"].map(h => (
                        <th key={h} style={{ padding:"8px 6px", textAlign:"right", color:C.muted, fontWeight:"700", fontSize:"10px", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.filter(m => m.role === "content" || m.extraRole === "content").map(m => {
                      const postsOk = m.posts >= 14, vidsOk = m.videos >= 14;
                      const cPts = memberPts(m.id, logs, "week").cont;
                      return (
                        <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}18` }}>
                          <td style={{ padding:"8px 6px" }}><div style={{ display:"flex", gap:"7px", alignItems:"center" }}><Av id={m.id} sz={22}/><span style={{ fontWeight:"700" }}>{m.name.split(" ")[0]}</span></div></td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#a855f7", fontWeight:"700" }}>{m.posts}</td>
                          <td style={{ padding:"8px 6px" }}><Badge color={postsOk?"#22c55e":"#f04060"} sm>{postsOk?"✓ ١٤":"١٤"}</Badge></td>
                          <td style={{ padding:"8px 6px", fontFamily:"'Space Mono',monospace", color:"#9333ea", fontWeight:"700" }}>{m.videos}</td>
                          <td style={{ padding:"8px 6px" }}><Badge color={vidsOk?"#22c55e":"#f04060"} sm>{vidsOk?"✓ ١٤":"١٤"}</Badge></td>
                          <td style={{ padding:"8px 6px" }}><Badge color="#a855f7" sm>{cPts} pt</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Bar chart */}
            <Card>
              <ST>📊 تقارير الفريق — آخر ٧ أيام</ST>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={last7}>
                  <XAxis dataKey="day" tick={{ fill:C.muted, fontSize:9, fontFamily:"Cairo" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:"8px", fontFamily:"Cairo", fontSize:"10px" }} />
                  <Bar dataKey="تقارير" fill="#00c9f7" radius={[3,3,0,0]} maxBarSize={28} />
                  <Bar dataKey="إيراد"  fill="#f97316" radius={[3,3,0,0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ═══ ALERTS ═══ */}
        {tab === "alerts" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {DOW===4&&(
              <div style={{ background:"#f9731612", border:"1px solid #f9731638", borderRadius:"11px", padding:"14px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
                <span style={{ fontSize:"24px" }}>💰</span>
                <div><div style={{ fontWeight:"700", color:"#f97316" }}>اليوم Sales Day (الخميس) 🔥</div><div style={{ fontSize:"12px", color:C.muted }}>ذكّر الفريق كله يبعت ٥٠ DM على الأقل</div></div>
              </div>
            )}
            {DOW===5&&(
              <div style={{ background:"#00c9f712", border:"1px solid #00c9f730", borderRadius:"11px", padding:"14px 16px", display:"flex", gap:"12px", alignItems:"center" }}>
                <span style={{ fontSize:"24px" }}>📅</span>
                <div><div style={{ fontWeight:"700", color:"#00c9f7" }}>ميتينج النهارده (الجمعة) الساعة ٩ صباحاً</div><div style={{ fontSize:"12px", color:C.muted }}>Live أسبوعي مع أستاذ عبد الله</div></div>
              </div>
            )}

            {whoMissed.length > 0 && (
              <Card style={{ border:"1px solid #f0406025", background:"#f040600a" }}>
                <ST color="#f04060">❌ لم يسجّلوا تقرير النهارده ({whoMissed.length})</ST>
                {whoMissed.map(m => (
                  <div key={m.id} style={{ display:"flex", gap:"9px", alignItems:"center", padding:"8px", borderRadius:"8px", background:"#f040600a", marginBottom:"6px" }}>
                    <Av id={m.id} sz={28} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"700", fontSize:"12px" }}>{m.name}</div>
                      <div style={{ fontSize:"10px", color:CLR[m.id] }}>{RL[m.role]}</div>
                    </div>
                    <div style={{ fontSize:"10px", color:C.muted }}>📞 {m.phone}</div>
                  </div>
                ))}
              </Card>
            )}

            {monthRev < 500 && (
              <Card style={{ border:"1px solid #fbbf2428", background:"#fbbf2408" }}>
                <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
                  <span style={{ fontSize:"24px" }}>📉</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:"700", color:"#fbbf24", marginBottom:"4px" }}>هدف الشهر لسه ما اتحقق</div>
                    <div style={{ fontSize:"12px", color:C.muted, marginBottom:"8px" }}>محقق: ${monthRev} من $500 المطلوبة</div>
                    <PBar pct={(monthRev/500)*100} color="#fbbf24" h={7} />
                    <div style={{ fontSize:"10px", color:"#fbbf24", marginTop:"4px" }}>متبقي ${500-monthRev} عشان الهدف</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Zero revenue sellers */}
            {leaderboard.filter(m => m.role==="sales" && m.revenue===0).length > 0 && (
              <Card style={{ border:"1px solid #f0406020" }}>
                <ST color="#f04060">💸 Sales بدون إيراد هذا الأسبوع</ST>
                {leaderboard.filter(m => m.role==="sales" && m.revenue===0).map(m => (
                  <div key={m.id} style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"7px" }}>
                    <Av id={m.id} sz={26} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"700", fontSize:"12px" }}>{m.name}</div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{m.dms} DM · {m.closings} closing</div>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* Points system reminder */}
            <Card>
              <ST>💎 نظام النقاط — تذكير</ST>
              <div style={{ display:"flex", flexDirection:"column", gap:"7px", fontSize:"12px" }}>
                {[
                  ["💰 الإيراد","$1 = 1 نقطة (وزن ٧٠٪)","#f97316"],
                  ["🎯 Leads","Lead مؤهلة = 5 نقاط (وزن ٢٠٪)","#00c9f7"],
                  ["📱 Content","Post = 2 | Video = 5 (وزن ١٠٪)","#a855f7"],
                  ["🃏 Double Points","ضاعف نقاط الإيراد — يتفعّل قبل البيع","#fbbf24"],
                ].map(([l,v,c],i) => (
                  <div key={i} style={{ display:"flex", gap:"10px", alignItems:"center", padding:"8px", borderRadius:"8px", background:`${c}0a` }}>
                    <span style={{ fontSize:"13px", width:"20px" }}>{l.split(" ")[0]}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"700", color:c, fontSize:"11px" }}>{l.slice(2)}</div>
                      <div style={{ fontSize:"10px", color:C.muted }}>{v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {whoMissed.length===0 && monthRev>=500 && (
              <div style={{ textAlign:"center", padding:"50px", color:C.muted }}>
                <div style={{ fontSize:"40px", marginBottom:"10px" }}>🎉</div>
                <div style={{ fontWeight:"700", color:"#22c55e" }}>كل حاجة تمام! الفريق شغّال!</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FULL LOG MODAL ── */}
      {logModal && (() => {
        const m = MEMBERS.find(x => x.id === logModal.memberId);
        const p = calcPts(logModal);
        return (
          <Modal title={`تقرير ${m?.name} — ${logModal.date}`} onClose={() => setLogModal(null)}>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
              {p.total>0&&<Badge color={CLR[m?.id]}>💎 {p.total} نقطة</Badge>}
              {logModal.revenue>0&&<Badge color="#f97316">💰 ${logModal.revenue}</Badge>}
              {logModal.dms>0&&<Badge color="#06b6d4">📩 {logModal.dms} DM</Badge>}
              {logModal.closings>0&&<Badge color="#22c55e">🤝 {logModal.closings} closing</Badge>}
              {logModal.leads>0&&<Badge color="#00c9f7">🎯 {logModal.leads} lead</Badge>}
              {logModal.posts>0&&<Badge color="#a855f7">📝 {logModal.posts} post</Badge>}
              {logModal.videos>0&&<Badge color="#9333ea">🎬 {logModal.videos} video</Badge>}
            </div>
            {[["١. عمل إيه؟", logModal.didToday], ["٢. النتيجة؟", logModal.results], ["٣. خطة بكرا؟", logModal.tomorrow], ["Builder Tasks", logModal.tasksDesc], ["Operation Update", logModal.opUpdate]].map(([l,v],i) => v ? (
              <div key={i} style={{ marginBottom:"12px" }}>
                <div style={{ fontSize:"10px", color:C.muted, fontWeight:"700", marginBottom:"4px" }}>{l}</div>
                <div style={{ fontSize:"13px", lineHeight:1.6, background:C.card, padding:"10px", borderRadius:"8px", border:`1px solid ${C.border}` }}>{v}</div>
              </div>
            ) : null)}
            <div style={{ fontSize:"10px", color:C.muted, marginTop:"8px" }}>
              ✅ Screenshots: {logModal.screenshots?"موجودة":"غير مؤكدة"} · 🃏 Double Points: {logModal.doublePoints?"مفعّل":"لا"}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [user,  setUser]  = useState(null);
  const [logs,  setLogs]  = useState([]);
  const [tasks, setTasks] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Fetch Session from localStorage
      const savedSession = loadSession();
      if (savedSession) setUser(savedSession);

      // 2. Fetch Logs from Firestore
      try {
        const q = query(collection(db, "logs"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedLogs = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push(doc.data());
        });
        setLogs(fetchedLogs);
      } catch (e) {
        console.error("Error fetching logs: ", e);
      }

      // 3. Fetch Tasks
      try {
        const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
        const tkSnap = await getDocs(qTasks);
        const tkList = [];
        tkSnap.forEach(d => tkList.push({ id: d.id, ...d.data() }));
        setTasks(tkList);
      } catch (e) {
        console.error("Error fetching tasks: ", e);
      }

      setReady(true);
    })();
  }, []);

  const handleLogin  = (member) => { setUser(member); saveSession(member); };
  const handleLogout = ()       => { setUser(null);   saveSession(null);   };
  
  const handleAddTask = async (text) => {
    try {
      const docRef = await addDoc(collection(db, "tasks"), { text, createdAt: new Date().toISOString(), author: user.name });
      setTasks(p => [{ id: docRef.id, text, createdAt: new Date().toISOString(), author: user.name }, ...p]);
    } catch(e) { console.error(e); }
  };
  
  const handleDeleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, "tasks", id));
      setTasks(p => p.filter(t => t.id !== id));
    } catch(e) { console.error(e); }
  };

  const handleLog    = async (log) => {
    // Optimistic Update
    setLogs(prev => {
      const filtered = prev.filter(l => !(l.memberId === log.memberId && l.date === log.date));
      return [log, ...filtered];
    });

    // Save to Firestore
    try {
      // Use "memberId_date" as document ID to ensure one log per member per day
      const docId = `${log.memberId}_${log.date}`;
      await setDoc(doc(db, "logs", docId), log);
    } catch (e) {
      console.error("Error saving log: ", e);
    }
  };

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cairo',sans-serif", color:"#00c9f7", fontSize:"14px", fontWeight:"700", direction:"rtl" }}>
      ⚙️ جاري تحميل النظام...
    </div>
  );

  return (
    <>
      <style>{GF}</style>
      {!user   ? <Login onLogin={handleLogin} /> :
       user.isAdmin ? <AdminDashboard user={user} logs={logs} tasks={tasks} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} onLogout={handleLogout} /> :
       <MemberView user={user} logs={logs} tasks={tasks} onSubmit={handleLog} onLogout={handleLogout} />}
    </>
  );
}
