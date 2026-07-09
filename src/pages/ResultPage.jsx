import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE = "http://127.0.0.1:8000";

// ── hooks ─────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useCountUp(target, duration = 1200, delay = 400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return val;
}

// ── verdict config ────────────────────────────────────────────────────────────
function getVerdictConfig(v) {
  const map = {
    true:                  { label: "Verified",            color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4", icon: "✓", ring: "#14B8A6" },
    verified:              { label: "Verified",            color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4", icon: "✓", ring: "#14B8A6" },
    false:                 { label: "False",               color: "#DC2626", bg: "#FFF1F2", border: "#FECDD3", icon: "✗", ring: "#F43F5E" },
    misleading:            { label: "Misleading",          color: "#DC2626", bg: "#FFF1F2", border: "#FECDD3", icon: "✗", ring: "#F43F5E" },
    "partially misleading":{ label: "Partly Misleading",  color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", icon: "⚠", ring: "#F59E0B" },
    unclear:               { label: "Unclear",             color: "#4B5563", bg: "#F9FAFB", border: "#E5E7EB", icon: "?", ring: "#9CA3AF" },
  };
  return map[v] || map.unclear;
}

function getRecencyConfig(r) {
  const map = {
    recent:        { label: "Recent",     sub: "Last 7 days",    dot: "#10B981", bg: "#ECFDF5", color: "#065F46" },
    not_recent:    { label: "Older",      sub: "7–30 days ago",  dot: "#F59E0B", bg: "#FFFBEB", color: "#92400E" },
    long_time_ago: { label: "Outdated",   sub: "1+ months ago",  dot: "#EF4444", bg: "#FFF1F2", color: "#991B1B" },
    ongoing:       { label: "Ongoing",    sub: "Still developing",dot: "#3B82F6", bg: "#EFF6FF", color: "#1E40AF" },
    unclear:       { label: "Unknown",    sub: "Recency unclear", dot: "#9CA3AF", bg: "#F9FAFB", color: "#4B5563" },
  };
  return map[r] || map.unclear;
}

// ── small components ──────────────────────────────────────────────────────────
function Pill({ children, color, bg, border }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6, background:bg, color, border:`1px solid ${border}`, borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:700, letterSpacing:"0.03em" }}>
      {children}
    </span>
  );
}

function Eyebrow({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", color:"#9CA3AF", marginBottom:8, textTransform:"uppercase" }}>{children}</div>;
}

function Divider() {
  return <div style={{ height:1, background:"#F3F4F6", margin:"28px 0" }} />;
}

function Spinner() {
  return <span style={{ display:"inline-block", width:13, height:13, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />;
}

// ── score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, color }) {
  const val = useCountUp(score);
  const r = 40, circ = 2 * Math.PI * r;
  const dash = circ - (circ * score) / 100;
  return (
    <div style={{ position:"relative", width:100, height:100, flexShrink:0 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={dash}
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1) 0.4s" }} />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:22, fontWeight:800, color:"#111827", lineHeight:1 }}>{val}</span>
        <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:600 }}>/ 100</span>
      </div>
    </div>
  );
}

// ── translation hook ──────────────────────────────────────────────────────────
function useTranslation() {
  const [cache, setCache]     = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors]   = useState({});
  const [active, setActive]   = useState(null);

  const translate = async (target, payload) => {
    if (cache[target]) { setActive(p => p === target ? null : target); return; }
    setLoading(p => ({ ...p, [target]: true }));
    setErrors(p => ({ ...p, [target]: null }));
    setActive(target);
    try {
      const resp = await fetch(`${API_BASE}/translate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data;
      try { data = await resp.json(); } catch { throw new Error(`Server error ${resp.status}`); }
      if (!resp.ok) throw new Error(data.detail || `Error ${resp.status}`);
      setCache(p => ({ ...p, [target]: data }));
    } catch (err) {
      setErrors(p => ({ ...p, [target]: err.message }));
      setActive(null);
    } finally {
      setLoading(p => ({ ...p, [target]: false }));
    }
  };

  return { cache, loading, errors, active, translate };
}

// ── translation bar ───────────────────────────────────────────────────────────
function TranslateBar({ detectedLang, onTranslate, loading, errors, active }) {
  if (!detectedLang || detectedLang === "unknown") return null;
  const showEn = detectedLang !== "en";
  const showHi = detectedLang !== "hi";
  if (!showEn && !showHi) return null;

  const btn = (target, label) => {
    const isActive  = active === target;
    const isLoading = loading[target];
    return (
      <button key={target} onClick={() => onTranslate(target)} disabled={isLoading}
        style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10,
          fontSize:13, fontWeight:600, cursor:isLoading?"wait":"pointer", transition:"all 0.18s ease",
          background: isActive ? "#111827" : "#F9FAFB",
          color: isActive ? "#F9FAFB" : "#374151",
          border: `1.5px solid ${isActive ? "#111827" : "#E5E7EB"}`,
          opacity: isLoading ? 0.75 : 1 }}>
        {isLoading ? <><Spinner />{" "}Translating…</> : label}
        {!isLoading && <span style={{ opacity:0.4, fontSize:10 }}>{isActive ? "▲" : "▼"}</span>}
      </button>
    );
  };

  return (
    <div style={{ marginTop:24 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <div style={{ flex:1, height:1, background:"#F3F4F6" }} />
        <Eyebrow>Translate analysis</Eyebrow>
        <div style={{ flex:1, height:1, background:"#F3F4F6" }} />
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {showEn && btn("en", "🇬🇧 English")}
        {showHi && btn("hi", "🇮🇳 हिंदी")}
      </div>
      {errors["en"] && <div style={{ marginTop:10, fontSize:13, color:"#DC2626", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:8, padding:"8px 12px" }}>⚠ {errors["en"]}</div>}
      {errors["hi"] && <div style={{ marginTop:10, fontSize:13, color:"#DC2626", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:8, padding:"8px 12px" }}>⚠ {errors["hi"]}</div>}
    </div>
  );
}

// ── translated block ──────────────────────────────────────────────────────────
function TranslatedBlock({ target, data, fields }) {
  const isHi = target === "hi";
  const accent = isHi
    ? { bg:"#FFFBEB", border:"#FDE68A", tag:"#92400E", tagBg:"#FEF3C7" }
    : { bg:"#EFF6FF", border:"#BFDBFE", tag:"#1E40AF", tagBg:"#DBEAFE" };

  return (
    <div style={{ marginTop:16, borderRadius:16, border:`1px solid ${accent.border}`, background:accent.bg, padding:20, animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:accent.tag, background:accent.tagBg, borderRadius:6, padding:"3px 8px" }}>
          {isHi ? "हिंदी" : "ENGLISH"} TRANSLATION
        </span>
        <div style={{ flex:1, height:1, background:accent.border }} />
      </div>
      {fields.map(({ label, text }, i) => text ? (
        <div key={i} style={{ marginBottom: i < fields.length - 1 ? 16 : 0 }}>
          <Eyebrow>{label}</Eyebrow>
          <div style={{ background:"#fff", border:`1px solid ${accent.border}`, borderRadius:10, padding:"14px 16px", lineHeight:1.85, fontSize:14, color:"#374151" }}>{text}</div>
        </div>
      ) : null)}
    </div>
  );
}

// ── analysis translation panel ────────────────────────────────────────────────
function AnalysisPanel({ detectedLang, summary, reasoning }) {
  const { cache, loading, errors, active, translate } = useTranslation();
  const handle = (target) => translate(target, { summary: summary||"", reasoning: reasoning||"", target, source_language: detectedLang });
  return (
    <>
      <TranslateBar detectedLang={detectedLang} onTranslate={handle} loading={loading} errors={errors} active={active} />
      {active && cache[active] && (
        <TranslatedBlock target={active} data={cache[active]}
          fields={[
            { label:"Neutral summary",  text: cache[active].summary   },
            { label:"AI reasoning",     text: cache[active].reasoning },
          ]} />
      )}
    </>
  );
}

// ── expandable detail section ─────────────────────────────────────────────────
function DetailSection({ claim, contextText, detectedLang }) {
  const [open, setOpen]   = useState(false);
  const [text, setText]   = useState(null);
  const [loading, setLd]  = useState(false);
  const [error, setErr]   = useState(null);
  const { cache, loading:tl, errors:te, active, translate } = useTranslation();

  const fetch_ = async () => {
    if (text) { setOpen(o => !o); return; }
    setOpen(true); setLd(true); setErr(null);
    try {
      const resp = await fetch(`${API_BASE}/explain`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ claim: claim||"", context_text: contextText||"", language: detectedLang||"en" }),
      });
      let data;
      try { data = await resp.json(); } catch { throw new Error(`Server error ${resp.status}`); }
      if (!resp.ok) throw new Error(data.detail || `Error ${resp.status}`);
      setText(data.explanation);
    } catch (e) { setErr(e.message); setOpen(false); }
    finally { setLd(false); }
  };

  const handle = (target) => translate(target, { summary: text||"", reasoning:"", target, source_language: detectedLang||"en" });

  return (
    <div style={{ marginTop:16 }}>
      <button onClick={fetch_}
        style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px", borderRadius:10,
          fontSize:13, fontWeight:600, cursor: loading?"wait":"pointer", transition:"all 0.18s ease",
          background: open ? "#111827" : "#F9FAFB",
          color:      open ? "#F9FAFB" : "#374151",
          border:    `1.5px solid ${open ? "#111827" : "#E5E7EB"}`,
          opacity: loading ? 0.75 : 1 }}>
        {loading ? <><Spinner /> Loading background…</> : open ? "▲ Hide details" : "▼ Full background"}
      </button>

      {error && <div style={{ marginTop:10, fontSize:13, color:"#DC2626", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:8, padding:"8px 12px" }}>⚠ {error}</div>}

      <div style={{ display:"grid", gridTemplateRows: open && text ? "1fr" : "0fr", transition:"grid-template-rows 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ overflow:"hidden" }}>
          {text && (
            <div style={{ marginTop:16, background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:14, padding:"20px 22px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:"#111827", color:"#F9FAFB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>ℹ</span>
                <Eyebrow>Background & context</Eyebrow>
              </div>
              <p style={{ lineHeight:1.9, fontSize:14, color:"#374151" }}>{text}</p>

              <TranslateBar detectedLang={detectedLang} onTranslate={handle} loading={tl} errors={te} active={active} />
              {active && cache[active] && (
                <TranslatedBlock target={active} data={cache[active]}
                  fields={[{ label:"Background & context", text: cache[active].summary }]} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── article card ──────────────────────────────────────────────────────────────
function ArticleCard({ article, index }) {
  const [ref, inView] = useInView(0.06);
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const cfg = getVerdictConfig("unclear");

  return (
    <div ref={ref} style={{ opacity:inView?1:0, transform:inView?"translateY(0)":"translateY(24px)", transition:`opacity 0.55s ease ${index*80}ms, transform 0.55s ease ${index*80}ms` }}>
      <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:20, padding:"24px 26px", marginBottom:16,
        transition:"box-shadow 0.25s ease, transform 0.25s ease" }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="translateY(0)"; }}>

        {/* Header row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"#6B7280" }}>{article.source}</span>
            <Pill color="#065F46" bg="#ECFDF5" border="#6EE7B7">
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", display:"inline-block", flexShrink:0 }} />
              Trusted · {article.score} pts
            </Pill>
          </div>
          <a href={article.url} target="_blank" rel="noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10,
              fontSize:12, fontWeight:700, color:"#111827", textDecoration:"none",
              background:"#F9FAFB", border:"1.5px solid #E5E7EB", flexShrink:0, transition:"all 0.18s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background="#111827"; e.currentTarget.style.color="#F9FAFB"; }}
            onMouseLeave={e => { e.currentTarget.style.background="#F9FAFB"; e.currentTarget.style.color="#111827"; }}>
            Open ↗
          </a>
        </div>

        {/* Title + snippet */}
        <h3 style={{ fontSize:17, fontWeight:700, lineHeight:1.4, color:"#111827", marginBottom:10 }}>{article.title}</h3>
        <p style={{ fontSize:14, color:"#6B7280", lineHeight:1.75, marginBottom:16 }}>{article.snippet}</p>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)}
          style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:10,
            fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.18s ease", outline:"none",
            background: expanded ? "#111827" : "transparent",
            color:      expanded ? "#F9FAFB" : "#111827",
            border:    `1.5px solid ${expanded ? "#111827" : "#E5E7EB"}` }}>
          {expanded ? "Hide article ▲" : "Read article ▼"}
        </button>

        {/* Expanded text */}
        <div style={{ display:"grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition:"grid-template-rows 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ overflow:"hidden" }}>
            <div style={{ marginTop:20, background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:12, padding:18, lineHeight:1.85, fontSize:14, color:"#374151", whiteSpace:"pre-wrap", maxHeight:340, overflowY:"auto" }}>
              {showFull ? article.full_text : `${article.full_text?.slice(0, 700)}…`}
            </div>
            <button onClick={() => setShowFull(!showFull)}
              style={{ marginTop:10, border:"none", background:"transparent", cursor:"pointer", fontWeight:700, fontSize:13, color:"#9CA3AF" }}>
              {showFull ? "Show less ▲" : "Show more ▼"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── fade section wrapper ──────────────────────────────────────────────────────
function Fade({ children, delay = 0 }) {
  const [ref, inView] = useInView(0.08);
  return (
    <div ref={ref} style={{ opacity:inView?1:0, transform:inView?"translateY(0)":"translateY(20px)", transition:`opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ── card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:20, padding:"28px 30px", marginBottom:20, ...style }}>
      {children}
    </div>
  );
}

// ── pdf download ──────────────────────────────────────────────────────────────
function downloadPDF(verdict, recency, confidence, analysis, searchResults) {
  import("jspdf").then(({ default: jsPDF }) => {
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    const pw = doc.internal.pageSize.getWidth();
    const m = 48; const mw = pw - m * 2;
    let y = 60;
    const line = (text, fs, bold, color=[40,40,40]) => {
      doc.setFontSize(fs); doc.setFont("helvetica", bold?"bold":"normal"); doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text||""), mw);
      doc.text(lines, m, y); y += lines.length * (fs * 1.45) + 4;
    };
    const hr = () => { y += 10; doc.setDrawColor(230,230,228); doc.line(m,y,pw-m,y); y += 16; };

    doc.setFillColor(17,24,39); doc.roundedRect(m-16,y-20,mw+32,64,8,8,"F");
    doc.setTextColor(249,250,251); doc.setFontSize(20); doc.setFont("helvetica","bold");
    doc.text("SUSCAN — Fact Check Report", m, y+10);
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(156,163,175);
    doc.text(`Generated ${new Date().toLocaleString()}`, m, y+28); y += 76;

    line("VERDICT", 9, true, [156,163,175]); line(verdict.toUpperCase(), 18, true); hr();
    line("EVENT RECENCY", 9, true, [156,163,175]); line(`${recency.label} — ${recency.sub}`, 13, false); hr();
    line("TRUTH SCORE", 9, true, [156,163,175]); line(`${confidence}/100`, 13, false); hr();
    line("SUMMARY", 9, true, [156,163,175]); line(analysis.summary||"—", 11, false, [80,80,78]); hr();
    line("AI REASONING", 9, true, [156,163,175]); line(analysis.reasoning||"—", 11, false, [80,80,78]); hr();
    line("SOURCES", 9, true, [156,163,175]);
    searchResults.forEach((s, i) => {
      line(`${i+1}. ${s.source} — ${s.title}`, 11, false, [60,60,58]);
      if (s.url) { doc.setTextColor(59,130,246); doc.setFontSize(10); doc.setFont("helvetica","normal"); const ul=doc.splitTextToSize(s.url,mw-20); doc.text(ul,m+16,y); y+=ul.length*13+4; }
      y += 3;
    });
    doc.save("suscan-report.pdf");
  });
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ResultPage() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);

  const result        = location.state?.result;
  const data          = result?.data;
  const searchResults = data?.search_results || [];
  const analysis      = data?.analysis       || {};
  const verdict       = analysis.final_verdict    || "unclear";
  const confidence    = analysis.truth_score      || 0;
  const detectedLang  = analysis.detected_language || null;
  const vc = getVerdictConfig(verdict);
  const rc = getRecencyConfig(analysis.event_recency);

  const contextText = searchResults.slice(0, 3).map(r =>
    `SOURCE: ${r.source}\nTITLE: ${r.title}\nSNIPPET: ${r.snippet}`
  ).join("\n\n---\n\n");

  if (!result || !data) {
    return (
      <div style={{ minHeight:"100vh", background:"#F9FAFB", fontFamily:"system-ui, sans-serif" }}>
        <Navbar />
        <div style={{ padding:"120px 24px", textAlign:"center" }}>
          <div style={{ fontSize:56, marginBottom:20 }}>🔍</div>
          <h2 style={{ fontSize:30, fontWeight:800, marginBottom:12, color:"#111827" }}>No result found</h2>
          <p style={{ color:"#6B7280", marginBottom:28, fontSize:15 }}>Something went wrong. Head back and try again.</p>
          <button onClick={() => navigate("/")} style={{ background:"#111827", color:"#F9FAFB", border:"none", borderRadius:12, padding:"13px 28px", cursor:"pointer", fontWeight:700, fontSize:14 }}>
            ← Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F9FAFB", fontFamily:"'Inter', system-ui, sans-serif", color:"#111827", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        button:focus { outline:2px solid #6366F1; outline-offset:2px; }
        ::-webkit-scrollbar { width:5px; } ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#E5E7EB; border-radius:99px; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth:860, margin:"0 auto", padding:"40px 20px 100px" }}>

        {/* ── top bar ── */}
        <div style={{ opacity:ready?1:0, transform:ready?"translateY(0)":"translateY(12px)", transition:"all 0.5s ease", display:"flex", gap:10, marginBottom:36, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => navigate("/")}
            style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10, fontSize:13, fontWeight:600, color:"#374151", background:"#fff", border:"1.5px solid #E5E7EB", cursor:"pointer", transition:"all 0.18s ease" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="#111827"; e.currentTarget.style.color="#111827"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="#E5E7EB"; e.currentTarget.style.color="#374151"; }}>
            ← Back
          </button>
          <button onClick={() => downloadPDF(verdict, rc, confidence, analysis, searchResults)}
            style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10, fontSize:13, fontWeight:600, color:"#111827", background:"#fff", border:"1.5px solid #E5E7EB", cursor:"pointer", transition:"all 0.18s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background="#111827"; e.currentTarget.style.color="#F9FAFB"; e.currentTarget.style.borderColor="#111827"; }}
            onMouseLeave={e => { e.currentTarget.style.background="#fff"; e.currentTarget.style.color="#111827"; e.currentTarget.style.borderColor="#E5E7EB"; }}>
            ↓ Download report
          </button>
          <div style={{ marginLeft:"auto" }}>
            <Eyebrow>Fact check report</Eyebrow>
          </div>
        </div>

        {/* ── VERDICT HERO ── */}
        <Fade delay={60}>
          <div style={{ background:vc.bg, border:`1.5px solid ${vc.border}`, borderRadius:24, padding:"32px 30px", marginBottom:20, position:"relative", overflow:"hidden" }}>
            {/* background ring decoration */}
            <div style={{ position:"absolute", right:-40, top:-40, width:180, height:180, borderRadius:"50%", border:`24px solid ${vc.border}`, opacity:0.3, pointerEvents:"none" }} />

            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:24 }}>
              {/* verdict */}
              <div>
                <Eyebrow>Final verdict</Eyebrow>
                <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:6 }}>
                  <span style={{ width:48, height:48, borderRadius:"50%", background:vc.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800, flexShrink:0 }}>{vc.icon}</span>
                  <span style={{ fontSize:36, fontWeight:800, color:vc.color, letterSpacing:"-1px" }}>{vc.label}</span>
                </div>
              </div>

              {/* recency */}
              <div style={{ textAlign:"center" }}>
                <Eyebrow>Event recency</Eyebrow>
                <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginTop:6, background:"#fff", border:`1.5px solid ${rc.dot}30`, borderRadius:14, padding:"12px 20px" }}>
                  <span className="pulse" style={{ width:9, height:9, borderRadius:"50%", background:rc.dot, display:"inline-block", animation:"pulse 2s ease-in-out infinite", flexShrink:0 }} />
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:rc.color, lineHeight:1.2 }}>{rc.label}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF", marginTop:3 }}>{rc.sub}</div>
                  </div>
                </div>
              </div>

              {/* score */}
              <div style={{ textAlign:"center" }}>
                <Eyebrow>Truth score</Eyebrow>
                <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:14 }}>
                  <ScoreRing score={confidence} color={vc.ring} />
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:13, color:"#6B7280", fontWeight:600, marginTop:4 }}>
                      {confidence >= 70 ? "High agreement" : confidence >= 40 ? "Moderate" : "Low agreement"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* bias tags */}
            {analysis.bias_detected && analysis.bias_types?.length > 0 && (
              <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${vc.border}` }}>
                <Eyebrow>Bias detected</Eyebrow>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                  {analysis.bias_types.map((b, i) => (
                    <Pill key={i} color="#92400E" bg="#FFFBEB" border="#FDE68A">{b}</Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Fade>

        {/* ── AI ANALYSIS ── */}
        <Fade delay={100}>
          <Card>
            <Eyebrow>AI analysis</Eyebrow>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:24 }}>What the AI found</h2>

            {/* summary */}
            <div style={{ marginBottom:20 }}>
              <Eyebrow>Neutral summary</Eyebrow>
              <div style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:12, padding:"16px 18px", lineHeight:1.85, fontSize:14, color:"#374151" }}>
                {analysis.summary || "No summary available."}
              </div>
              <DetailSection claim={data.cleaned_text||data.raw_text||""} contextText={contextText} detectedLang={detectedLang} />
            </div>

            <Divider />

            {/* reasoning */}
            <div>
              <Eyebrow>AI reasoning</Eyebrow>
              <div style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:12, padding:"16px 18px", lineHeight:1.85, fontSize:14, color:"#374151" }}>
                {analysis.reasoning || "No reasoning available."}
              </div>
            </div>

            {/* missing context */}
            {analysis.missing_context && analysis.missing_context !== "Not available" && (
              <>
                <Divider />
                <div>
                  <Eyebrow>Missing context</Eyebrow>
                  <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, padding:"14px 16px", lineHeight:1.8, fontSize:14, color:"#92400E" }}>
                    {analysis.missing_context}
                  </div>
                </div>
              </>
            )}

            {/* translation */}
            <AnalysisPanel detectedLang={detectedLang} summary={analysis.summary} reasoning={analysis.reasoning} />
          </Card>
        </Fade>

        {/* ── SOURCES ── */}
        <Fade delay={140}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:18 }}>
            <div>
              <Eyebrow>Source coverage</Eyebrow>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#111827" }}>Verified against {searchResults.length} source{searchResults.length !== 1 ? "s" : ""}</h2>
            </div>
          </div>
        </Fade>

        {searchResults.length === 0 && (
          <Fade delay={160}>
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:20, padding:"40px 30px", textAlign:"center", color:"#6B7280" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
              <p style={{ fontWeight:600, fontSize:15 }}>No sources found for this claim.</p>
              <p style={{ fontSize:13, marginTop:6 }}>Try a different query or check your SerpAPI quota.</p>
            </div>
          </Fade>
        )}

        {searchResults.map((article, i) => (
          <ArticleCard key={i} article={article} index={i} />
        ))}

        {/* ── CTA ── */}
        <Fade delay={60}>
          <div style={{ marginTop:48, textAlign:"center" }}>
            <p style={{ fontSize:14, color:"#9CA3AF", marginBottom:20 }}>Have another claim to verify?</p>
            <button onClick={() => navigate("/")}
              style={{ background:"#111827", color:"#F9FAFB", border:"none", borderRadius:14, padding:"14px 32px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s ease", boxShadow:"0 4px 16px rgba(17,24,39,0.15)" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(17,24,39,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 16px rgba(17,24,39,0.15)"; }}>
              Check another claim →
            </button>
          </div>
        </Fade>

      </main>
    </div>
  );
}