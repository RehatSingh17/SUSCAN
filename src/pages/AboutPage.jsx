import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

// ── Intersection Observer hook for scroll-triggered animations ──────────────
function useInView(threshold = 0.15) {
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

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.3);
  useEffect(() => {
    if (!inView) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Single step in the How It Works section ──────────────────────────────────
function Step({ number, title, desc, delay, icon }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      display: "flex", gap: 20, alignItems: "flex-start",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, background: "#1A1A18",
        color: "#FAFAF8", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 22, flexShrink: 0,
        boxShadow: "0 8px 24px rgba(26,26,24,0.15)",
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 6 }}>
          STEP {number}
        </div>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: "#1A1A18", marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#666460", lineHeight: 1.7 }}>{desc}</p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState(false);
  const [statRef, statInView] = useInView(0.2);
  const [problemRef, problemInView] = useInView();
  const [focusRef, focusInView] = useInView(0.1);
  const [ctaRef, ctaInView] = useInView(0.2);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const stats = [
    { value: 170, suffix: "+", label: "Trusted Sources", sub: "Across India & globally" },
    { value: 10,  suffix: "s", label: "Avg. Analysis Time", sub: "From claim to verdict" },
    { value: 99,  suffix: "%", label: "Uptime", sub: "Always available" },
    { value: 36,  suffix: "+", label: "Indian Regions", sub: "State & UT coverage" },
  ];

  const steps = [
    { icon: "✍️", title: "Submit Your Claim", desc: "Paste any headline, social media post, or article text. Or upload a screenshot — our OCR reads it instantly." },
    { icon: "🔍", title: "We Search Trusted Sources", desc: "SUSCAN queries verified news outlets across India and globally, filtered by your selected region for maximum relevance." },
    { icon: "📰", title: "Articles Are Read & Scored", desc: "Each article is scraped, cleaned, and scored for relevance. Only the most credible, recent sources are used for analysis." },
    { icon: "🤖", title: "AI Delivers the Verdict", desc: "Our AI cross-references sources, detects bias, scores truth, and explains exactly why it reached its conclusion." },
  ];

  const focusFeatures = [
    { icon: "📍", title: "Region-Aware Analysis", desc: "Select any Indian state or UT and SUSCAN prioritizes local trusted outlets — Tribune for Punjab, Deccan Herald for Karnataka, Greater Kashmir for J&K." },
    { icon: "⚖️", title: "Weighted Trust Scores", desc: "Regional sources get higher trust weights for local stories. National stories still cross-reference global outlets for balance." },
    { icon: "🎯", title: "Zero Noise", desc: "Only sources relevant to your chosen regions appear in results. No irrelevant international noise when you need local ground truth." },
    { icon: "🔄", title: "Multi-Region Support", desc: "Select multiple regions at once. Covering a story that spans Punjab, Delhi, and Haryana? Select all three." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Hero word animation ── */
        .word-reveal { overflow: hidden; display: inline-block; }
        .word-inner {
          display: inline-block;
          transform: translateY(100%);
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .word-inner.in { transform: translateY(0); }

        /* ── Stat card ── */
        .stat-card {
          background: #fff;
          border: 1px solid #EEEDE8;
          border-radius: 20px;
          padding: 28px 24px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.07);
        }

        /* ── Feature pill ── */
        .feature-pill {
          background: #fff;
          border: 1px solid #EEEDE8;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.25s ease;
        }
        .feature-pill:hover {
          border-color: #1A1A18;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }

        /* ── Focus mode section ── */
        .focus-section {
          background: #1A1A18;
          border-radius: 28px;
          overflow: hidden;
          position: relative;
        }
        .focus-grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .focus-feature-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 22px;
          transition: background 0.2s ease;
        }
        .focus-feature-card:hover {
          background: rgba(255,255,255,0.09);
        }

        /* ── CTA button ── */
        .cta-btn {
          background: #1A1A18;
          color: #FAFAF8;
          border: none;
          border-radius: 14px;
          padding: 16px 36px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
          letter-spacing: -0.2px;
          box-shadow: 0 4px 16px rgba(26,26,24,0.2);
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,26,24,0.25); }
        .cta-btn:active { transform: scale(0.97); }

        .cta-btn-outline {
          background: transparent;
          color: #1A1A18;
          border: 1.5px solid #E2E0D8;
          border-radius: 14px;
          padding: 16px 36px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cta-btn-outline:hover { border-color: #1A1A18; background: #F7F6F2; }

        /* ── Floating accent ── */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(3deg); }
        }
        .float { animation: float 5s ease-in-out infinite; }
        .float-slow { animation: float 7s ease-in-out infinite 1s; }

        /* ── Section divider ── */
        .divider { width: 48px; height: 3px; background: #1A1A18; border-radius: 99px; margin: 0 auto 20px; }

        /* ── Verdict chip ── */
        .verdict-chip {
          display: inline-flex; align-items: center; gap: 6px;
          border-radius: 99px; padding: 5px 14px;
          font-size: 12px; font-weight: 700;
        }
      `}</style>

      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px 64px", textAlign: "center", position: "relative" }}>

        {/* Floating accent blobs */}
        <div className="float" style={{ position: "absolute", top: 60, left: "5%", width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", opacity: 0.6, filter: "blur(2px)" }} />
        <div className="float-slow" style={{ position: "absolute", top: 40, right: "8%", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", opacity: 0.7, filter: "blur(1px)" }} />
        <div className="float" style={{ position: "absolute", bottom: 20, right: "15%", width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FEE2E2, #FECACA)", opacity: 0.5, filter: "blur(1px)", animationDelay: "2s" }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid #EEEDE8", borderRadius: 99,
          padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#888780",
          marginBottom: 32, letterSpacing: "0.05em",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.5s ease",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
          AI-POWERED FACT CHECKING · INDIA & BEYOND
        </div>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(38px, 7vw, 64px)", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 28 }}>
          {["The", "truth", "deserves", "to", "be", "heard."].map((word, i) => (
            <span key={i} className="word-reveal" style={{ marginRight: "0.25em" }}>
              <span className={`word-inner ${heroVisible ? "in" : ""}`}
                style={{ transitionDelay: `${80 + i * 80}ms`, fontStyle: i === 1 ? "italic" : "normal" }}>
                {word}
              </span>
            </span>
          ))}
        </h1>

        <p style={{
          fontSize: 18, color: "#666460", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.6s ease 600ms",
        }}>
          SUSCAN is India's most precise AI fact-checker — built to cut through misinformation with verified sources, regional intelligence, and transparent reasoning.
        </p>

        {/* Sample verdict chips */}
        <div style={{
          display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
          opacity: heroVisible ? 1 : 0, transition: "opacity 0.6s ease 800ms",
        }}>
          {[
            { label: "✓ VERIFIED", bg: "#D1FAE5", color: "#065F46" },
            { label: "⚠ PARTIALLY MISLEADING", bg: "#FEF3C7", color: "#92400E" },
            { label: "✗ MISLEADING", bg: "#FEE2E2", color: "#991B1B" },
          ].map((v) => (
            <span key={v.label} className="verdict-chip" style={{ background: v.bg, color: v.color }}>
              {v.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px" }}>
        <div ref={statRef} style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16,
          opacity: statInView ? 1 : 0, transform: statInView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
          {stats.map((s, i) => (
            <div key={i} className="stat-card" style={{ transitionDelay: `${i * 80}ms` }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, color: "#1A1A18", lineHeight: 1, marginBottom: 8 }}>
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "#AEADA6" }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        <div ref={problemRef} style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center",
          opacity: problemInView ? 1 : 0, transform: problemInView ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 16 }}>THE PROBLEM</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 4vw, 38px)", lineHeight: 1.2, letterSpacing: "-0.5px", marginBottom: 20, color: "#1A1A18" }}>
              Misinformation moves at the speed of a share.
            </h2>
            <p style={{ fontSize: 15, color: "#666460", lineHeight: 1.8, marginBottom: 16 }}>
              A false headline can circle the globe before a single journalist has had time to verify it. By then, the damage is done — opinions formed, trust broken, decisions made on lies.
            </p>
            <p style={{ fontSize: 15, color: "#666460", lineHeight: 1.8 }}>
              We built SUSCAN because no one should have to spend hours cross-referencing sources just to know if what they read is real.
            </p>
          </div>
          {/* Visual: fake viral headline card */}
          <div style={{ position: "relative" }}>
            <div style={{ background: "#fff", border: "1px solid #EEEDE8", borderRadius: 20, padding: 24, boxShadow: "0 20px 48px rgba(0,0,0,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📱</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1A18" }}>Breaking News Feed</div>
                  <div style={{ fontSize: 11, color: "#AEADA6" }}>2 minutes ago · 47K shares</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: "#1A1A18", lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
                "SHOCKING: India becomes 2nd richest country, overtakes USA by 2025 GDP figures"
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 99, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>✗ MISLEADING</span>
                <span style={{ background: "#F7F6F2", color: "#888780", borderRadius: 99, padding: "4px 12px", fontSize: 11 }}>Truth Score: 12%</span>
              </div>
            </div>
            {/* Decorative dot grid */}
            <div style={{ position: "absolute", bottom: -16, right: -16, width: 80, height: 80, backgroundImage: "radial-gradient(#E2E0D8 1.5px, transparent 1.5px)", backgroundSize: "12px 12px", zIndex: -1 }} />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section style={{ background: "#fff", borderTop: "1px solid #EEEDE8", borderBottom: "1px solid #EEEDE8", padding: "80px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="divider" />
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "-0.5px", color: "#1A1A18", marginBottom: 12 }}>
              How SUSCAN works
            </h2>
            <p style={{ fontSize: 15, color: "#888780", maxWidth: 440, margin: "0 auto" }}>
              Four steps from claim to verdict — no guesswork, no black boxes.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 36 }}>
            {steps.map((s, i) => (
              <Step key={i} number={i + 1} icon={s.icon} title={s.title} desc={s.desc} delay={i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOCUS MODE ───────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "80px 24px" }}>
        <div ref={focusRef} className="focus-section" style={{
          opacity: focusInView ? 1 : 0, transform: focusInView ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div className="focus-grid-bg" />

          <div style={{ position: "relative", padding: "56px 48px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32, marginBottom: 48 }}>
              <div style={{ maxWidth: 480 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 99, padding: "6px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", marginBottom: 20 }}>
                  🎯 NEW FEATURE
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 4vw, 42px)", color: "#FAFAF8", lineHeight: 1.15, letterSpacing: "-0.8px", marginBottom: 16 }}>
                  Introducing <span style={{ fontStyle: "italic" }}>Focus Mode</span>
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
                  SUSCAN now lets you zoom in on any of India's 28 states and 8 Union Territories — so your fact-checks use the most trusted <em>local</em> sources, not just national headlines.
                </p>
              </div>

              {/* Focus mode mini UI mock */}
              <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 20, minWidth: 220 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginBottom: 14 }}>SELECTED REGIONS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Punjab", "Delhi", "Haryana"].map((r) => (
                    <span key={r} style={{ background: "rgba(255,255,255,0.15)", color: "#FAFAF8", borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 600 }}>
                      ✓ {r}
                    </span>
                  ))}
                  <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", borderRadius: 99, padding: "5px 12px", fontSize: 12, border: "1px dashed rgba(255,255,255,0.15)" }}>
                    + Add region
                  </span>
                </div>
                <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Sources active</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6EE7B7" }}>Tribune · HT · Indian Express</div>
                </div>
              </div>
            </div>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {focusFeatures.map((f, i) => (
                <div key={i} className="focus-feature-card">
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FAFAF8", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Coverage strip */}
            <div style={{ marginTop: 36, padding: "16px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", flexShrink: 0 }}>REGIONAL SOURCES INCLUDE</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["The Tribune", "Deccan Herald", "Greater Kashmir", "The Hindu", "Telegraph India", "Northeast Now", "Onmanorama", "Deccan Chronicle"].map((s) => (
                  <span key={s} style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px" }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 100px", textAlign: "center" }}>
        <div ref={ctaRef} style={{
          opacity: ctaInView ? 1 : 0, transform: ctaInView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div className="divider" />
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.2, letterSpacing: "-0.8px", color: "#1A1A18", marginBottom: 16 }}>
            Stop guessing.<br />
            <span style={{ fontStyle: "italic" }}>Start knowing.</span>
          </h2>
          <p style={{ fontSize: 15, color: "#888780", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 36px" }}>
            Every claim you paste into SUSCAN gets cross-referenced against real journalism from outlets you can actually trust.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="cta-btn" onClick={() => navigate("/")}>
              Check a claim now →
            </button>
            <button className="cta-btn-outline" onClick={() => navigate("/")}>
              Try Focus Mode 🎯
            </button>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "#AEADA6" }}>
            No account needed · Free to use · Results in ~10 seconds
          </p>
        </div>
      </section>
    </div>
  );
}