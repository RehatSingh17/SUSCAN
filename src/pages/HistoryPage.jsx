import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const HISTORY = [
  { type: "T", claim: '"PTI rally attendance exceeded 2 million, says party spokesperson"', label: "Likely false", labelType: "danger", time: "2h ago" },
  { type: "I", claim: "Image: Article screenshot — Sindh flood relief funds misused", label: "Bias detected", labelType: "warn", time: "5h ago" },
  { type: "T", claim: '"Pakistan cuts interest rate to 13% — State Bank announcement"', label: "Verified", labelType: "success", time: "1d ago" },
  { type: "T", claim: "Viral text claims 5 days public holiday for Eid this year", label: "Pending verification", labelType: "warn", time: "2d ago" },
  { type: "I", claim: "Screenshot of fake official notification about school closures", label: "Likely false", labelType: "danger", time: "1w ago" },
];

const PILL = {
  danger:  { bg: "#FEE2E2", color: "#991B1B" },
  warn:    { bg: "#FEF3C7", color: "#92400E" },
  success: { bg: "#D1FAE5", color: "#065F46" },
};

const ICON_STYLE = {
  T: { bg: "#EEF2FF", color: "#4338CA", label: "T" },
  I: { bg: "#FEF3C7", color: "#92400E", label: "I" },
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fade-up { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        .history-row { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid #EEEDE8; cursor: pointer; transition: background 0.15s, padding-left 0.15s; border-radius: 8px; }
        .history-row:last-child { border-bottom: none; }
        .history-row:hover { background: #F7F6F2; padding-left: 20px; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className={`fade-up ${visible ? "in" : ""}`}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", color: "#1A1A18", marginBottom: 8 }}>
            Analysis History
          </h1>
          <p style={{ fontSize: 15, color: "#888780", marginBottom: 32 }}>
            Your past fact-checks and verifications.
          </p>

          <div style={{ background: "#fff", border: "1px solid #EEEDE8", borderRadius: 16, padding: "8px" }}>
            {user ? (
              HISTORY.map((h, i) => {
                const pill = PILL[h.labelType];
                const icon = ICON_STYLE[h.type];
                return (
                  <div key={i} className="history-row" onClick={() => navigate("/result")}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: icon.color, fontFamily: "'DM Sans', sans-serif" }}>
                      {icon.label}
                    </div>
                    <span style={{ flex: 1, fontSize: 14, color: "#1A1A18", lineHeight: 1.4, letterSpacing: "-0.1px" }}>{h.claim}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 99, background: pill.bg, color: pill.color }}>{h.label}</span>
                      <span style={{ fontSize: 12, color: "#C5C3BB", width: 48, textAlign: "right" }}>{h.time}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: 15, color: "#AEADA6", marginBottom: 16 }}>Sign in to see your analysis history</p>
                <button onClick={() => navigate("/login")} style={{ background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
