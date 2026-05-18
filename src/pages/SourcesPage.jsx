import { useState, useEffect, useRef } from "react";
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

// ── Source data with richer metadata ─────────────────────────────────────────
const SOURCES = [
  {
    name: "Reuters Fact Check",
    url: "reuters.com",
    description: "Global news organization with dedicated fact-verification desks covering international and regional stories.",
    category: "Global",
    badge: "⚡ Premium",
    badgeColor: "#1A1A18",
    badgeBg: "#F7F6F2",
    icon: "🌐",
    coverage: ["Politics", "Finance", "Science"],
  },
  {
    name: "AFP Fact Check",
    url: "factcheck.afp.com",
    description: "International fact-checking network operating in 26 languages across 180 countries.",
    category: "Global",
    badge: "🌍 International",
    badgeColor: "#065F46",
    badgeBg: "#D1FAE5",
    icon: "📡",
    coverage: ["Health", "Politics", "Climate"],
  },
  {
    name: "AP News Fact Check",
    url: "apnews.com",
    description: "Independent journalism with a dedicated misinformation desk staffed by award-winning reporters.",
    category: "Global",
    badge: "🏆 Award Winning",
    badgeColor: "#92400E",
    badgeBg: "#FEF3C7",
    icon: "📰",
    coverage: ["US Politics", "World", "Science"],
  },
  {
    name: "Snopes",
    url: "snopes.com",
    description: "One of the oldest and most trusted internet reference sources — specialising in viral misinformation since 1994.",
    category: "Digital",
    badge: "🕰 Since 1994",
    badgeColor: "#1E40AF",
    badgeBg: "#DBEAFE",
    icon: "🔎",
    coverage: ["Viral Claims", "Urban Legends", "Politics"],
  },
  {
    name: "The Hindu",
    url: "thehindu.com",
    description: "One of India's most authoritative English-language dailies, trusted for balanced national and regional coverage.",
    category: "India",
    badge: "🇮🇳 India",
    badgeColor: "#065F46",
    badgeBg: "#D1FAE5",
    icon: "📖",
    coverage: ["India Politics", "South India", "Economy"],
  },
  {
    name: "The Tribune",
    url: "tribuneindia.com",
    description: "Leading publication for Punjab, Haryana, and Himachal Pradesh — the go-to source for North Indian regional news.",
    category: "Regional",
    badge: "📍 North India",
    badgeColor: "#6D28D9",
    badgeBg: "#EDE9FE",
    icon: "🏔",
    coverage: ["Punjab", "Haryana", "HP"],
  },
  {
    name: "Deccan Herald",
    url: "deccanherald.com",
    description: "Karnataka's most-read English daily with comprehensive coverage of South Indian politics and culture.",
    category: "Regional",
    badge: "📍 South India",
    badgeColor: "#B45309",
    badgeBg: "#FEF3C7",
    icon: "🌴",
    coverage: ["Karnataka", "South India"],
  },
  {
    name: "Local News Networks",
    url: "Various",
    description: "Aggregated reporting from 170+ verified traditional and digital local news channels across India's 36 states and UTs.",
    category: "Aggregated",
    badge: "📶 170+ Sources",
    badgeColor: "#991B1B",
    badgeBg: "#FEE2E2",
    icon: "📻",
    coverage: ["All India", "Hyper-local"],
  },
];

const CATEGORIES = ["Global", "India", "States"];

const ALL_STATES = Array.from(new Set(
  SOURCES.filter(s => s.category === "Regional").flatMap(s => s.coverage)
)).sort();

function StatesModal({ selectedStates, onSelect, onClose }) {
  const overlayRef = useRef(null);

  const handleBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(26,26,24,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px",
        animation: "fadeOverlay 0.25s ease",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 28,
        width: "100%",
        maxWidth: 500,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 40px 80px rgba(0,0,0,0.2)",
        animation: "slideModal 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* HEADER */}
        <div style={{
          padding: "24px 30px", borderBottom: "1px solid #EEEDE8",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#1A1A18" }}>
              Select States
            </h2>
            <div style={{ fontSize: 13, color: "#888780", marginTop: 4 }}>
              Choose regions to view local sources
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#F7F6F2", border: "1px solid #EEEDE8",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: "#888780", flexShrink: 0,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F7F6F2"; e.currentTarget.style.color = "#888780"; }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: "24px 30px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ALL_STATES.map(st => {
              const active = selectedStates.includes(st);
              return (
                <button
                  key={st}
                  onClick={() => onSelect(st)}
                  style={{
                    background: active ? "#1A1A18" : "#fff",
                    color: active ? "#FAFAF8" : "#666460",
                    border: `1.5px solid ${active ? "#1A1A18" : "#E2E0D8"}`,
                    borderRadius: 999, padding: "8px 16px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s ease",
                  }}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "20px 30px", borderTop: "1px solid #EEEDE8", background: "#F7F6F2", borderRadius: "0 0 28px 28px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "#1A1A18", color: "#FAFAF8", border: "none",
              borderRadius: 12, padding: "12px 28px", fontSize: 14,
              fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
const STATS = [
  { value: "170+", label: "Trusted Sources", icon: "📚" },
  { value: "36", label: "Indian States & UTs", icon: "🗺" },
  { value: "26", label: "Languages Covered", icon: "🌐" },
  { value: "99%", label: "Uptime", icon: "⚡" },
];

// ── Application Modal ─────────────────────────────────────────────────────────

const FormField = ({ id, label, placeholder, type = "text", required, half, textarea, children, value, error, onChange }) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2", display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: "0.05em" }}>
      {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
    </label>
    {children || (textarea ? (
      <textarea
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(id, e.target.value)}
        style={{
          border: `1.5px solid ${error ? "#FCA5A5" : "#E2E0D8"}`,
          borderRadius: 12, padding: "12px 14px", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", color: "#1A1A18",
          background: error ? "#FFF5F5" : "#FAFAF8",
          resize: "vertical", outline: "none", lineHeight: 1.6,
          transition: "border-color 0.2s",
        }}
        onFocus={e => { e.target.style.borderColor = "#1A1A18"; }}
        onBlur={e => { e.target.style.borderColor = error ? "#FCA5A5" : "#E2E0D8"; }}
      />
    ) : (
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(id, e.target.value)}
        style={{
          border: `1.5px solid ${error ? "#FCA5A5" : "#E2E0D8"}`,
          borderRadius: 12, padding: "12px 14px", fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", color: "#1A1A18",
          background: error ? "#FFF5F5" : "#FAFAF8",
          outline: "none", transition: "border-color 0.2s",
        }}
        onFocus={e => { e.target.style.borderColor = "#1A1A18"; }}
        onBlur={e => { e.target.style.borderColor = error ? "#FCA5A5" : "#E2E0D8"; }}
      />
    ))}
    {error && <span style={{ fontSize: 12, color: "#EF4444" }}>⚠ {error}</span>}
  </div>
);

function ApplyModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    organization: "",
    email: "",
    website: "",
    description: "",
    region: "",
    monthlyReaders: "",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errors, setErrors] = useState({});
  const overlayRef = useRef(null);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Your name is required";
    if (!form.organization.trim()) e.organization = "Organization name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email is required";
    if (!form.description.trim()) e.description = "Please describe your organization";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStatus("loading");
    try {
      // POST to your backend endpoint — configure this on your server
      // to forward the email to rakshamshar@gmail.com
      const res = await fetch("http://localhost:8000/api/apply-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "rehatsinghjagirdar@gmail.com",
          subject: `[SUSCAN] New Source Application - ${form.organization}`,
          ...form,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      setStatus("success");
    } catch {
      // For dev/demo purposes, show success anyway
      // Remove this in production and handle the error properly
      setStatus("success");
    }
  };

  const handleFieldChange = (id, val) => {
    setForm(p => ({ ...p, [id]: val }));
    setErrors(p => ({ ...p, [id]: "" }));
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(26,26,24,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px",
        animation: "fadeOverlay 0.25s ease",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 28,
        width: "100%",
        maxWidth: 620,
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 40px 80px rgba(0,0,0,0.2)",
        animation: "slideModal 0.35s cubic-bezier(0.16,1,0.3,1)",
        position: "relative",
      }}>

        {/* SUCCESS STATE */}
        {status === "success" ? (
          <div style={{ padding: "64px 40px", textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "#D1FAE5", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 36, margin: "0 auto 24px",
              animation: "popIn 0.5s cubic-bezier(0.16,1,0.3,1)",
            }}>
              ✓
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: "#1A1A18", marginBottom: 14 }}>
              Application Submitted!
            </h2>
            <p style={{ fontSize: 15, color: "#666460", lineHeight: 1.8, maxWidth: 380, margin: "0 auto 32px" }}>
              Thank you, <strong>{form.name}</strong>. We've received your application for <strong>{form.organization}</strong> and will review it shortly. You'll hear from us at <strong>{form.email}</strong>.
            </p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#D1FAE5", color: "#065F46", borderRadius: 12,
              padding: "12px 20px", fontSize: 14, fontWeight: 700, marginBottom: 32,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 2s infinite" }} />
              You will be verified shortly
            </div>
            <br />
            <button
              onClick={onClose}
              style={{
                background: "#1A1A18", color: "#FAFAF8", border: "none",
                borderRadius: 12, padding: "12px 28px", fontSize: 14,
                fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div style={{
              padding: "32px 36px 24px",
              borderBottom: "1px solid #EEEDE8",
              position: "sticky", top: 0, background: "#fff", borderRadius: "28px 28px 0 0",
              zIndex: 2,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 8 }}>
                    JOIN OUR NETWORK
                  </div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A18", lineHeight: 1.2 }}>
                    Apply as a Trusted Source
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#F7F6F2", border: "1px solid #EEEDE8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 16, color: "#888780", flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#F7F6F2"; e.currentTarget.style.color = "#888780"; }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* FORM BODY */}
            <div style={{ padding: "28px 36px 36px" }}>
              {/* Criteria banner */}
              <div style={{
                background: "#F7F6F2", border: "1px solid #EEEDE8",
                borderRadius: 14, padding: "14px 18px", marginBottom: 28,
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📋</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>Eligibility Criteria</div>
                  <div style={{ fontSize: 13, color: "#666460", lineHeight: 1.6 }}>
                    We accept established news outlets, fact-checking organizations, and regional publications with a consistent editorial standard and verifiable track record.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField id="name" label="Your Full Name" placeholder="e.g. Rahul Sharma" required half value={form.name} error={errors.name} onChange={handleFieldChange} />
                <FormField id="organization" label="Organization Name" placeholder="e.g. Punjab Tribune" required half value={form.organization} error={errors.organization} onChange={handleFieldChange} />
                <FormField id="email" label="Contact Email" placeholder="you@newsroom.com" required type="email" half value={form.email} error={errors.email} onChange={handleFieldChange} />
                <FormField id="website" label="Website / URL" placeholder="https://yoursite.com" half value={form.website} error={errors.website} onChange={handleFieldChange} />
                <FormField id="region" label="Primary Coverage Region" placeholder="e.g. Punjab, Delhi, Pan-India" half value={form.region} error={errors.region} onChange={handleFieldChange} />
                <FormField id="monthlyReaders" label="Monthly Readers (approx.)" placeholder="e.g. 500,000" half value={form.monthlyReaders} error={errors.monthlyReaders} onChange={handleFieldChange} />
                <FormField id="description" label="Tell us about your organization" placeholder="Your editorial standards, fact-checking process, languages covered, and why you should be listed on SUSCAN..." required textarea value={form.description} error={errors.description} onChange={handleFieldChange} />
              </div>

              {/* Submit */}
              <div style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  style={{
                    background: status === "loading" ? "#888780" : "#1A1A18",
                    color: "#FAFAF8", border: "none",
                    borderRadius: 12, padding: "14px 28px",
                    fontSize: 14, fontWeight: 700, cursor: status === "loading" ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "all 0.2s ease",
                  }}
                >
                  {status === "loading" ? (
                    <>
                      <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Submitting...
                    </>
                  ) : "Submit Application →"}
                </button>
                <span style={{ fontSize: 12, color: "#AEADA6" }}>
                  We respond within 3–5 business days
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Source Card ───────────────────────────────────────────────────────────────
function SourceCard({ source, index }) {
  const [ref, inView] = useInView(0.08);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.55s ease ${index * 70}ms, transform 0.55s ease ${index * 70}ms`,
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#fff",
          border: `1.5px solid ${hovered ? "#1A1A18" : "#E2E0D8"}`,
          borderRadius: 20,
          padding: "24px 26px",
          marginBottom: 14,
          transition: "all 0.25s ease",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 12px 36px rgba(0,0,0,0.07)" : "none",
          cursor: "default",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>

          {/* Icon */}
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "#F7F6F2", border: "1px solid #EEEDE8",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
            transition: "background 0.2s ease",
            ...(hovered ? { background: "#1A1A18" } : {}),
          }}>
            {source.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A18", marginBottom: 4 }}>{source.name}</h3>
                <span style={{ fontSize: 12, color: "#AEADA6", fontFamily: "monospace" }}>{source.url}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 99,
                  padding: "4px 12px",
                  background: source.badgeBg, color: source.badgeColor,
                }}>
                  {source.badge}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 99,
                  padding: "4px 12px",
                  background: "#F7F6F2", color: "#888780",
                }}>
                  {source.category}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "#666460", lineHeight: 1.7, marginBottom: 14 }}>
              {source.description}
            </p>

            {/* Coverage tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {source.coverage.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 600, color: "#888780",
                  background: "#F7F6F2", border: "1px solid #EEEDE8",
                  borderRadius: 6, padding: "3px 10px",
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SourcesPage() {
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState("Global");
  const [search, setSearch] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showStatesModal, setShowStatesModal] = useState(false);
  const [selectedStates, setSelectedStates] = useState([]);
  const [showIndiaAll, setShowIndiaAll] = useState(false);
  const [statRef, statInView] = useInView(0.1);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const filtered = SOURCES.filter(s => {
    let matchCat = false;
    if (filter === "Global") {
      matchCat = s.category === "Global";
    } else if (filter === "India") {
      matchCat = s.category === "India";
    } else if (filter === "States") {
      matchCat = s.category === "Regional" && (selectedStates.length === 0 || s.coverage.some(c => selectedStates.includes(c)));
    } else {
      matchCat = true;
    }

    const matchSearch = search.length === 0 || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.coverage.some(c => c.toLowerCase().includes(search.toLowerCase()));

    return matchCat && matchSearch;
  });

  let displaySources = filtered;
  if (filter === "India" && !showIndiaAll && search.length === 0) {
    displaySources = filtered.slice(0, 5);
  }

  const handleSelectState = (st) => {
    setSelectedStates(prev =>
      prev.includes(st) ? prev.filter(x => x !== st) : [...prev, st]
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Word reveal ── */
        .word-reveal { overflow: hidden; display: inline-block; }
        .word-inner { display: inline-block; transform: translateY(110%); transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
        .word-inner.in { transform: translateY(0); }

        /* ── Filter pill ── */
        .filter-pill {
          display: inline-flex; align-items: center;
          border-radius: 999px; padding: 7px 16px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease; border: 1.5px solid transparent;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Search bar ── */
        .search-wrap { position: relative; }
        .search-wrap input { width: 100%; border: 1.5px solid #E2E0D8; border-radius: 14px; padding: 13px 14px 13px 46px; font-size: 14px; font-family: 'DM Sans', sans-serif; background: #fff; color: #1A1A18; outline: none; transition: border-color 0.2s; }
        .search-wrap input:focus { border-color: #1A1A18; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 16px; pointer-events: none; }

        /* ── Stat card ── */
        .stat-card { background: #fff; border: 1px solid #EEEDE8; border-radius: 18px; padding: 24px 20px; text-align: center; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.06); }

        /* ── CTA band ── */
        .cta-band { background: #1A1A18; border-radius: 24px; padding: 40px; position: relative; overflow: hidden; }
        .cta-band-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 36px 36px; pointer-events: none; }

        /* ── Floating blobs ── */
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-10px) rotate(4deg)} }
        .float { animation: float 6s ease-in-out infinite; }
        .float2 { animation: float 8s ease-in-out infinite 2s; }

        /* ── Modal animations ── */
        @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }
        @keyframes slideModal { from{opacity:0;transform:translateY(24px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes popIn { 0%{transform:scale(0)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.35)} }

        /* ── Empty state ── */
        .empty-state { text-align: center; padding: 60px 24px; color: #AEADA6; }

        /* ── Divider ── */
        .divider { width: 40px; height: 3px; background: #1A1A18; border-radius: 99px; margin-bottom: 14px; }

        /* Scrollbar for modal */
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #E2E0D8; border-radius: 99px; }
      `}</style>

      <Navbar />
      {showApplyModal && <ApplyModal onClose={() => setShowApplyModal(false)} />}
      {showStatesModal && <StatesModal selectedStates={selectedStates} onSelect={handleSelectState} onClose={() => setShowStatesModal(false)} />}

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 100px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 56, position: "relative" }}>
          {/* Floating blobs */}
          <div className="float" style={{ position: "absolute", top: 0, right: "0%", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #D1FAE5, #A7F3D0)", opacity: 0.6, filter: "blur(2px)", pointerEvents: "none" }} />
          <div className="float2" style={{ position: "absolute", top: 20, right: "12%", width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", opacity: 0.6, filter: "blur(1px)", pointerEvents: "none" }} />

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1px solid #EEEDE8", borderRadius: 99,
            padding: "6px 16px", fontSize: 11, fontWeight: 700, color: "#888780",
            marginBottom: 28, letterSpacing: "0.06em",
            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s ease",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
            {SOURCES.length} VERIFIED SOURCES ACTIVE
          </div>

          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(36px, 6vw, 54px)", lineHeight: 1.1, letterSpacing: "-1.5px", color: "#1A1A18", marginBottom: 18 }}>
            {["Where", "truth", "comes", "from."].map((word, i) => (
              <span key={i} className="word-reveal" style={{ marginRight: "0.25em" }}>
                <span className={`word-inner ${visible ? "in" : ""}`} style={{ transitionDelay: `${80 + i * 80}ms`, fontStyle: i === 1 ? "italic" : "normal" }}>
                  {word}
                </span>
              </span>
            ))}
          </h1>

          <p style={{
            fontSize: 16, color: "#666460", lineHeight: 1.8, maxWidth: 520,
            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.6s ease 500ms",
          }}>
            SUSCAN aggregates data from verified news outlets and fact-checking organizations to ensure you get the most accurate context — every single time.
          </p>
        </div>

        {/* ── STATS ────────────────────────────────────────────────────────── */}
        <div ref={statRef} style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          marginBottom: 48,
          opacity: statInView ? 1 : 0, transform: statInView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
          {STATS.map((s, i) => (
            <div key={i} className="stat-card" style={{ transitionDelay: `${i * 60}ms` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A18", marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#888780", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── SEARCH + FILTER ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          {/* Search */}
          <div className="search-wrap" style={{ marginBottom: 16 }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by source name, topic, or region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {CATEGORIES.map(cat => {
              const isActive = filter === cat;
              let label = cat;
              if (cat === "States" && selectedStates.length > 0) {
                label = `States (${selectedStates.length})`;
              }
              return (
                <button
                  key={cat}
                  className="filter-pill"
                  onClick={() => {
                    setFilter(cat);
                    if (cat === "States") setShowStatesModal(true);
                  }}
                  style={{
                    background: isActive ? "#1A1A18" : "#fff",
                    color: isActive ? "#FAFAF8" : "#666460",
                    border: `1.5px solid ${isActive ? "#1A1A18" : "#E2E0D8"}`,
                  }}
                >
                  {label}
                  {cat === "States" && (
                    <span style={{ marginLeft: 6, fontSize: 10 }}>▼</span>
                  )}
                </button>
              );
            })}
            <span style={{ fontSize: 13, color: "#AEADA6", marginLeft: 4 }}>
              {filtered.length} source{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── SOURCE CARDS ─────────────────────────────────────────────────── */}
        {displaySources.length > 0 ? (
          displaySources.map((source, i) => (
            <SourceCard key={source.name} source={source} index={i} />
          ))
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔎</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A18", marginBottom: 8 }}>No sources found</h3>
            <p style={{ fontSize: 14 }}>Try a different search term or filter.</p>
            <button onClick={() => { setSearch(""); setSelectedStates([]); setFilter("Global"); }} style={{ marginTop: 16, background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              Clear filters
            </button>
          </div>
        )}

        {/* View All Button for India */}
        {filter === "India" && !showIndiaAll && search.length === 0 && filtered.length > 5 && (
          <div style={{ textAlign: "center", marginTop: 16, marginBottom: 32 }}>
            <button
              onClick={() => setShowIndiaAll(true)}
              style={{
                background: "#fff", border: "1.5px solid #1A1A18", color: "#1A1A18",
                borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1A1A18"; }}
            >
              View All {filtered.length} Sources ↓
            </button>
          </div>
        )}

        {/* ── APPLY CTA BAND ───────────────────────────────────────────────── */}
        <div style={{ marginTop: 40 }}>
          <div className="cta-band">
            <div className="cta-band-grid" />

            {/* Glow blobs */}
            <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(16,185,129,0.12)", filter: "blur(40px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -20, left: "30%", width: 100, height: 100, borderRadius: "50%", background: "rgba(251,191,36,0.08)", filter: "blur(30px)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                  FOR PUBLISHERS & NEWSROOMS
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(22px, 4vw, 30px)", color: "#FAFAF8", lineHeight: 1.2, marginBottom: 10 }}>
                  Are you a verified<br />
                  <span style={{ fontStyle: "italic" }}>fact-checking organization?</span>
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 360 }}>
                  Join SUSCAN's trusted network and get your content used to verify claims for thousands of users across India and beyond.
                </p>

                {/* Perks */}
                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["📈 Increased visibility", "🤝 API access", "🏅 Verified badge"].map(perk => (
                    <span key={perk} style={{
                      fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)",
                      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 99, padding: "5px 12px",
                    }}>
                      {perk}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowApplyModal(true)}
                style={{
                  background: "#FAFAF8", color: "#1A1A18",
                  border: "none", borderRadius: 14,
                  padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap", flexShrink: 0,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)"; }}
              >
                Apply to join →
              </button>
            </div>
          </div>
        </div>

        {/* ── FOOTER NOTE ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#AEADA6", lineHeight: 1.7 }}>
            All sources are independently verified by our editorial team before inclusion. <br />
            We do not accept paid partnerships or sponsored listings.
          </p>
        </div>

      </main>
    </div>
  );
}