import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { analyseText, analyseImage } from "../api";
import { saveSearchHistory, getUserHistory, deleteHistoryItem } from "../services/historyService";

// ── Constants ─────────────────────────────────────────────────────────────────
const PILL = {
  danger:  { bg: "#FEE2E2", color: "#991B1B", icon: "✗" },
  warn:    { bg: "#FEF3C7", color: "#92400E", icon: "⚠" },
  success: { bg: "#D1FAE5", color: "#065F46", icon: "✓" },
};

const ICON_STYLE = {
  T: { bg: "#EEF2FF", color: "#4338CA" },
  I: { bg: "#FEF3C7", color: "#92400E" },
};

const REGION_GROUPS = [
  { label: "Global", regions: ["International"] },
  {
    label: "States",
    regions: [
      "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
      "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
      "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
      "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
      "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    ],
  },
  {
    label: "Union Territories",
    regions: [
      "Andaman and Nicobar Islands","Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
    ],
  },
];

const TRUST_SOURCES = ["Reuters","AFP","AP News","The Hindu","Tribune","Snopes","Deccan Herald"];

// ── Step definitions for loading overlay ─────────────────────────────────────
const TEXT_STEPS = [
  { label: "Searching trusted sources", icon: "🔍", ms: 0    },
  { label: "Reading articles",          icon: "📰", ms: 2500 },
  { label: "Running AI analysis",       icon: "🤖", ms: 5500 },
  { label: "Building your report",      icon: "✅", ms: 9000 },
];

const IMAGE_STEPS = [
  { label: "Reading image text (OCR)",  icon: "🖼", ms: 0     },
  { label: "Detecting language",        icon: "🌐", ms: 12000 },
  { label: "Searching trusted sources", icon: "🔍", ms: 18000 },
  { label: "Running AI analysis",       icon: "🤖", ms: 26000 },
  { label: "Building your report",      icon: "✅", ms: 34000 },
];

const SLOW_MESSAGES = [
  { ms: 15000, text: "OCR across 5 scripts takes a moment — almost there…"    },
  { ms: 25000, text: "Cross-referencing multiple sources for accuracy…"        },
  { ms: 40000, text: "Taking longer than usual" },
  { ms: 55000, text: "Nearly done — AI is finalising the verdict…"            },
];

// ── Loading Overlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ mode }) {
  const steps        = mode === "Image" ? IMAGE_STEPS : TEXT_STEPS;
  const expectedTime = mode === "Image" ? "30–45 seconds" : "8–15 seconds";

  const [elapsed, setElapsed]       = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [slowMsg, setSlowMsg]       = useState("");
  const startRef = useRef(Date.now());

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Advance step based on elapsed time
  useEffect(() => {
    const ms = elapsed * 1000;
    let step = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (ms >= steps[i].ms) { step = i; break; }
    }
    setActiveStep(step);
  }, [elapsed, steps]);

  // Slow messages
  useEffect(() => {
    const ms = elapsed * 1000;
    let msg = "";
    for (const m of SLOW_MESSAGES) {
      if (ms >= m.ms) msg = m.text;
    }
    setSlowMsg(msg);
  }, [elapsed]);

  const maxMs    = mode === "Image" ? 45000 : 15000;
  const progress = Math.min((elapsed * 1000) / maxMs * 95, 95);
  const fmt      = (s) => `${Math.floor(s / 60) > 0 ? `${Math.floor(s / 60)}m ` : ""}${s % 60}s`;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(26,26,24,0.94)",
      backdropFilter: "blur(12px)",
      zIndex: 2000,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px",
      animation: "fadeInOverlay 0.3s ease",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header label */}
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.3)", marginBottom: 36, textAlign: "center" }}>
        SUSCAN · {mode === "Image" ? "IMAGE ANALYSIS" : "VERIFYING"}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 300, marginBottom: 40 }}>
        {steps.map((step, i) => {
          const done    = activeStep > i;
          const active  = activeStep === i;
          const pending = activeStep < i;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              opacity: pending ? 0.2 : 1,
              transform: active ? "translateX(4px)" : "translateX(0)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: done ? 15 : 18,
                background: done ? "#D1FAE5" : active ? "#FAFAF8" : "rgba(255,255,255,0.07)",
                color: done ? "#065F46" : "inherit",
                transition: "all 0.4s ease",
              }}>
                {done ? "✓" : step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: active ? "#FAFAF8" : done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
                  transition: "all 0.4s ease",
                }}>
                  {step.label}
                </span>
                {active && (
                  <span style={{ display: "inline-block", animation: "blink 1.4s steps(3,end) infinite", letterSpacing: 2, color: "rgba(255,255,255,0.4)", fontSize: 13 }}>...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: 300, marginBottom: 20 }}>
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #10B981, #34D399)",
            width: `${progress}%`,
            transition: "width 1s linear",
          }} />
        </div>
      </div>

      {/* Elapsed + expected */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>
          {fmt(elapsed)} elapsed
        </span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "inline-block" }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
          Usually {expectedTime}
        </span>
      </div>

      {/* Slow message */}
      <div style={{
        height: 36, fontSize: 12, color: "#F59E0B",
        textAlign: "center", maxWidth: 300, lineHeight: 1.6,
        opacity: slowMsg ? 1 : 0, transition: "opacity 0.6s ease",
      }}>
        {slowMsg}
      </div>

      {/* Image upfront notice — shown for first 8s only */}
      {mode === "Image" && elapsed < 8 && (
        <div style={{
          marginTop: 20,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "12px 18px",
          fontSize: 12, color: "rgba(255,255,255,0.4)",
          textAlign: "center", maxWidth: 300, lineHeight: 1.7,
        }}>
          📷 Image analysis reads text in 5 languages —{" "}
          <strong style={{ color: "rgba(255,255,255,0.6)" }}>30–45 seconds</strong> for best accuracy
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef  = useRef(null);

  const [mode, setMode]                       = useState("Text");
  const [text, setText]                       = useState("");
  const [image, setImage]                     = useState(null);
  const [imagePreview, setImagePreview]       = useState(null);
  const [focused, setFocused]                 = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [visible, setVisible]                 = useState(false);
  const [showFocusModal, setShowFocusModal]   = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [activeTab, setActiveTab]             = useState(0);
  const [historyData, setHistoryData]         = useState([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [deletingId, setDeletingId]           = useState(null);
  const [hoveredRowId, setHoveredRowId]       = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showFocusModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showFocusModal]);

  useEffect(() => {
    async function loadHistory() {
      if (!user) { setHistoryData([]); return; }
      setHistoryLoading(true);
      const data = await getUserHistory(user.uid);
      setHistoryData(data);
      setHistoryLoading(false);
    }
    loadHistory();
  }, [user]);

  const toggleRegion = (region) =>
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAnalyse = async () => {
    if (mode === "Text" && !text.trim()) return;
    if (mode === "Image" && !image) return;
    setError("");
    setLoading(true);
    try {
      const userId = user?.uid ?? "anonymous";
      const result = mode === "Text"
        ? await analyseText(text.trim(), userId, selectedRegions)
        : await analyseImage(image, userId, selectedRegions);

      if (user) {
        await saveSearchHistory({
          userId: user.uid,
          inputType: mode.toLowerCase(),
          query: mode === "Text" ? text.trim() : image?.name,
          result,
          focusRegions: selectedRegions,
        });
        const updated = await getUserHistory(user.uid);
        setHistoryData(updated);
      }

      navigate("/result", { state: { result } });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, historyId) => {
    e.stopPropagation();
    if (!historyId || deletingId) return;
    setDeletingId(historyId);
    try {
      await deleteHistoryItem(historyId);
      setHistoryData(prev => prev.filter(h => (h.id ?? h) !== historyId));
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  };

  const charCount   = text.trim() ? text.length : 0;
  const canSubmit   = mode === "Text" ? (charCount > 0 && charCount <= 10000) : image !== null;
  const groupCounts = REGION_GROUPS.map(g =>
    g.regions.filter(r => selectedRegions.includes(r)).length
  );

  function getEntryMeta(h) {
    const verdict = h.result?.data?.analysis?.final_verdict ?? "unclear";
    const labelType =
      verdict === "verified"   ? "success" :
      verdict === "misleading" ? "danger"  : "warn";
    const pill = PILL[labelType];
    const icon = ICON_STYLE[h.inputType === "image" ? "I" : "T"];
    const timeLabel = h.createdAt?.toDate
      ? h.createdAt.toDate().toLocaleDateString("en-IN", {
          day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        })
      : "just now";
    return { verdict, pill, icon, timeLabel };
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", overflowX: "hidden" }}>

      {/* ── LOADING OVERLAY ──────────────────────────────────────────────── */}
      {loading && <LoadingOverlay mode={mode} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .word-reveal { overflow: hidden; display: inline-block; }
        .word-inner  { display: inline-block; transform: translateY(110%); transition: transform 0.75s cubic-bezier(0.16,1,0.3,1); }
        .word-inner.in { transform: translateY(0); }

        .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.in { opacity: 1; transform: translateY(0); }

        @keyframes float  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-12px) rotate(4deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(-3deg)} }
        .blob1 { animation: float  7s ease-in-out infinite; }
        .blob2 { animation: float2 9s ease-in-out infinite 2s; }
        .blob3 { animation: float  6s ease-in-out infinite 4s; }

        @keyframes tickerScroll { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .ticker-track { display: flex; gap: 0; animation: tickerScroll 22s linear infinite; width: max-content; }
        .ticker-track:hover { animation-play-state: paused; }

        .input-card {
          background: #fff; border: 1.5px solid #E2E0D8; border-radius: 24px;
          padding: 28px; transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
        }
        .input-card.focused {
          border-color: #1A1A18;
          box-shadow: 0 20px 48px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03);
          transform: translateY(-3px);
        }

        .mode-btn {
          background: transparent; border: 1.5px solid #E2E0D8; border-radius: 12px;
          padding: 8px 18px; font-size: 13px; font-family: 'DM Sans', sans-serif;
          font-weight: 600; color: #888780; cursor: pointer;
          transition: all 0.2s ease; display: flex; align-items: center; gap: 7px;
        }
        .mode-btn:hover:not(.active) { border-color: #C5C3BB; color: #1A1A18; background: #F7F6F2; }
        .mode-btn.active { background: #1A1A18; color: #FAFAF8; border-color: #1A1A18; box-shadow: 0 4px 14px rgba(26,26,24,0.18); }

        .focus-btn {
          display: flex; align-items: center; gap: 7px;
          background: transparent; border: 1.5px solid #E2E0D8;
          border-radius: 12px; padding: 8px 16px;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          font-weight: 600; color: #888780; cursor: pointer;
          transition: all 0.2s ease; margin-left: auto;
        }
        .focus-btn:hover:not(.has-regions) { border-color: #C5C3BB; color: #1A1A18; }
        .focus-btn.has-regions { background: #1A1A18; color: #FAFAF8; border-color: #1A1A18; box-shadow: 0 4px 14px rgba(26,26,24,0.18); }

        .analyse-btn {
          background: #1A1A18; color: #FAFAF8; border: none;
          border-radius: 14px; padding: 13px 26px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          font-weight: 700; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 4px 14px rgba(26,26,24,0.15); letter-spacing: -0.1px;
        }
        .analyse-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,26,24,0.22); }
        .analyse-btn:active:not(:disabled) { transform: scale(0.97); }
        .analyse-btn:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }

        .sample-pill {
          background: #F7F6F2; border: 1px solid #E5E3DC;
          border-radius: 8px; padding: 5px 10px;
          font-size: 12px; color: #555450; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-weight: 500;
          transition: all 0.18s ease;
        }
        .sample-pill:hover { border-color: #1A1A18; color: #1A1A18; background: #EEEDE8; }

        .drop-zone {
          border: 2px dashed #DDD; border-radius: 16px;
          padding: 44px 20px; text-align: center; cursor: pointer;
          transition: all 0.25s ease;
        }
        .drop-zone:hover { border-color: #1A1A18; background: #F7F6F2; }
        .drop-zone.has-image { border-style: solid; border-color: #EEEDE8; padding: 12px; }

        .history-card { background: #fff; border: 1.5px solid #E2E0D8; border-radius: 20px; padding: 6px; }
        .history-row {
          display: flex; align-items: center; gap: 14px; padding: 14px;
          border-radius: 14px; cursor: pointer; transition: all 0.22s ease;
          border-bottom: 1px solid #F2F1EC; position: relative;
        }
        .history-row:last-child { border-bottom: none; }
        .history-row:hover { background: #F7F6F2; }
        .history-arrow { opacity: 0; transform: translateX(-6px); transition: all 0.2s ease; color: #AEADA6; font-size: 14px; }
        .history-row:hover .history-arrow { opacity: 1; transform: translateX(0); color: #1A1A18; }

        .delete-btn {
          opacity: 0; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: transparent; border: 1.5px solid transparent;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; color: #AEADA6;
          transition: all 0.18s ease; font-family: 'DM Sans', sans-serif;
        }
        .history-row:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #FEE2E2 !important; border-color: #FECACA !important; color: #991B1B !important; }
        .delete-btn.deleting { opacity: 1; background: #FEF2F2; border-color: #FECACA; color: #991B1B; animation: spin 0.7s linear infinite; }

        .group-tab {
          flex: 1; background: none; border: none; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #888780; cursor: pointer;
          padding: 8px 12px; border-radius: 10px;
          transition: all 0.18s ease; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .group-tab:hover:not(.active) { color: #1A1A18; background: rgba(0,0,0,0.04); }
        .group-tab.active { background: #1A1A18; color: #FAFAF8; }
        .tab-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.2); border-radius: 99px; padding: 1px 6px; }
        .tab-badge.dim { background: #E2E0D8; color: #888780; }

        .region-pill {
          border: 1.5px solid #E5E3DC; background: #fff; color: #1A1A18;
          border-radius: 12px; padding: 10px 14px;
          font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: all 0.15s ease;
          text-align: left; display: flex; align-items: center; gap: 9px;
        }
        .region-pill:hover:not(.active) { border-color: #C5C3BB; background: #F7F6F2; }
        .region-pill.active { border-color: #1A1A18; background: #1A1A18; color: #FAFAF8; }
        .check-circle {
          width: 17px; height: 17px; border-radius: 50%;
          border: 1.5px solid #D0CEC7; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 10px;
          transition: all 0.15s ease;
        }
        .region-pill.active .check-circle { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.35); color: #fff; }

        .region-chip {
          background: #1A1A18; color: #FAFAF8; border-radius: 99px;
          padding: 5px 12px; font-size: 12px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; display: inline-flex; align-items: center; gap: 6px;
        }
        .region-chip-x { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; line-height: 1; padding: 0; transition: color 0.15s; }
        .region-chip-x:hover { color: #fff; }

        @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal  { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes blink  { 0%{opacity:0} 50%{opacity:1} 100%{opacity:0} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .skeleton {
          background: linear-gradient(90deg, #F0EFEA 25%, #E5E3DC 50%, #F0EFEA 75%);
          background-size: 400px 100%; animation: shimmer 1.4s ease infinite; border-radius: 8px;
        }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 120px" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "16px 0 0", position: "relative" }}>
          <div className="blob1" style={{ position: "absolute", top: 60, left: "4%", width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)", opacity: 0.55, filter: "blur(3px)", pointerEvents: "none" }} />
          <div className="blob2" style={{ position: "absolute", top: 30, right: "6%", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", opacity: 0.65, filter: "blur(2px)", pointerEvents: "none" }} />
          <div className="blob3" style={{ position: "absolute", bottom: 40, right: "18%", width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#FEE2E2,#FECACA)", opacity: 0.5, filter: "blur(1px)", pointerEvents: "none" }} />

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1px solid #E2E0D8", borderRadius: 99,
            padding: "6px 16px", fontSize: 11, fontWeight: 700, color: "#888780",
            marginBottom: 32, letterSpacing: "0.06em",
            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(14px)",
            transition: "all 0.5s ease", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            AI-POWERED · INDIA & BEYOND
          </div>

          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(38px, 7vw, 62px)", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 22 }}>
            {["Is", "it", "true?"].map((word, i) => (
              <span key={i} className="word-reveal" style={{ marginRight: "0.22em" }}>
                <span className={`word-inner ${visible ? "in" : ""}`} style={{ transitionDelay: `${80 + i * 90}ms` }}>{word}</span>
              </span>
            ))}
            <span className="word-reveal" style={{ marginRight: "0.22em" }}>
              <span className={`word-inner ${visible ? "in" : ""}`} style={{ transitionDelay: "380ms", fontStyle: "italic", color: "#888780", fontWeight: 300 }}>Find out.</span>
            </span>
          </h1>

          <p style={{
            fontSize: 14, color: "#666460", lineHeight: 1.75, maxWidth: "100%", margin: "0 auto 24px",
            opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.6s ease 550ms",
          }}>
            Paste a headline or upload an image. We check it against 170+ trusted sources and deliver a verdict.
          </p>
        </div>

        {/* ── TRUST TICKER ─────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "200ms", marginBottom: 32, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", borderTop: "1px solid #EEEDE8", borderBottom: "1px solid #EEEDE8", padding: "12px 0", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(to right, #FAFAF8, transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(to left, #FAFAF8, transparent)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", whiteSpace: "nowrap", padding: "0 20px", flexShrink: 0, zIndex: 3 }}>SOURCES</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div className="ticker-track">
                {[...TRUST_SOURCES, ...TRUST_SOURCES].map((s, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 24px", fontSize: 13, fontWeight: 600, color: "#888780", whiteSpace: "nowrap" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#D1D5DB", display: "inline-block" }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── INPUT CARD ───────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "120ms" }}>
          <div className={`input-card ${focused || imagePreview ? "focused" : ""}`}>

            {/* Mode + Focus row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 22, alignItems: "center", flexWrap: "wrap" }}>
              <button className={`mode-btn ${mode === "Text" ? "active" : ""}`} onClick={() => { setMode("Text"); setError(""); }}>
                <span>✍️</span> Text / headline
              </button>
              <button className={`mode-btn ${mode === "Image" ? "active" : ""}`} onClick={() => { setMode("Image"); setError(""); }}>
                <span>🖼</span> Upload image
              </button>
              <button className={`focus-btn ${selectedRegions.length > 0 ? "has-regions" : ""}`} onClick={() => setShowFocusModal(true)}>
                <span>🎯</span> Focus Mode
                {selectedRegions.length > 0 && (
                  <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                    {selectedRegions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Image mode hint */}
            {mode === "Image" && !imagePreview && (
              <div style={{ marginBottom: 14, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                <span>⏱</span> Image analysis takes <strong>30–45 seconds</strong> — reads text across 5 language scripts
              </div>
            )}

            {/* Text input */}
            {mode === "Text" && (
              <>
                <div style={{ border: "1.5px solid #EEEDE8", borderRadius: 16, padding: "16px 18px", background: "#FAFAF8", transition: "border-color 0.2s ease", ...(focused ? { borderColor: "#C5C3BB" } : {}) }}>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Paste a headline, article text, or social media post…"
                    style={{ width: "100%", border: "none", outline: "none", fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", background: "transparent", resize: "none", lineHeight: 1.7, minHeight: 108 }}
                  />
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#AEADA6" }}>Try:</span>
                  {["India becomes richest country", "Aliens landed in Delhi", "Govt bans all social media"].map(s => (
                    <button key={s} className="sample-pill" onClick={() => setText(s)}>"{s}"</button>
                  ))}
                </div>
              </>
            )}

            {/* Image input */}
            {mode === "Image" && (
              <div
                className={`drop-zone ${imagePreview ? "has-image" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onMouseEnter={() => setFocused(true)}
                onMouseLeave={() => setFocused(false)}
              >
                {imagePreview ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={imagePreview} alt="preview" style={{ maxHeight: 240, maxWidth: "100%", borderRadius: 12, objectFit: "contain", display: "block" }} />
                    <button
                      onClick={e => { e.stopPropagation(); setImage(null); setImagePreview(null); }}
                      style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: "50%", background: "#1A1A18", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
                    >×</button>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#F0EFEA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>↑</div>
                    <p style={{ fontSize: 15, color: "#444441", fontWeight: 600, marginBottom: 6 }}>Drop an article image here</p>
                    <p style={{ fontSize: 13, color: "#AEADA6" }}>or click to browse · PNG, JPG, WEBP</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
              </div>
            )}

            {/* Region chips */}
            {selectedRegions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 18 }}>
                {selectedRegions.map(region => (
                  <div key={region} className="region-chip">
                    {region}
                    <button className="region-chip-x" onClick={() => toggleRegion(region)}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, borderTop: "1px solid #EEEDE8", marginTop: 18, gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: charCount > 10000 ? "#991B1B" : "#AEADA6", fontFamily: "monospace" }}>
                {mode === "Text"
                  ? `${charCount.toLocaleString()} / 10,000`
                  : image ? `📎 ${image.name}` : "No file selected"}
              </span>
              <button className="analyse-btn" onClick={handleAnalyse} disabled={!canSubmit || loading}>
                {loading ? "Analysing…" : "Analyse claim →"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#991B1B", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>!</span> {error}
            </div>
          )}

          {/* Auth hint */}
          <p style={{ fontSize: 12, color: "#AEADA6", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
            {user ? `Signed in as ${user.displayName ?? user.email}` : "No account needed · Sign in to save history"}
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 750ms" }}>
            {[
              { label: "✓ VERIFIED",             bg: "#D1FAE5", color: "#065F46" },
              { label: "⚠ PARTIALLY MISLEADING", bg: "#FEF3C7", color: "#92400E" },
              { label: "✗ MISLEADING",            bg: "#FEE2E2", color: "#991B1B" },
            ].map(v => (
              <span key={v.label} style={{ display: "inline-flex", alignItems: "center", background: v.bg, color: v.color, borderRadius: 99, padding: "5px 14px", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em" }}>
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "200ms", marginTop: 48 }}>
          <div style={{ background: "#fff", border: "1.5px solid #E2E0D8", borderRadius: 20, padding: "28px 32px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 20 }}>HOW IT WORKS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 24 }}>
              {[
                { icon: "✍️", step: "01", title: "Paste claim",    desc: "Headline, post, or image" },
                { icon: "🔍", step: "02", title: "We search",       desc: "170+ trusted sources" },
                { icon: "🤖", step: "03", title: "AI cross-checks", desc: "Bias & truth scored" },
                { icon: "📊", step: "04", title: "Get verdict",     desc: "Text ~10s · Image ~35s" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#AEADA6", letterSpacing: "0.08em" }}>{s.step}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A18" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "#888780", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RECENT CHECKS ────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "260ms", marginTop: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "0 2px" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 4 }}>HISTORY</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A18", letterSpacing: "-0.2px" }}>Recent Checks</h2>
            </div>
            {user && (
              <button onClick={() => navigate("/history")}
                style={{ background: "none", border: "none", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#888780", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#1A1A18"}
                onMouseLeave={e => e.currentTarget.style.color = "#888780"}>
                View all →
              </button>
            )}
          </div>

          {user ? (
            <div className="history-card">
              {historyLoading && [1,2,3].map(i => (
                <div key={i} className="history-row" style={{ pointerEvents: "none" }}>
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="skeleton" style={{ height: 14, width: "70%" }} />
                    <div className="skeleton" style={{ height: 11, width: "30%" }} />
                  </div>
                  <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 99 }} />
                </div>
              ))}

              {!historyLoading && historyData.length === 0 && (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                  <p style={{ fontSize: 14, color: "#888780", lineHeight: 1.6 }}>No checks yet — analyse your first claim above!</p>
                </div>
              )}

              {!historyLoading && historyData.slice(0, 3).map((h, i) => {
                const { verdict, pill, icon, timeLabel } = getEntryMeta(h);
                const rowId = h.id ?? i;
                const isDeleting = deletingId === rowId;
                return (
                  <div key={rowId} className="history-row"
                    onMouseEnter={() => setHoveredRowId(rowId)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    onClick={() => !isDeleting && navigate("/result", { state: { result: h.result } })}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: icon.color }}>
                      {h.inputType === "image" ? "I" : "T"}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: 14, color: "#1A1A18", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                        {h.query}
                      </div>
                      <div style={{ fontSize: 12, color: "#AEADA6", marginTop: 3 }}>{timeLabel}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 99, background: pill.bg, color: pill.color, display: "flex", alignItems: "center", gap: 5 }}>
                        {pill.icon} {verdict}
                      </span>
                      <button className={`delete-btn ${isDeleting ? "deleting" : ""}`} onClick={e => handleDelete(e, rowId)} title="Remove" disabled={isDeleting}>
                        {isDeleting ? "○" : "✕"}
                      </button>
                      <span className="history-arrow">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "36px 24px", textAlign: "center", background: "#fff", border: "1.5px dashed #E2E0D8", borderRadius: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
              <p style={{ fontSize: 14, color: "#888780", marginBottom: 16, lineHeight: 1.6 }}>Sign in to save and revisit your analysis history</p>
              <button onClick={() => navigate("/login")}
                style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(26,26,24,0.15)" }}>
                Sign in →
              </button>
            </div>
          )}
        </div>

      </main>

      {/* ── FOCUS MODE MODAL ───────────────────────────────────────────────── */}
      {showFocusModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16, animation: "fadeInOverlay 0.18s ease" }}
          onClick={e => { if (e.target === e.currentTarget) setShowFocusModal(false); }}>
          <div style={{ width: 600, maxWidth: "94vw", background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 28, boxShadow: "0 32px 72px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: "90vh", animation: "slideUpModal 0.22s cubic-bezier(0.16,1,0.3,1)" }}>

            <div style={{ padding: "28px 28px 0", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#AEADA6", marginBottom: 6 }}>REGIONAL INTELLIGENCE</div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1A1A18", lineHeight: 1.2, marginBottom: 6 }}>Focus Mode 🎯</h2>
                  <p style={{ color: "#888780", fontSize: 13, lineHeight: 1.6 }}>Select regions to prioritize local trusted sources.</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 16 }}>
                  {selectedRegions.length > 0 && (
                    <button onClick={() => setSelectedRegions([])}
                      style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 99, padding: "7px 14px", fontSize: 12, cursor: "pointer", color: "#991B1B", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setShowFocusModal(false)}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: "#EEEDE8", border: "none", cursor: "pointer", fontSize: 16, color: "#888780", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1A1A18"; e.currentTarget.style.color = "#FAFAF8"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#EEEDE8"; e.currentTarget.style.color = "#888780"; }}>
                    ×
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, background: "#F0EFEA", borderRadius: 14, padding: 4, marginBottom: 24 }}>
                {REGION_GROUPS.map((g, i) => (
                  <button key={g.label} className={`group-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
                    {g.label}
                    {groupCounts[i] > 0 && <span className={`tab-badge ${activeTab === i ? "" : "dim"}`}>{groupCounts[i]}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "0 28px", flexShrink: 0, position: "relative", height: 320 }}>
              {REGION_GROUPS.map((group, i) => (
                <div key={group.label} style={{
                  position: "absolute", inset: 0, left: 28, right: 28,
                  opacity: activeTab === i ? 1 : 0, pointerEvents: activeTab === i ? "auto" : "none",
                  transition: "opacity 0.2s ease", display: "grid",
                  gridTemplateColumns: i === 0 ? "1fr" : "repeat(auto-fill, minmax(152px,1fr))",
                  gap: 8, alignContent: "start", overflowY: "auto",
                }}>
                  {group.regions.map(region => {
                    const active = selectedRegions.includes(region);
                    return (
                      <button key={region} className={`region-pill ${active ? "active" : ""}`} onClick={() => toggleRegion(region)}>
                        <span className="check-circle">{active && "✓"}</span>
                        {region}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ padding: "20px 28px 28px", borderTop: "1px solid #EEEDE8", marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: "#888780" }}>
                {selectedRegions.length === 0 ? "No regions selected — using global sources" : `${selectedRegions.length} region${selectedRegions.length !== 1 ? "s" : ""} selected`}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowFocusModal(false)}
                  style={{ background: "#fff", border: "1.5px solid #E5E3DC", borderRadius: 12, padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#1A1A18", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1A18"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E3DC"}>
                  Cancel
                </button>
                <button onClick={() => setShowFocusModal(false)}
                  style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 12, padding: "10px 22px", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", fontSize: 13, boxShadow: "0 4px 14px rgba(26,26,24,0.15)" }}>
                  Apply{selectedRegions.length > 0 ? ` (${selectedRegions.length})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}