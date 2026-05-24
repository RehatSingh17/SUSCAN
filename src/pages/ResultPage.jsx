import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

// ─────────────────────────────────────────────
// Shared API base — change once for dev vs prod
// ─────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000";

// ── Intersection Observer hook ────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

// ── Animated score counter ────────────────────────────────────────────────────
function ScoreCounter({ target, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  useEffect(() => { const t = setTimeout(() => setStarted(true), 600); return () => clearTimeout(t); }, []);
  return <>{val}</>;
}

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ article, index }) {
  const [ref, inView] = useInView(0.08);
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(36px)", transition: `opacity 0.65s ease ${index * 90}ms, transform 0.65s ease ${index * 90}ms` }}>
      <div className="article-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888780", letterSpacing: "0.07em", marginBottom: 6 }}>{article.source}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#D1FAE5", color: "#065F46", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Trusted · Score {article.score}
            </div>
          </div>
          <a href={article.url} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#1A1A18", textDecoration: "none", transition: "all 0.2s ease", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F7F6F2"; e.currentTarget.style.color = "#1A1A18"; }}>
            Visit ↗
          </a>
        </div>
        <h3 style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", lineHeight: 1.35, color: "#1A1A18", marginBottom: 14 }}>{article.title}</h3>
        <p style={{ fontSize: 14, color: "#666460", lineHeight: 1.8, marginBottom: 20 }}>{article.snippet}</p>
        <button onClick={() => setExpanded(!expanded)} className="expand-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: expanded ? "#1A1A18" : "transparent", color: expanded ? "#FAFAF8" : "#1A1A18", border: "1.5px solid #1A1A18", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease" }}>
          {expanded ? "Hide Article ▲" : "Read Full Article ▼"}
        </button>
        <div style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: "grid-template-rows 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 24, background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 14, padding: 20, lineHeight: 1.85, fontSize: 14, color: "#444", whiteSpace: "pre-wrap", maxHeight: 380, overflowY: "auto" }}>
              {showFull ? article.full_text : `${article.full_text?.slice(0, 800)}...`}
            </div>
            <button onClick={() => setShowFull(!showFull)} style={{ marginTop: 12, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#888780" }}>
              {showFull ? "Show Less ▲" : "Show More ▼"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function FadeSection({ children, delay = 0, threshold = 0.1 }) {
  const [ref, inView] = useInView(threshold);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(30px)", transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared helpers for translation UI
// ─────────────────────────────────────────────
function TranslateButton({ label, isActive, isLoading, hasTranslation, onClick }) {
  return (
    <button onClick={onClick} disabled={isLoading}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: isActive ? "#1A1A18" : "#F7F6F2", color: isActive ? "#FAFAF8" : "#1A1A18", border: `1.5px solid ${isActive ? "#1A1A18" : "#EEEDE8"}`, borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: isLoading ? "wait" : "pointer", transition: "all 0.2s ease", opacity: isLoading ? 0.7 : 1 }}
      onMouseEnter={e => { if (!isActive && !isLoading) e.currentTarget.style.borderColor = "#1A1A18"; }}
      onMouseLeave={e => { if (!isActive && !isLoading) e.currentTarget.style.borderColor = "#EEEDE8"; }}>
      {isLoading
        ? <><SpinnerIcon /> Translating…</>
        : <>{label}{hasTranslation && <span style={{ fontSize: 10, opacity: 0.6 }}>{isActive ? "▲" : "▼"}</span>}</>
      }
    </button>
  );
}

function SpinnerIcon() {
  return <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ marginTop: 12, background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#991B1B", fontWeight: 600 }}>
      ⚠ Translation failed: {msg}
    </div>
  );
}

function TranslatedTextBlock({ target, label, fields }) {
  // fields: array of { eyebrow, text }
  const isHi = target === "hi";
  const accent = isHi ? { bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" } : { bg: "#F0F9FF", border: "#BAE6FD", color: "#0369A1" };
  return (
    <div style={{ marginTop: 20, background: accent.bg, border: `1px solid ${accent.border}`, borderRadius: 16, padding: 24, animation: "fadeSlideIn 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: accent.color }}>{label.toUpperCase()} TRANSLATION</span>
        <div style={{ height: 1, flex: 1, background: accent.border }} />
      </div>
      {fields.map(({ eyebrow, text }, i) => text ? (
        <div key={i} style={{ marginBottom: i < fields.length - 1 ? 20 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#AEADA6", letterSpacing: "0.08em", marginBottom: 8 }}>{eyebrow}</div>
          <div style={{ background: "#fff", border: `1px solid ${accent.border}`, borderRadius: 12, padding: "16px 18px", lineHeight: 1.85, fontSize: 14, color: "#444" }}>{text}</div>
        </div>
      ) : null)}
    </div>
  );
}

// ── Generic translation hook ──────────────────────────────────────────────────
function useTranslation() {
  const [translations, setTranslations] = useState({});
  const [loading, setLoading]           = useState({});
  const [errors, setErrors]             = useState({});
  const [active, setActive]             = useState(null);

  // BUG FIX #2: robust error handling — catches non-JSON 404 responses
  const translate = async (target, payload) => {
    if (translations[target]) { setActive(p => p === target ? null : target); return; }
    setLoading(p => ({ ...p, [target]: true }));
    setErrors(p => ({ ...p, [target]: null }));
    setActive(target);
    try {
      const resp = await fetch(`${API_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // BUG FIX: try parsing JSON even on error; fall back to status text
      let data;
      try { data = await resp.json(); } catch { throw new Error(`Server error ${resp.status}: ${resp.statusText}`); }
      if (!resp.ok) throw new Error(data.detail || `Error ${resp.status}`);
      setTranslations(p => ({ ...p, [target]: data }));
    } catch (err) {
      setErrors(p => ({ ...p, [target]: err.message }));
      setActive(null);
    } finally {
      setLoading(p => ({ ...p, [target]: false }));
    }
  };

  return { translations, loading, errors, active, translate };
}

// ── Translation button row ────────────────────────────────────────────────────
function TranslationButtons({ detectedLang, onTranslate, loading, errors, active, translations }) {
  if (!detectedLang || detectedLang === "unknown") return null;
  const showEn = detectedLang !== "en";
  const showHi = detectedLang !== "hi";
  if (!showEn && !showHi) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ height: 1, flex: 1, background: "#EEEDE8" }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#AEADA6" }}>TRANSLATE ANALYSIS</span>
        <div style={{ height: 1, flex: 1, background: "#EEEDE8" }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {showEn && <TranslateButton label="🇬🇧 Translate to English" target="en" isActive={active === "en"} isLoading={loading["en"]} hasTranslation={!!translations["en"]} onClick={() => onTranslate("en")} />}
        {showHi && <TranslateButton label="🇮🇳 हिंदी में अनुवाद करें" target="hi" isActive={active === "hi"} isLoading={loading["hi"]} hasTranslation={!!translations["hi"]} onClick={() => onTranslate("hi")} />}
      </div>
      {errors["en"] && <ErrorBanner msg={errors["en"]} />}
      {errors["hi"] && <ErrorBanner msg={errors["hi"]} />}
    </div>
  );
}

// ── Translation Panel (summary + reasoning) ───────────────────────────────────
function AnalysisTranslationPanel({ detectedLang, originalSummary, originalReasoning }) {
  const { translations, loading, errors, active, translate } = useTranslation();
  const LABELS = { en: "English", hi: "हिंदी" };

  const handleTranslate = (target) => translate(target, {
    summary:         originalSummary   || "",
    reasoning:       originalReasoning || "",
    target,
    source_language: detectedLang,
  });

  return (
    <>
      <TranslationButtons
        detectedLang={detectedLang}
        onTranslate={handleTranslate}
        loading={loading} errors={errors} active={active} translations={translations}
      />
      {active && translations[active] && (
        <TranslatedTextBlock
          target={active}
          label={LABELS[active]}
          fields={[
            { eyebrow: "NEUTRAL SUMMARY",  text: translations[active].summary   },
            { eyebrow: "AI REASONING",     text: translations[active].reasoning },
          ]}
        />
      )}
    </>
  );
}

// ── Detail Section (new — bug fix #4) ────────────────────────────────────────
// Expandable section below summary with a full neutral background explanation.
// Has its own separate translation buttons.
function DetailSection({ claim, contextText, detectedLang }) {
  const [open, setOpen]             = useState(false);
  const [explanation, setExplan]    = useState(null);
  const [loadingExplan, setLoadEx]  = useState(false);
  const [explainErr, setExplainErr] = useState(null);

  // Translation state for the detail section
  const { translations, loading, errors, active, translate } = useTranslation();
  const LABELS = { en: "English", hi: "हिंदी" };

  const fetchExplanation = async () => {
    if (explanation) { setOpen(o => !o); return; }
    setOpen(true);
    setLoadEx(true);
    setExplainErr(null);
    try {
      const resp = await fetch(`${API_BASE}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim:        claim        || "",
          context_text: contextText  || "",
          language:     detectedLang || "en",
        }),
      });
      let data;
      try { data = await resp.json(); } catch { throw new Error(`Server error ${resp.status}`); }
      if (!resp.ok) throw new Error(data.detail || `Error ${resp.status}`);
      setExplan(data.explanation);
    } catch (err) {
      setExplainErr(err.message);
      setOpen(false);
    } finally {
      setLoadEx(false);
    }
  };

  const handleTranslate = (target) => translate(target, {
    summary:         explanation || "",
    reasoning:       "",
    target,
    source_language: detectedLang || "en",
  });

  return (
    <div style={{ marginTop: 24 }}>
      {/* Trigger button */}
      <button
        onClick={fetchExplanation}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: open ? "#1A1A18" : "#F7F6F2", color: open ? "#FAFAF8" : "#1A1A18", border: `1.5px solid ${open ? "#1A1A18" : "#EEEDE8"}`, borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: loadingExplan ? "wait" : "pointer", transition: "all 0.2s ease", opacity: loadingExplan ? 0.7 : 1 }}
        onMouseEnter={e => { if (!open && !loadingExplan) e.currentTarget.style.borderColor = "#1A1A18"; }}
        onMouseLeave={e => { if (!open && !loadingExplan) e.currentTarget.style.borderColor = "#EEEDE8"; }}>
        {loadingExplan
          ? <><SpinnerIcon /> Loading details…</>
          : <>{open ? "▲ Hide Details" : "▼ Detailed Explanation"}</>
        }
      </button>

      {explainErr && <ErrorBanner msg={explainErr} />}

      {/* Expanded content */}
      <div style={{ display: "grid", gridTemplateRows: open && explanation ? "1fr" : "0fr", transition: "grid-template-rows 0.45s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ overflow: "hidden" }}>
          {explanation && (
            <div style={{ marginTop: 20, background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 16, padding: "20px 22px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1A1A18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#FAFAF8", fontSize: 14 }}>ℹ</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#888780" }}>BACKGROUND & CONTEXT</div>
              </div>

              {/* Explanation text */}
              <p style={{ lineHeight: 1.9, fontSize: 15, color: "#444" }}>{explanation}</p>

              {/* Translation for detail section */}
              <TranslationButtons
                detectedLang={detectedLang}
                onTranslate={handleTranslate}
                loading={loading} errors={errors} active={active} translations={translations}
              />
              {active && translations[active] && (
                <TranslatedTextBlock
                  target={active}
                  label={LABELS[active]}
                  fields={[{ eyebrow: "BACKGROUND & CONTEXT", text: translations[active].summary }]}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Result Page ──────────────────────────────────────────────────────────
export default function ResultPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }, []);

  const result        = location.state?.result;
  const data          = result?.data;
  const searchResults = data?.search_results || [];
  const analysis      = data?.analysis       || {};

  const verdict      = analysis.final_verdict    || "unclear";
  const confidence   = analysis.truth_score      || 0;
  const detectedLang = analysis.detected_language || null;

  // Build context text from search results for the explain endpoint
  const contextText = searchResults.slice(0, 3).map(r =>
    `SOURCE: ${r.source}\nTITLE: ${r.title}\nSNIPPET: ${r.snippet}`
  ).join("\n\n---\n\n");

  // ── BUG FIX #1: added "true" and "false" as explicit verdicts ──────────────
  // Previously "true" fell to the default grey ? case.
  // Now "true" and "verified" both map to green, "false" maps to red.
  const getBadgeConfig = (v) => {
    if (v === "true" || v === "verified")
      return { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7", icon: "✓", glow: "rgba(16,185,129,0.15)" };
    if (v === "false")
      return { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", icon: "✗", glow: "rgba(239,68,68,0.12)" };
    if (v === "misleading")
      return { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", icon: "✗", glow: "rgba(239,68,68,0.12)" };
    if (v === "partially misleading")
      return { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A", icon: "⚠", glow: "rgba(245,158,11,0.12)" };
    return { bg: "#E5E7EB", color: "#374151", border: "#D1D5DB", icon: "?", glow: "rgba(107,114,128,0.1)" };
  };

  const badge = getBadgeConfig(verdict);

  const getRecencyTag = (r) => {
    switch (r) {
      case "recent":        return { label: "Recent",        dot: "#10B981", bg: "#D1FAE5", color: "#065F46", desc: "Within the last 7 days" };
      case "not_recent":    return { label: "Not So Recent", dot: "#F59E0B", bg: "#FEF3C7", color: "#92400E", desc: "7–30 days ago" };
      case "long_time_ago": return { label: "Outdated",      dot: "#EF4444", bg: "#FEE2E2", color: "#991B1B", desc: "More than 1 month ago" };
      case "ongoing":       return { label: "Ongoing",       dot: "#3B82F6", bg: "#DBEAFE", color: "#1E40AF", desc: "Still developing" };
      default:              return { label: "Unknown",       dot: "#9CA3AF", bg: "#E5E7EB", color: "#374151", desc: "Recency unclear" };
    }
  };
  const recency = getRecencyTag(analysis.event_recency);

  const handleDownloadPDF = () => {
    import("jspdf").then(({ default: jsPDF }) => {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 48; const maxWidth = pageWidth - margin * 2;
      let y = 60;
      const addText = (text, fontSize, isBold, color = [30, 30, 28]) => {
        doc.setFontSize(fontSize); doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(String(text || ""), maxWidth);
        doc.text(lines, margin, y); y += lines.length * (fontSize * 1.4) + 6;
      };
      const addDivider = () => { y += 8; doc.setDrawColor(220,220,215); doc.line(margin,y,pageWidth-margin,y); y += 16; };
      doc.setFillColor(26,26,24); doc.roundedRect(margin-16,y-20,maxWidth+32,70,10,10,"F");
      doc.setTextColor(250,250,248); doc.setFontSize(22); doc.setFont("helvetica","bold");
      doc.text("SUSCAN — Fact Check Report", margin, y+10);
      doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(180,180,170);
      doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y+30); y += 80;
      addText("FINAL VERDICT", 9, true, [150,148,140]); addText(verdict.toUpperCase(), 20, true); addDivider();
      addText("EVENT RECENCY", 9, true, [150,148,140]); addText(`${recency.label} — ${recency.desc}`, 14, false); addDivider();
      addText("TRUTH SCORE", 9, true, [150,148,140]); addText(`${confidence}%`, 14, false); addDivider();
      addText("NEUTRAL SUMMARY", 9, true, [150,148,140]); addText(analysis.summary || "—", 11, false, [80,80,75]); addDivider();
      addText("AI REASONING", 9, true, [150,148,140]); addText(analysis.reasoning || "—", 11, false, [80,80,75]); addDivider();
      addText("SOURCES USED", 9, true, [150,148,140]);
      searchResults.forEach((src, i) => {
        addText(`${i+1}. ${src.source||"?"} — ${src.title||""}`, 11, false, [60,60,55]);
        if (src.url) { doc.setTextColor(59,130,246); doc.setFontSize(10); doc.setFont("helvetica","normal"); const ul = doc.splitTextToSize(src.url, maxWidth-20); doc.text(ul, margin+16, y); y += ul.length*14+4; }
        y += 4;
      });
      doc.save("suscan-fact-check.pdf");
    });
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!result || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar />
        <div style={{ padding: "120px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, marginBottom: 16, color: "#1A1A18" }}>No analysis found</h2>
          <p style={{ color: "#888780", marginBottom: 32, fontSize: 16 }}>Something went wrong. Head back and try again.</p>
          <button onClick={() => navigate("/")} style={{ background: "#1A1A18", color: "#fff", border: "none", borderRadius: 14, padding: "14px 28px", cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            ← Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .word-reveal { overflow: hidden; display: inline-block; }
        .word-inner { display: inline-block; transform: translateY(110%); transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .word-inner.in { transform: translateY(0); }
        .article-card { background: #fff; border: 1px solid #E2E0D8; border-radius: 22px; padding: 30px; margin-bottom: 20px; transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .article-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.07); transform: translateY(-2px); }
        .glass-card { background: #fff; border: 1px solid #E2E0D8; border-radius: 24px; padding: 32px; margin-bottom: 24px; position: relative; overflow: hidden; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.35)} }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes sweep { from { stroke-dashoffset: 283; } }
        .score-ring { animation: sweep 1.2s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-10px) rotate(4deg)} }
        .float { animation: float 6s ease-in-out infinite; }
        .float2 { animation: float 8s ease-in-out infinite 1.5s; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .section-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #AEADA6; margin-bottom: 8px; }
        .divider { width: 40px; height: 3px; background: #1A1A18; border-radius: 99px; margin-bottom: 16px; }
        .back-btn { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #E2E0D8; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s ease; margin-bottom: 32px; }
        .back-btn:hover { background: #F7F6F2; border-color: #1A1A18; color: #1A1A18; }
        .expand-btn:focus { outline: none; }
      `}</style>

      <Navbar />
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 120px" }}>

        {/* ── HEADER ── */}
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 32, alignItems: "center" }}>
            <button className="back-btn" onClick={() => navigate("/")} style={{ marginBottom: 0 }}>← Back</button>
            <button onClick={handleDownloadPDF}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #1A1A18", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "#1A1A18", cursor: "pointer", transition: "all 0.2s ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1A1A18"; }}>
              ↓ Download Report
            </button>
          </div>
          <div style={{ position: "relative", marginBottom: 48 }}>
            <div className="float" style={{ position: "absolute", top: -20, right: "5%", width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${badge.bg}, ${badge.border})`, opacity: 0.55, filter: "blur(2px)", pointerEvents: "none" }} />
            <div className="float2" style={{ position: "absolute", top: 10, right: "18%", width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", opacity: 0.5, filter: "blur(1px)", pointerEvents: "none" }} />
            <div className="section-eyebrow">FACT CHECK REPORT</div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 6vw, 58px)", lineHeight: 1.1, letterSpacing: "-1.5px", color: "#1A1A18", marginBottom: 14 }}>
              {["Analysis", "Result"].map((word, i) => (
                <span key={i} className="word-reveal" style={{ marginRight: "0.25em" }}>
                  <span className={`word-inner ${visible ? "in" : ""}`} style={{ transitionDelay: `${100 + i * 100}ms`, fontStyle: i === 1 ? "italic" : "normal" }}>{word}</span>
                </span>
              ))}
            </h1>
            <p style={{ fontSize: 16, color: "#888780", lineHeight: 1.7, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 400ms" }}>
              AI verification breakdown using trusted sources.
            </p>
          </div>
        </div>

        {/* ── VERDICT CARD ── */}
        <FadeSection delay={80}>
          <div className="glass-card" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>

              {/* Final Verdict */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14 }}>FINAL VERDICT</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: badge.bg, color: badge.color, border: `1.5px solid ${badge.border}`, padding: "16px 28px", borderRadius: 20, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", boxShadow: `0 8px 24px ${badge.glow}, inset 0 2px 4px rgba(255,255,255,0.4)` }}>
                  <span style={{ fontSize: 24 }}>{badge.icon}</span>
                  {verdict.toUpperCase()}
                </div>
              </div>

              {/* Event Recency */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>EVENT RECENCY</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: recency.bg, color: recency.color, border: `1.5px solid ${recency.dot}40`, borderRadius: 20, padding: "16px 28px", boxShadow: "0 8px 24px rgba(0,0,0,0.03), inset 0 2px 4px rgba(255,255,255,0.4)" }}>
                  <span className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: recency.dot, display: "inline-block", flexShrink: 0 }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{recency.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{recency.desc}</div>
                  </div>
                </div>
              </div>

              {/* Truth Score */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14, justifyContent: "flex-end", display: "flex", alignItems: "center", gap: 6 }}>TRUTH SCORE</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", width: 76, height: 76 }}>
                    <svg width="76" height="76" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#F7F6F2" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={badge.color} strokeWidth="8" strokeLinecap="round" strokeDasharray="263.89" strokeDashoffset={263.89 - (263.89 * confidence) / 100} className="score-ring" />
                    </svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-2px", color: "#1A1A18", lineHeight: 0.9 }}>
                      <ScoreCounter target={confidence} />%
                    </div>
                    <div style={{ fontSize: 13, color: "#888780", marginTop: 6, fontWeight: 600 }}>
                      {confidence >= 70 ? "High agreement" : confidence >= 40 ? "Moderate agreement" : "Low agreement"}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </FadeSection>

        {/* ── AI ANALYSIS ── */}
        <FadeSection delay={120}>
          <div className="glass-card">
            <div className="divider" />
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 32, color: "#1A1A18" }}>AI Analysis</h2>

            {/* Summary */}
            <div style={{ marginBottom: 20 }}>
              <div className="section-eyebrow">NEUTRAL SUMMARY</div>
              <div style={{ background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 16, padding: "20px 22px", lineHeight: 1.85, fontSize: 15, color: "#444" }}>
                {analysis.summary || "No summary available"}
              </div>
              {/* ── BUG FIX #4: Detail expandable section ── */}
              <DetailSection
                claim={data.cleaned_text || data.raw_text || ""}
                contextText={contextText}
                detectedLang={detectedLang}
              />
            </div>

            {/* Reasoning */}
            <div style={{ marginTop: 8 }}>
              <div className="section-eyebrow">AI REASONING</div>
              <div style={{ background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 16, padding: "20px 22px", lineHeight: 1.85, fontSize: 15, color: "#444" }}>
                {analysis.reasoning || "No reasoning available"}
              </div>
            </div>

            {/* Translation panel — summary + reasoning */}
            <AnalysisTranslationPanel
              detectedLang={detectedLang}
              originalSummary={analysis.summary}
              originalReasoning={analysis.reasoning}
            />
          </div>
        </FadeSection>

        {/* ── SOURCES SECTION ── */}
        <FadeSection delay={0}>
          <div style={{ marginTop: 16, marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="divider" />
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#1A1A18" }}>Trusted Source Coverage</h2>
            </div>
            <div style={{ background: "#fff", border: "1px solid #EEEDE8", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#888780" }}>
              {searchResults.length} source{searchResults.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </FadeSection>

        {searchResults.map((article, index) => (
          <ArticleCard key={index} article={article} index={index} />
        ))}

        {/* ── FOOTER CTA ── */}
        <FadeSection delay={100} threshold={0.05}>
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <div style={{ width: 40, height: 3, background: "#1A1A18", borderRadius: 99, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 15, color: "#888780", marginBottom: 24, lineHeight: 1.7 }}>Have another claim to verify?</p>
            <button onClick={() => navigate("/")}
              style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 14, padding: "15px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 8px 24px rgba(26,26,24,0.18)", transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 32px rgba(26,26,24,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,26,24,0.18)"; }}>
              Check another claim →
            </button>
          </div>
        </FadeSection>

      </main>
    </div>
  );
}