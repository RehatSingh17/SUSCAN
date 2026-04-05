import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { analyseText, analyseImage } from "../api";

const TRENDING = [
  { category: "Politics", label: "Likely false", type: "danger", claim: "Viral claim about election results being altered circulating on WhatsApp", flags: "3.2k" },
  { category: "Health", label: "Unverified", type: "warn", claim: '"New vaccine causes infertility" — claim spreading across Facebook groups', flags: "1.8k" },
  { category: "Economy", label: "Bias detected", type: "warn", claim: "Inflation report shared without national figures — only urban data cited", flags: "940" },
  { category: "Technology", label: "Likely false", type: "danger", claim: "AI-generated image of PM statement from 2019 being shared as recent", flags: "2.1k" },
];

const HISTORY = [
  { type: "T", claim: '"PTI rally attendance exceeded 2 million, says party spokesperson"', label: "Likely false", labelType: "danger", time: "2h ago" },
  { type: "I", claim: "Image: Article screenshot — Sindh flood relief funds misused", label: "Bias detected", labelType: "warn", time: "5h ago" },
  { type: "T", claim: '"Pakistan cuts interest rate to 13% — State Bank announcement"', label: "Verified", labelType: "success", time: "1d ago" },
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

  const canSubmit = mode === "Text" ? text.trim().length > 0 : image !== null;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #AEADA6; }
        .fade-up { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        .mode-btn { background: none; border: 1px solid #E2E0D8; border-radius: 99px; padding: 5px 14px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #888780; cursor: pointer; transition: all 0.15s; }
        .mode-btn:hover { border-color: #C5C3BB; color: #444; }
        .mode-btn.active { background: #1A1A18; border-color: #1A1A18; color: #FAFAF8; }
        .analyse-btn { background: #1A1A18; color: #FAFAF8; border: none; border-radius: 10px; padding: 10px 22px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: opacity 0.15s, transform 0.1s; letter-spacing: -0.1px; }
        .analyse-btn:hover:not(:disabled) { opacity: 0.85; }
        .analyse-btn:active:not(:disabled) { transform: scale(0.97); }
        .analyse-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .history-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #EEEDE8; cursor: pointer; transition: padding-left 0.15s; border-radius: 6px; }
        .history-row:last-child { border-bottom: none; }
        .history-row:hover { padding-left: 6px; }
        .trend-card { background: #fff; border: 1px solid #EEEDE8; border-radius: 14px; padding: 16px 18px; cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
        .trend-card:hover { border-color: #C5C3BB; transform: translateY(-2px); }
        .nav-link { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #888780; cursor: pointer; }
        .see-all { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #AEADA6; cursor: pointer; transition: color 0.15s; }
        .see-all:hover { color: #1A1A18; }
        .drop-zone { border: 1.5px dashed #E2E0D8; border-radius: 12px; padding: 32px 20px; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
        .drop-zone:hover { border-color: #1A1A18; background: #F7F6F2; }
        .drop-zone.has-image { border-style: solid; border-color: #C5C3BB; padding: 12px; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 660, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* Hero */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ textAlign: "center", padding: "56px 0 36px", transitionDelay: "0ms" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.8px", color: "#1A1A18", marginBottom: 12 }}>
            Is it true?{" "}
            <span style={{ fontStyle: "italic", color: "#888780" }}>Find out.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#888780", lineHeight: 1.65, maxWidth: 420, margin: "0 auto", letterSpacing: "-0.1px" }}>
            Paste a news headline or upload an article image. We check it against trusted sources and show you the full picture.
          </p>
        </div>

        {/* Input card */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "80ms" }}>
          <div style={{
            background: "#fff", border: `1.5px solid ${focused ? "#1A1A18" : "#E2E0D8"}`,
            borderRadius: 16, padding: "16px 18px", transition: "border-color 0.2s",
          }}>
            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {["Text", "Image"].map((m) => (
                <button key={m} className={`mode-btn ${mode === m ? "active" : ""}`}
                  onClick={() => { setMode(m); setError(""); }}>
                  {m === "Text" ? "Text / headline" : "Upload image"}
                </button>
              ))}
            </div>

            {/* Text input */}
            {mode === "Text" && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Paste a headline or article text…"
                style={{
                  width: "100%", border: "none", outline: "none", fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif", color: "#1A1A18",
                  background: "transparent", resize: "none", lineHeight: 1.6,
                  minHeight: 80, letterSpacing: "-0.1px",
                }}
              />
            )}

            {/* Image input */}
            {mode === "Image" && (
              <div
                className={`drop-zone ${imagePreview ? "has-image" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {imagePreview ? (
                  <div style={{ position: "relative" }}>
                    <img src={imagePreview} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImage(null); setImagePreview(null); }}
                      style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, borderRadius: "50%", background: "#1A1A18", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >×</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 28, marginBottom: 8, color: "#C5C3BB" }}>↑</div>
                    <p style={{ fontSize: 14, color: "#888780", marginBottom: 4 }}>Drop an article image or click to upload</p>
                    <p style={{ fontSize: 12, color: "#C5C3BB" }}>PNG, JPG, WEBP supported</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSelect} />
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #EEEDE8", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "#C5C3BB" }}>
                {mode === "Text" ? `${text.length} characters` : image ? image.name : "No file selected"}
              </span>
              <button className="analyse-btn" onClick={handleAnalyse} disabled={!canSubmit || loading}>
                {loading ? "Analysing…" : "Analyse →"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 10, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B" }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: 12, color: "#C5C3BB", textAlign: "center", marginTop: 10 }}>
            {user ? `Signed in as ${user.displayName ?? user.email}` : "No account needed · Sign in to save history"}
          </p>
        </div>

        {/* Recent analyses */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ marginTop: 48, transitionDelay: "160ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.4px", color: "#AEADA6", textTransform: "uppercase" }}>Recent</span>
            <button className="see-all" onClick={() => navigate("/history")}>See all</button>
          </div>
          {user ? (
            HISTORY.map((h, i) => {
              const pill = PILL[h.labelType];
              const icon = ICON_STYLE[h.type];
              return (
                <div key={i} className="history-row" onClick={() => navigate("/result")}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: icon.color, fontFamily: "'DM Sans', sans-serif" }}>
                    {icon.label}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: "#444441", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.1px" }}>{h.claim}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99, background: pill.bg, color: pill.color }}>{h.label}</span>
                    <span style={{ fontSize: 11, color: "#C5C3BB" }}>{h.time}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#AEADA6", marginBottom: 10 }}>Sign in to see your analysis history</p>
              <button onClick={() => navigate("/login")} style={{ background: "none", border: "1px solid #E2E0D8", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", cursor: "pointer" }}>
                Sign in
              </button>
            </div>
          )}
        </div>

        {/* Trending alerts */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ marginTop: 48, transitionDelay: "240ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.4px", color: "#AEADA6", textTransform: "uppercase" }}>Trending alerts</span>
            <button className="see-all">See all</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {TRENDING.map((t, i) => {
              const pill = PILL[t.type];
              return (
                <div key={i} className="trend-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#AEADA6", letterSpacing: "0.3px", textTransform: "uppercase" }}>{t.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: pill.bg, color: pill.color, flexShrink: 0, marginLeft: 6 }}>{t.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#1A1A18", lineHeight: 1.45, marginBottom: 12, letterSpacing: "-0.1px" }}>{t.claim}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#EEEDE8", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#AEADA6" }}>Flagged {t.flags} times</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
