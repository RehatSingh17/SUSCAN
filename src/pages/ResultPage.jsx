import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 60);
    // If no result, redirect home
    if (!result) navigate("/");
  }, [result, navigate]);

  if (!result) return null;

  const isPending = result.status === "pending";

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fade-up { opacity: 0; transform: translateY(14px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        .card { background: #fff; border: 1px solid #EEEDE8; border-radius: 16px; padding: 24px 28px; margin-bottom: 14px; }
        .pulse { animation: pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .skeleton { background: #EEEDE8; border-radius: 6px; }
        .back-btn { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #888780; cursor: pointer; display: flex; align-items: center; gap: 4px; margin-bottom: 28px; padding: 0; transition: color 0.15s; }
        .back-btn:hover { color: #1A1A18; }
        .analyse-again { background: #1A1A18; color: #FAFAF8; border: none; border-radius: 10px; padding: 10px 22px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
        .analyse-again:hover { opacity: 0.85; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 660, margin: "0 auto", padding: "40px 24px 80px" }}>

        <button className="back-btn" onClick={() => navigate("/")}>← Back to home</button>

        {/* Input summary card */}
        <div className={`card fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "0ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 12, color: "#AEADA6", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 6 }}>
                {result.input_type === "image" ? "Extracted from image" : "Analysed text"}
              </p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#1A1A18", lineHeight: 1.4, maxWidth: 480 }}>
                {result.extracted_text?.slice(0, 200)}{result.extracted_text?.length > 200 ? "…" : ""}
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 99, flexShrink: 0, marginLeft: 12,
              background: result.input_type === "image" ? "#FEF3C7" : "#EEF2FF",
              color: result.input_type === "image" ? "#92400E" : "#4338CA",
            }}>
              {result.input_type === "image" ? "Image" : "Text"}
            </span>
          </div>

          {/* Metadata row */}
          <div style={{ display: "flex", gap: 20, paddingTop: 14, borderTop: "1px solid #EEEDE8" }}>
            <div>
              <p style={{ fontSize: 11, color: "#AEADA6", marginBottom: 2 }}>Characters</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{result.extracted_text?.length ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#AEADA6", marginBottom: 2 }}>Words</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18" }}>{result.extracted_text?.split(/\s+/).filter(Boolean).length ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#AEADA6", marginBottom: 2 }}>Status</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: isPending ? "#92400E" : "#065F46" }}>
                {isPending ? "Awaiting analysis" : "Complete"}
              </p>
            </div>
          </div>
        </div>

        {/* Phase 1: pending analysis placeholder */}
        {isPending && (
          <div className={`card fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "80ms" }}>
            <p style={{ fontSize: 12, color: "#AEADA6", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 16 }}>
              Credibility analysis
            </p>

            {/* Skeleton score */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {["Credibility score", "Sources checked", "Bias status"].map((label) => (
                <div key={label} style={{ background: "#F7F6F2", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, color: "#AEADA6", marginBottom: 8 }}>{label}</p>
                  <div className="skeleton pulse" style={{ height: 28, width: "60%" }} />
                </div>
              ))}
            </div>

            {/* Coming in Phase 2 notice */}
            <div style={{ background: "#F7F6F2", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEEDE8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #C5C3BB" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A18", marginBottom: 2 }}>Analysis engine coming soon</p>
                <p style={{ fontSize: 13, color: "#888780", lineHeight: 1.5 }}>
                  Text extraction complete. Credibility scoring, bias detection and source verification will be available in Phase 2.
                </p>
              </div>
            </div>

            {/* Skeleton full picture */}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: "#AEADA6", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 10 }}>Full picture</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[80, 60, 90, 40].map((w, i) => (
                  <div key={i} className="skeleton pulse" style={{ height: 14, width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Extracted text full view */}
        <div className={`card fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "160ms" }}>
          <p style={{ fontSize: 12, color: "#AEADA6", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 12 }}>
            Cleaned extracted text
          </p>
          <p style={{ fontSize: 14, color: "#444441", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {result.extracted_text}
          </p>
        </div>

        {/* Analyse again */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "240ms", textAlign: "center", marginTop: 8 }}>
          <button className="analyse-again" onClick={() => navigate("/")}>Analyse another →</button>
        </div>

      </main>
    </div>
  );
}
