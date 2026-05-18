import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getUserHistory, deleteHistoryItem } from "../services/historyService";
import { deleteDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const PILL = {
  danger:  { bg: "#FEE2E2", color: "#991B1B", icon: "✗" },
  warn:    { bg: "#FEF3C7", color: "#92400E", icon: "⚠" },
  success: { bg: "#D1FAE5", color: "#065F46", icon: "✓" },
};

const ICON_STYLE = {
  T: { bg: "#EEF2FF", color: "#4338CA" },
  I: { bg: "#FEF3C7", color: "#92400E" },
};

function getEntryMeta(h) {
  const verdict = h.result?.data?.analysis?.final_verdict ?? "unclear";
  const labelType =
    verdict === "verified"   ? "success" :
    verdict === "misleading" ? "danger"  : "warn";
  const pill = PILL[labelType];
  const icon = ICON_STYLE[h.inputType === "image" ? "I" : "T"];
  const timeLabel = h.createdAt?.toDate
    ? h.createdAt.toDate().toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "just now";
  return { verdict, pill, icon, timeLabel };
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [visible, setVisible]           = useState(false);
  const [historyData, setHistoryData]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [clearingAll, setClearingAll]   = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [filter, setFilter]             = useState("all"); // all | verified | misleading | warn
  const [hoveredId, setHoveredId]       = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) { setHistoryData([]); return; }
    setLoading(true);
    getUserHistory(user.uid).then(data => {
      setHistoryData(data);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!id || deletingId) return;
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setHistoryData(prev => prev.filter(h => h.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!user || clearingAll) return;
    setClearingAll(true);
    try {
      const q = query(collection(db, "search_history"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "search_history", d.id))));
      setHistoryData([]);
    } finally {
      setClearingAll(false);
      setShowConfirm(false);
    }
  };

  const filteredData = historyData.filter(h => {
    if (filter === "all") return true;
    const verdict = h.result?.data?.analysis?.final_verdict ?? "unclear";
    if (filter === "verified")   return verdict === "verified";
    if (filter === "misleading") return verdict === "misleading";
    if (filter === "warn")       return verdict !== "verified" && verdict !== "misleading";
    return true;
  });

  const stats = {
    total:      historyData.length,
    verified:   historyData.filter(h => (h.result?.data?.analysis?.final_verdict ?? "") === "verified").length,
    misleading: historyData.filter(h => (h.result?.data?.analysis?.final_verdict ?? "") === "misleading").length,
    unclear:    historyData.filter(h => {
      const v = h.result?.data?.analysis?.final_verdict ?? "";
      return v !== "verified" && v !== "misleading";
    }).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", overflowX: "hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.in { opacity: 1; transform: translateY(0); }

        .history-row {
          display: flex; align-items: center; gap: 14px;
          padding: 15px 16px; border-radius: 14px; cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
          border-bottom: 1px solid #F2F1EC; position: relative;
        }
        .history-row:last-child { border-bottom: none; }
        .history-row:hover { background: #F7F6F2; transform: translateX(2px); }

        .history-arrow {
          opacity: 0; transform: translateX(-6px);
          transition: all 0.2s ease; color: #AEADA6; font-size: 14px;
        }
        .history-row:hover .history-arrow { opacity: 1; transform: translateX(0); color: #1A1A18; }

        .delete-btn {
          opacity: 0; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: transparent; border: 1.5px solid transparent;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 13px; color: #AEADA6;
          transition: all 0.18s ease; font-family: 'DM Sans', sans-serif;
        }
        .history-row:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #FEE2E2 !important; border-color: #FECACA !important; color: #991B1B !important; }
        .delete-btn.deleting { opacity: 1; animation: spin 0.7s linear infinite; }

        .filter-pill {
          background: #fff; border: 1.5px solid #E2E0D8; border-radius: 99px;
          padding: 7px 16px; font-size: 12px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; color: #888780;
          cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; gap: 6px;
        }
        .filter-pill:hover:not(.active) { border-color: #C5C3BB; color: #1A1A18; }
        .filter-pill.active { background: #1A1A18; border-color: #1A1A18; color: #FAFAF8; box-shadow: 0 4px 12px rgba(26,26,24,0.18); }

        .stat-card {
          background: #fff; border: 1.5px solid #E2E0D8; border-radius: 16px;
          padding: 20px; flex: 1; min-width: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07); }

        .clear-btn {
          background: #FEF2F2; border: 1.5px solid #FECACA; color: #991B1B;
          border-radius: 12px; padding: 9px 18px; font-size: 13px;
          font-family: 'DM Sans', sans-serif; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; gap: 7px;
        }
        .clear-btn:hover:not(:disabled) { background: #FEE2E2; box-shadow: 0 4px 12px rgba(153,27,27,0.15); }
        .clear-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
        @keyframes slideUpModal  { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
        @keyframes rowIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

        .skeleton {
          background: linear-gradient(90deg, #F0EFEA 25%, #E5E3DC 50%, #F0EFEA 75%);
          background-size: 400px 100%; animation: shimmer 1.4s ease infinite; border-radius: 8px;
        }
        .history-row-anim { animation: rowIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        .empty-icon {
          width: 72px; height: 72px; border-radius: 22px;
          background: #F0EFEA; display: flex; align-items: center;
          justify-content: center; font-size: 30px; margin: 0 auto 20px;
        }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ padding: "64px 0 36px", position: "relative" }}>

          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: 40, right: "8%", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#D1FAE5,#A7F3D0)", opacity: 0.5, filter: "blur(3px)", pointerEvents: "none", animation: "float 7s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: 80, left: "2%", width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", opacity: 0.55, filter: "blur(2px)", pointerEvents: "none" }} />

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#fff", border: "1px solid #E2E0D8",
            borderRadius: 99, padding: "6px 16px",
            fontSize: 11, fontWeight: 700, color: "#888780",
            marginBottom: 24, letterSpacing: "0.06em",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            YOUR FACT-CHECK ARCHIVE
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 42px)", lineHeight: 1.1, letterSpacing: "-1px", color: "#1A1A18", marginBottom: 10 }}>
                Analysis{" "}
                <span style={{ fontStyle: "italic", color: "#888780", fontWeight: 300 }}>History</span>
              </h1>
              <p style={{ fontSize: 15, color: "#666460", lineHeight: 1.6 }}>
                All your past fact-checks, sorted by recency.
              </p>
            </div>

            {user && historyData.length > 0 && (
              <button className="clear-btn" onClick={() => setShowConfirm(true)} disabled={clearingAll}>
                <span>🗑</span> Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
        {user && !loading && historyData.length > 0 && (
          <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "80ms", display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {[
              { label: "Total Checks", value: stats.total,      bg: "#F7F6F2",  accent: "#1A1A18" },
              { label: "Verified",     value: stats.verified,   bg: "#D1FAE5",  accent: "#065F46" },
              { label: "Misleading",   value: stats.misleading, bg: "#FEE2E2",  accent: "#991B1B" },
              { label: "Unconfirmed",  value: stats.unclear,    bg: "#FEF3C7",  accent: "#92400E" },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ background: s.bg, borderColor: s.bg === "#F7F6F2" ? "#E2E0D8" : "transparent" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.accent, fontFamily: "'DM Serif Display', serif", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: s.accent, fontWeight: 600, marginTop: 5, opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── FILTERS ──────────────────────────────────────────────────────── */}
        {user && !loading && historyData.length > 0 && (
          <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "140ms", display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { key: "all",        label: "All",          count: stats.total },
              { key: "verified",   label: "✓ Verified",   count: stats.verified },
              { key: "misleading", label: "✗ Misleading", count: stats.misleading },
              { key: "warn",       label: "⚠ Unconfirmed",count: stats.unclear },
            ].map(f => (
              <button key={f.key} className={`filter-pill ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>
                {f.label}
                <span style={{
                  background: filter === f.key ? "rgba(255,255,255,0.2)" : "#E2E0D8",
                  color: filter === f.key ? "#FAFAF8" : "#888780",
                  borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                }}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── MAIN CARD ────────────────────────────────────────────────────── */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "180ms" }}>

          {!user ? (
            /* Not logged in */
            <div style={{ padding: "64px 24px", textAlign: "center", background: "#fff", border: "1.5px dashed #E2E0D8", borderRadius: 24 }}>
              <div className="empty-icon">🔐</div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 10 }}>Sign in to see history</h2>
              <p style={{ fontSize: 14, color: "#888780", marginBottom: 24, lineHeight: 1.6, maxWidth: 300, margin: "0 auto 24px" }}>
                Your past fact-checks are saved securely to your account.
              </p>
              <button
                onClick={() => navigate("/login")}
                style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 12, padding: "11px 26px", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(26,26,24,0.15)" }}
              >
                Sign in →
              </button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1.5px solid #E2E0D8", borderRadius: 24, padding: "6px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>

              {/* Loading skeletons */}
              {loading && [1,2,3,4,5].map(i => (
                <div key={i} className="history-row" style={{ pointerEvents: "none" }}>
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="skeleton" style={{ height: 14, width: "65%" }} />
                    <div className="skeleton" style={{ height: 11, width: "28%" }} />
                  </div>
                  <div className="skeleton" style={{ width: 88, height: 26, borderRadius: 99 }} />
                </div>
              ))}

              {/* Empty state */}
              {!loading && historyData.length === 0 && (
                <div style={{ padding: "56px 24px", textAlign: "center" }}>
                  <div className="empty-icon">🔍</div>
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 10 }}>No checks yet</h2>
                  <p style={{ fontSize: 14, color: "#888780", lineHeight: 1.6, marginBottom: 24 }}>Analyse your first claim to see it appear here.</p>
                  <button
                    onClick={() => navigate("/")}
                    style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 12, padding: "10px 22px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", boxShadow: "0 4px 14px rgba(26,26,24,0.15)" }}
                  >
                    Start fact-checking →
                  </button>
                </div>
              )}

              {/* Filtered empty */}
              {!loading && historyData.length > 0 && filteredData.length === 0 && (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div className="empty-icon">🤷</div>
                  <p style={{ fontSize: 14, color: "#888780" }}>No results in this category.</p>
                </div>
              )}

              {/* Real rows */}
              {!loading && filteredData.map((h, i) => {
                const { verdict, pill, icon, timeLabel } = getEntryMeta(h);
                const rowId = h.id ?? i;
                const isDeleting = deletingId === rowId;
                return (
                  <div
                    key={rowId}
                    className="history-row history-row-anim"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setHoveredId(rowId)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => !isDeleting && navigate("/result", { state: { result: h.result } })}
                  >
                    {/* Type badge */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                      background: icon.bg, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 13, fontWeight: 700, color: icon.color,
                    }}>
                      {h.inputType === "image" ? "I" : "T"}
                    </div>

                    {/* Text + meta */}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{
                        fontSize: 14, color: "#1A1A18", fontWeight: 500, lineHeight: 1.4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {h.query}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#AEADA6" }}>{timeLabel}</span>
                        {h.focusRegions?.length > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#888780", background: "#F0EFEA", borderRadius: 99, padding: "2px 8px" }}>
                            🎯 {h.focusRegions.slice(0,2).join(", ")}{h.focusRegions.length > 2 ? ` +${h.focusRegions.length - 2}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verdict + controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 99,
                        background: pill.bg, color: pill.color,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        {pill.icon} {verdict}
                      </span>

                      <button
                        className={`delete-btn ${isDeleting ? "deleting" : ""}`}
                        onClick={e => handleDelete(e, rowId)}
                        title="Remove"
                        disabled={!!isDeleting}
                      >
                        {isDeleting ? "○" : "✕"}
                      </button>

                      <span className="history-arrow">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Back link */}
          {user && (
            <p style={{ fontSize: 12, color: "#AEADA6", textAlign: "center", marginTop: 20 }}>
              <span
                style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                onClick={() => navigate("/")}
              >
                ← Back to analyser
              </span>
            </p>
          )}
        </div>
      </main>

      {/* ── CONFIRM CLEAR ALL MODAL ─────────────────────────────────────── */}
      {showConfirm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16, animation: "fadeInOverlay 0.18s ease" }}
          onClick={e => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div style={{ width: 400, maxWidth: "92vw", background: "#FAFAF8", border: "1px solid #EEEDE8", borderRadius: 24, padding: "32px 28px", boxShadow: "0 32px 72px rgba(0,0,0,0.14)", animation: "slideUpModal 0.22s cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 20 }}>🗑</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 10, color: "#1A1A18" }}>Clear all history?</h2>
            <p style={{ fontSize: 14, color: "#888780", lineHeight: 1.6, marginBottom: 28 }}>
              This will permanently delete all {historyData.length} fact-check{historyData.length !== 1 ? "s" : ""} from your account. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, background: "#fff", border: "1.5px solid #E5E3DC", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                style={{ flex: 1, background: "#991B1B", color: "#fff", border: "none", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", opacity: clearingAll ? 0.6 : 1, boxShadow: "0 4px 14px rgba(153,27,27,0.25)" }}
              >
                {clearingAll ? "Clearing…" : "Yes, clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}