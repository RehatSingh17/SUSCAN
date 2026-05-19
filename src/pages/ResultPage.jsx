import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

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
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(t);
  }, []);
  return <>{val}</>;
}

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ article, index }) {
  const [ref, inView] = useInView(0.08);
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.65s ease ${index * 90}ms, transform 0.65s ease ${index * 90}ms`,
      }}
    >
      <div className="article-card">
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888780", letterSpacing: "0.07em", marginBottom: 6 }}>
              {article.source}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#D1FAE5", color: "#065F46", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Trusted · Score {article.score}
            </div>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#F7F6F2", border: "1px solid #EEEDE8",
              borderRadius: 10, padding: "8px 14px",
              fontSize: 12, fontWeight: 700, color: "#1A1A18", textDecoration: "none",
              transition: "all 0.2s ease", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F7F6F2"; e.currentTarget.style.color = "#1A1A18"; }}
          >
            Visit ↗
          </a>
        </div>

        <h3 style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", lineHeight: 1.35, color: "#1A1A18", marginBottom: 14 }}>
          {article.title}
        </h3>

        <p style={{ fontSize: 14, color: "#666460", lineHeight: 1.8, marginBottom: 20 }}>
          {article.snippet}
        </p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="expand-btn"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: expanded ? "#1A1A18" : "transparent",
            color: expanded ? "#FAFAF8" : "#1A1A18",
            border: "1.5px solid #1A1A18",
            borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {expanded ? "Hide Article ▲" : "Read Full Article ▼"}
        </button>

        {/* Expanded text */}
        <div style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 24, background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 14, padding: 20, lineHeight: 1.85, fontSize: 14, color: "#444", whiteSpace: "pre-wrap", maxHeight: 380, overflowY: "auto" }}>
              {showFull ? article.full_text : `${article.full_text?.slice(0, 800)}...`}
            </div>
            <button
              onClick={() => setShowFull(!showFull)}
              style={{ marginTop: 12, border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#888780" }}
            >
              {showFull ? "Show Less ▲" : "Show More ▼"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section wrapper with scroll animation ────────────────────────────────────
function FadeSection({ children, delay = 0, threshold = 0.1 }) {
  const [ref, inView] = useInView(threshold);
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(30px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const result = location.state?.result;
  const data = result?.data;
  const searchResults = data?.search_results || [];
  const analysis = data?.analysis || {};

  const verdict = analysis.final_verdict || "unclear";
  const confidence = analysis.truth_score || 0;

  const getBadgeConfig = (v) => {
    if (v === "verified") return { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7", icon: "✓", glow: "rgba(16,185,129,0.15)" };
    if (v === "misleading") return { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", icon: "✗", glow: "rgba(239,68,68,0.12)" };
    if (v === "partially misleading") return { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A", icon: "⚠", glow: "rgba(245,158,11,0.12)" };
    return { bg: "#E5E7EB", color: "#374151", border: "#D1D5DB", icon: "?", glow: "rgba(107,114,128,0.1)" };
  };

  const badge = getBadgeConfig(verdict);

  const getRecencyTag = (recency) => {
    switch (recency) {
      case "recent": return { label: "Recent", dot: "#10B981", bg: "#D1FAE5", color: "#065F46", desc: "Within the last 7 days" };
      case "not_recent": return { label: "Not So Recent", dot: "#F59E0B", bg: "#FEF3C7", color: "#92400E", desc: "7–30 days ago" };
      case "long_time_ago": return { label: "Outdated", dot: "#EF4444", bg: "#FEE2E2", color: "#991B1B", desc: "More than 1 month ago" };
      case "ongoing": return { label: "Ongoing", dot: "#3B82F6", bg: "#DBEAFE", color: "#1E40AF", desc: "Still developing" };
      default: return { label: "Unknown", dot: "#9CA3AF", bg: "#E5E7EB", color: "#374151", desc: "Recency unclear" };
    }
  };

  const recency = getRecencyTag(analysis.event_recency);

  const handleDownloadPDF = () => {
    import("jspdf").then(({ default: jsPDF }) => {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 48;
      const maxWidth = pageWidth - margin * 2;
      let y = 60;

      const addText = (text, fontSize, isBold, color = [30, 30, 28]) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(String(text || ""), maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * (fontSize * 1.4) + 6;
      };

      const addDivider = () => {
        y += 8;
        doc.setDrawColor(220, 220, 215);
        doc.line(margin, y, pageWidth - margin, y);
        y += 16;
      };

      // ── Header
      doc.setFillColor(26, 26, 24);
      doc.roundedRect(margin - 16, y - 20, maxWidth + 32, 70, 10, 10, "F");
      doc.setTextColor(250, 250, 248);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("SUSCAN — Fact Check Report", margin, y + 10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(180, 180, 170);
      doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y + 30);
      y += 80;

      // ── Final Verdict
      addText("FINAL VERDICT", 9, true, [150, 148, 140]);
      addText(verdict.toUpperCase(), 20, true);
      addDivider();

      // ── Event Recency
      addText("EVENT RECENCY", 9, true, [150, 148, 140]);
      addText(`${recency.label} — ${recency.desc}`, 14, false);
      addDivider();

      // ── Truth Score
      addText("TRUTH SCORE", 9, true, [150, 148, 140]);
      addText(`${confidence}%  (${confidence >= 70 ? "High agreement" : confidence >= 40 ? "Moderate agreement" : "Low agreement"})`, 14, false);
      addDivider();

      addText("NEUTRAL SUMMARY", 9, true, [150, 148, 140]);
      addText(analysis.summary || "No summary available.", 11, false, [80, 80, 75]);
      addDivider();

      // ── AI Reasoning
      addText("AI REASONING", 9, true, [150, 148, 140]);
      addText(analysis.reasoning || "No reasoning available.", 11, false, [80, 80, 75]);
      addDivider();

      // ── Sources
      addText("SOURCES USED", 9, true, [150, 148, 140]);
      if (searchResults.length === 0) {
        addText("No sources found.", 11, false, [80, 80, 75]);
      } else {
        searchResults.forEach((src, i) => {
          addText(`${i + 1}. ${src.source || "Unknown Source"} — ${src.title || ""}`, 11, false, [60, 60, 55]);
          if (src.url) {
            doc.setTextColor(59, 130, 246);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const urlLines = doc.splitTextToSize(src.url, maxWidth - 20);
            doc.text(urlLines, margin + 16, y);
            y += urlLines.length * 14 + 4;
          }
          y += 4;
        });
      }

      doc.save("suscan-fact-check.pdf");
    });
  };

  const scoreColor = confidence >= 70 ? "#065F46" : confidence >= 40 ? "#92400E" : "#991B1B";
  const scoreBg = confidence >= 70 ? "#D1FAE5" : confidence >= 40 ? "#FEF3C7" : "#FEE2E2";

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!result || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar />
        <div style={{ padding: "120px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔍</div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, marginBottom: 16, color: "#1A1A18" }}>No analysis found</h2>
          <p style={{ color: "#888780", marginBottom: 32, fontSize: 16 }}>Something went wrong. Head back and try again.</p>
          <button
            onClick={() => navigate("/")}
            style={{ background: "#1A1A18", color: "#fff", border: "none", borderRadius: 14, padding: "14px 28px", cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}
          >
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

        /* ── Word reveal ── */
        .word-reveal { overflow: hidden; display: inline-block; }
        .word-inner {
          display: inline-block;
          transform: translateY(110%);
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .word-inner.in { transform: translateY(0); }

        /* ── Article card ── */
        .article-card {
          background: #fff;
          border: 1px solid #E2E0D8;
          border-radius: 22px;
          padding: 30px;
          margin-bottom: 20px;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .article-card:hover {
          box-shadow: 0 12px 40px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }

        /* ── Glass card ── */
        .glass-card {
          background: #fff;
          border: 1px solid #E2E0D8;
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }

        /* ── Pill ── */
        .info-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #F7F6F2; border: 1px solid #EEEDE8;
          border-radius: 999px; padding: 7px 16px;
          font-size: 13px; font-weight: 600;
        }

        /* ── Tooltip ── */
        .tip-wrap { position: relative; display: inline-flex; align-items: center; cursor: help; }
        .tip-box {
          visibility: hidden; opacity: 0;
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
          background: #1A1A18; color: #FAFAF8; font-size: 12px;
          padding: 8px 12px; border-radius: 8px; white-space: normal;
          max-width: 200px; text-align: center; line-height: 1.5;
          pointer-events: none; transition: opacity 0.2s ease; z-index: 20;
        }
        .tip-wrap:hover .tip-box { visibility: visible; opacity: 1; }

        /* ── Pulse dot ── */
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.35)} }
        .pulse { animation: pulse 2s ease-in-out infinite; }

        /* ── Radial sweep behind score ── */
        @keyframes sweep {
          from { stroke-dashoffset: 283; }
        }
        .score-ring { animation: sweep 1.2s cubic-bezier(0.16,1,0.3,1) 0.5s both; }

        /* ── Float blobs ── */
        @keyframes float {
          0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-10px) rotate(4deg)}
        }
        .float { animation: float 6s ease-in-out infinite; }
        .float2 { animation: float 8s ease-in-out infinite 1.5s; }

        /* ── Section label ── */
        .section-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #AEADA6; margin-bottom: 8px;
        }

        /* ── Dark section ── */
        .dark-card {
          background: #1A1A18;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
        }
        .dark-grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        /* ── Tag chip ── */
        .tag-chip {
          display: inline-flex; align-items: center;
          border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight: 700;
          background: #F7F6F2; border: 1px solid #EEEDE8; color: #555;
          gap: 6px;
        }

        /* ── Divider ── */
        .divider { width: 40px; height: 3px; background: #1A1A18; border-radius: 99px; margin-bottom: 16px; }

        /* ── Back btn ── */
        .back-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #E2E0D8;
          border-radius: 10px; padding: 9px 16px;
          font-size: 13px; font-weight: 600; color: #666;
          cursor: pointer; transition: all 0.2s ease;
          margin-bottom: 32px;
        }
        .back-btn:hover { background: #F7F6F2; border-color: #1A1A18; color: #1A1A18; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 120px" }}>

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 32, alignItems: "center" }}>
            <button className="back-btn" onClick={() => navigate("/")} style={{ marginBottom: 0 }}>
              ← Back
            </button>
            <button
              onClick={handleDownloadPDF}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#fff", border: "1.5px solid #1A1A18",
                borderRadius: 10, padding: "9px 18px",
                fontSize: 13, fontWeight: 700, color: "#1A1A18",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1A1A18"; }}
            >
              ↓ Download Report
            </button>
          </div>

          {/* Floating accent blobs */}
          <div style={{ position: "relative", marginBottom: 48 }}>
            <div className="float" style={{ position: "absolute", top: -20, right: "5%", width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${badge.bg}, ${badge.border})`, opacity: 0.55, filter: "blur(2px)", pointerEvents: "none" }} />
            <div className="float2" style={{ position: "absolute", top: 10, right: "18%", width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", opacity: 0.5, filter: "blur(1px)", pointerEvents: "none" }} />

            <div className="section-eyebrow">FACT CHECK REPORT</div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 6vw, 58px)", lineHeight: 1.1, letterSpacing: "-1.5px", color: "#1A1A18", marginBottom: 14 }}>
              {["Analysis", "Result"].map((word, i) => (
                <span key={i} className="word-reveal" style={{ marginRight: "0.25em" }}>
                  <span className={`word-inner ${visible ? "in" : ""}`} style={{ transitionDelay: `${100 + i * 100}ms`, fontStyle: i === 1 ? "italic" : "normal" }}>
                    {word}
                  </span>
                </span>
              ))}
            </h1>
            <p style={{
              fontSize: 16, color: "#888780", lineHeight: 1.7,
              opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 400ms",
            }}>
              AI verification breakdown using trusted sources.
            </p>
          </div>
        </div>

        {/* ── VERDICT CARD ────────────────────────────────────────────────────── */}
        <FadeSection delay={80}>
          <div className="glass-card" style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>

              {/* LEFT — verdict */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  FINAL VERDICT
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 14,
                  background: badge.bg, color: badge.color,
                  border: `1.5px solid ${badge.border}`,
                  padding: "16px 28px", borderRadius: 20,
                  fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px",
                  boxShadow: `0 8px 24px ${badge.glow}, inset 0 2px 4px rgba(255,255,255,0.4)`
                }}>
                  <span style={{ fontSize: 24 }}>{badge.icon}</span>
                  {verdict.toUpperCase()}
                </div>
              </div>

              {/* CENTRE — recency */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
                  EVENT RECENCY
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 14,
                  background: recency.bg, color: recency.color,
                  border: `1.5px solid ${recency.dot}40`,
                  borderRadius: 20, padding: "16px 28px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.03), inset 0 2px 4px rgba(255,255,255,0.4)"
                }}>
                  <span className="pulse" style={{ width: 10, height: 10, borderRadius: "50%", background: recency.dot, display: "inline-block", flexShrink: 0 }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>{recency.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{recency.desc}</div>
                  </div>
                </div>
              </div>

              {/* RIGHT — truth score ring */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 14, justifyContent: "flex-end", display: "flex", alignItems: "center", gap: 6 }}>
                  TRUTH SCORE
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 20 }}>
                  {/* SVG ring */}
                  <div style={{ position: "relative", width: 76, height: 76 }}>
                    <svg width="76" height="76" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#F7F6F2" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke={badge.color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="263.89"
                        strokeDashoffset={263.89 - (263.89 * confidence) / 100}
                        className="score-ring"
                      />
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

        {/* ── AI ANALYSIS ─────────────────────────────────────────────────────── */}
        <FadeSection delay={120}>
          <div className="glass-card">
            <div className="divider" />
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, marginBottom: 32, color: "#1A1A18" }}>
              AI Analysis
            </h2>

            {/* Summary */}
            <div style={{ marginBottom: 28 }}>
              <div className="section-eyebrow">NEUTRAL SUMMARY</div>
              <div style={{ background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 16, padding: "20px 22px", lineHeight: 1.85, fontSize: 15, color: "#444" }}>
                {analysis.summary || "No summary available"}
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <div className="section-eyebrow">AI REASONING</div>
              <div style={{ background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 16, padding: "20px 22px", lineHeight: 1.85, fontSize: 15, color: "#444" }}>
                {analysis.reasoning || "No reasoning available"}
              </div>
            </div>
          </div>
        </FadeSection>

        {/* ── SOURCES SECTION ─────────────────────────────────────────────────── */}
        <FadeSection delay={0}>
          <div style={{ marginTop: 16, marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="divider" />
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: "#1A1A18" }}>
                Trusted Source Coverage
              </h2>
            </div>
            <div style={{ background: "#fff", border: "1px solid #EEEDE8", borderRadius: 12, padding: "8px 16px", fontSize: 13, fontWeight: 700, color: "#888780" }}>
              {searchResults.length} source{searchResults.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </FadeSection>

        {searchResults.map((article, index) => (
          <ArticleCard key={index} article={article} index={index} />
        ))}

        {/* ── FOOTER CTA ──────────────────────────────────────────────────────── */}
        <FadeSection delay={100} threshold={0.05}>
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <div style={{ width: 40, height: 3, background: "#1A1A18", borderRadius: 99, margin: "0 auto 20px" }} />
            <p style={{ fontSize: 15, color: "#888780", marginBottom: 24, lineHeight: 1.7 }}>
              Have another claim to verify?
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "#1A1A18", color: "#FAFAF8",
                border: "none", borderRadius: 14, padding: "15px 32px",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 8px 24px rgba(26,26,24,0.18)",
                transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 32px rgba(26,26,24,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(26,26,24,0.18)"; }}
            >
              Check another claim →
            </button>
          </div>
        </FadeSection>

      </main>
    </div>
  );
}