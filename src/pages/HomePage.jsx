import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { analyseText, analyseImage } from "../api";

const HISTORY = [
  { type: "T", claim: '"PTI rally attendance exceeded 2 million, says party spokesperson"', label: "Likely false", labelType: "danger", time: "2h ago" },
  { type: "I", claim: "Image: Article screenshot — Sindh flood relief funds misused", label: "Bias detected", labelType: "warn", time: "5h ago" },
  { type: "T", claim: '"Pakistan cuts interest rate to 13% — State Bank announcement"', label: "Verified", labelType: "success", time: "1d ago" },
];

const PILL = {
  danger: { bg: "#FEE2E2", color: "#991B1B" },
  warn: { bg: "#FEF3C7", color: "#92400E" },
  success: { bg: "#D1FAE5", color: "#065F46" },
};

const ICON_STYLE = {
  T: { bg: "#EEF2FF", color: "#4338CA", label: "T" },
  I: { bg: "#FEF3C7", color: "#92400E", label: "I" },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState("Text");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

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
      let result;
      if (mode === "Text") {
        result = await analyseText(text.trim(), userId);
      } else {
        result = await analyseImage(image, userId);
      }
      navigate("/result", { state: { result } });
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const charCount = text.trim() ? text.length : 0;
  const canSubmit = mode === "Text" ? (charCount > 0 && charCount <= 10000) : image !== null;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18" }}>
      {loading && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(250, 250, 248, 0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 44, height: 44, border: "3px solid #E2E0D8", borderTopColor: "#1A1A18", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 20, fontSize: 16, fontWeight: 500, color: "#1A1A18", letterSpacing: "-0.2px" }}>Analysing claim...</p>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #AEADA6; transition: color 0.3s ease; }
        textarea:focus::placeholder { color: #C5C3BB; }
        
        .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        
        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -1px;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #1A1A18 0%, #555555 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          color: #1A1A18;
        }

        .input-card {
          background: #fff;
          border: 1px solid #E2E0D8;
          border-radius: 20px;
          padding: 24px;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .input-card.focused {
          border-color: #1A1A18;
          box-shadow: 0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02);
          transform: translateY(-2px);
        }
        
        .mode-btn { background: #F7F6F2; border: 1px solid transparent; border-radius: 99px; padding: 6px 16px; font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: #888780; cursor: pointer; transition: all 0.2s ease; }
        .mode-btn:hover { color: #1A1A18; background: #EEEDE8; }
        .mode-btn.active { background: #1A1A18; color: #FAFAF8; box-shadow: 0 4px 12px rgba(26,26,24,0.15); }
        
        .analyse-btn { background: #1A1A18; color: #FAFAF8; border: none; border-radius: 12px; padding: 12px 24px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); letter-spacing: -0.1px; box-shadow: 0 4px 12px rgba(26,26,24,0.1); }
        .analyse-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(26,26,24,0.2); }
        .analyse-btn:active:not(:disabled) { transform: scale(0.97); }
        .analyse-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
        
        .history-row { display: flex; align-items: center; gap: 16px; padding: 16px 12px; border-bottom: 1px solid #EEEDE8; cursor: pointer; transition: all 0.25s ease; border-radius: 12px; margin-bottom: 4px; }
        .history-row:last-child { border-bottom: none; margin-bottom: 0; }
        .history-row:hover { background: #F7F6F2; padding-left: 20px; padding-right: 16px; }
        .history-row .arrow { opacity: 0; transform: translateX(-8px); transition: all 0.25s ease; color: #AEADA6; font-size: 14px; }
        .history-row:hover .arrow { opacity: 1; transform: translateX(0); color: #1A1A18; }
        
        .nav-link { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #888780; cursor: pointer; }
        .see-all { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #888780; cursor: pointer; transition: color 0.2s; }
        .see-all:hover { color: #1A1A18; }
        
        .drop-zone { border: 2px dashed #E2E0D8; border-radius: 12px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.25s ease; background: transparent; }
        .drop-zone:hover { border-color: #1A1A18; background: #F7F6F2; transform: scale(0.995); }
        .drop-zone.has-image { border-style: solid; border-color: #EEEDE8; padding: 12px; background: #fff; }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 740, margin: "0 auto", padding: "0 24px 100px" }}>

        {/* Hero */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ textAlign: "center", padding: "72px 0 48px", transitionDelay: "0ms" }}>
          <h1 className="hero-title">
            Is it true?{" "}
            <span style={{ fontStyle: "italic", fontWeight: 300, color: "#888780" }}>Find out.</span>
          </h1>
          <p style={{ fontSize: 16, color: "#888780", lineHeight: 1.6, maxWidth: 460, margin: "0 auto", letterSpacing: "-0.1px" }}>
            Paste a news headline or upload an article image. We check it against trusted sources and reveal the full picture.
          </p>
        </div>

        {/* Input card */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "80ms" }}>
          <div className={`input-card ${focused || imagePreview ? "focused" : ""}`}>
            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["Text", "Image"].map((m) => (
                <button key={m} className={`mode-btn ${mode === m ? "active" : ""}`}
                  onClick={() => { setMode(m); setError(""); }}>
                  {m === "Text" ? "Text / headline" : "Upload image"}
                </button>
              ))}
            </div>

            {/* Text input */}
            {mode === "Text" && (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Paste a headline, article text, or social media post…"
                  style={{
                    width: "100%", border: "none", outline: "none", fontSize: 16,
                    fontFamily: "'DM Sans', sans-serif", color: "#1A1A18",
                    background: "transparent", resize: "none", lineHeight: 1.6,
                    minHeight: 100, letterSpacing: "-0.2px",
                  }}
                />
                <div style={{ marginTop: 12, fontSize: 13, color: "#888780", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", position: "relative", zIndex: 5 }}>
                  <span style={{ fontWeight: 500, color: "#1A1A18" }}>Try:</span>
                  <button type="button" onClick={() => setText("India becomes richest country")} style={{ background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#444441", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s" }} onMouseEnter={(e) => e.target.style.borderColor = "#C5C3BB"} onMouseLeave={(e) => e.target.style.borderColor = "#EEEDE8"}>
                    "India becomes richest country"
                  </button>
                  <button type="button" onClick={() => setText("Aliens landed in Delhi")} style={{ background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#444441", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s" }} onMouseEnter={(e) => e.target.style.borderColor = "#C5C3BB"} onMouseLeave={(e) => e.target.style.borderColor = "#EEEDE8"}>
                    "Aliens landed in Delhi"
                  </button>
                </div>
              </>
            )}

            {/* Image input */}
            {mode === "Image" && (
              <div
                className={`drop-zone ${imagePreview ? "has-image" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onMouseEnter={() => setFocused(true)}
                onMouseLeave={() => setFocused(false)}
              >
                {imagePreview ? (
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img src={imagePreview} alt="preview" style={{ maxHeight: 240, maxWidth: "100%", borderRadius: 10, objectFit: "contain", display: "block" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImage(null); setImagePreview(null); }}
                      style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: "50%", background: "#1A1A18", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                    >×</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 12, color: "#C5C3BB", transition: "transform 0.2s" }} className="upload-icon">↑</div>
                    <p style={{ fontSize: 15, color: "#444441", marginBottom: 6, fontWeight: 500 }}>Drop an article image or click to browse</p>
                    <p style={{ fontSize: 13, color: "#AEADA6" }}>Supports PNG, JPG, WEBP</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #EEEDE8", marginTop: 16 }}>
              <span style={{ fontSize: 13, color: charCount > 10000 ? "#991B1B" : "#AEADA6", fontFamily: "monospace" }}>
                {mode === "Text" ? `${charCount} / 10,000 chars` : image ? image.name : "No file selected"}
              </span>
              <button className="analyse-btn" onClick={handleAnalyse} disabled={!canSubmit || loading}>
                {loading ? "Analysing…" : "Analyse claim →"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#991B1B", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 600 }}>!</span> {error}
            </div>
          )}

          <p style={{ fontSize: 13, color: "#AEADA6", textAlign: "center", margin: "16px 0 0" }}>
            {user ? `Signed in as ${user.displayName ?? user.email}` : "No account needed · Sign in to save history"}
          </p>
        </div>

        {/* Recent analyses */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ marginTop: 64, transitionDelay: "140ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, padding: "0 4px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18", letterSpacing: "-0.2px" }}>Recent Checks</h2>
            <button className="see-all" onClick={() => navigate("/history")}>View all history →</button>
          </div>
          {user ? (
            <div style={{ background: "#fff", border: "1px solid #EEEDE8", borderRadius: 16, padding: "8px" }}>
              {HISTORY.map((h, i) => {
                const pill = PILL[h.labelType];
                const icon = ICON_STYLE[h.type];
                return (
                  <div key={i} className="history-row" onClick={() => navigate("/result")}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: icon.color, fontFamily: "'DM Sans', sans-serif" }}>
                      {icon.label}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                      <span style={{ fontSize: 14, color: "#1A1A18", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.1px" }}>{h.claim}</span>
                      <span style={{ fontSize: 12, color: "#AEADA6" }}>{h.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 99, background: pill.bg, color: pill.color }}>{h.label}</span>
                      <span className="arrow">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "32px 0", textAlign: "center", background: "#fff", border: "1px dashed #E2E0D8", borderRadius: 16 }}>
              <p style={{ fontSize: 14, color: "#888780", marginBottom: 12 }}>Sign in to securely store your analysis history</p>
              <button onClick={() => navigate("/login")} style={{ background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.target.style.background = "#EEEDE8"} onMouseLeave={(e) => e.target.style.background = "#F7F6F2"}>
                Sign in to view
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
