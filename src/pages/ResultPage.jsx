import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [showFullText, setShowFullText] = useState({});

  const handleShare = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    // Prevent unstyled flash
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const result = location.state?.result;
  const data = result?.data;
  const searchResults = data?.search_results || [];

  // Derive label and confidence (mocked fallback if backend doesn't supply them yet)
  const verdict = data?.label || "Likely False";
  const confidence = data?.confidence || 84;
  const getBadgeColors = (v) => {
    if (v === "Likely True") return { bg: "#D1FAE5", color: "#065F46" };
    if (v === "Likely False") return { bg: "#FEE2E2", color: "#991B1B" };
    return { bg: "#FEF3C7", color: "#92400E" }; // Uncertain
  };
  const badge = getBadgeColors(verdict);

  // Fallback state if accessed directly without data
  if (!result || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif" }}>
        <Navbar />
        <div style={{ padding: "100px 24px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#1A1A18", marginBottom: 16 }}>No analysis found</h2>
          <p style={{ color: "#888780", marginBottom: 32 }}>It seems you haven't submitted a claim for analysis yet.</p>
          <button
            onClick={() => navigate("/")}
            style={{ padding: "10px 24px", background: "#1A1A18", color: "#FAFAF8", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500 }}
          >
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif", color: "#1A1A18", position: "relative" }}>
      {showToast && (
        <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "#1A1A18", color: "#FAFAF8", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 1000, animation: "fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          Feature not available currently
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        .result-card {
          background: #fff;
          border: 1px solid #E2E0D8;
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .result-card.elevated {
          box-shadow: 0 12px 32px rgba(0,0,0,0.04);
          border-color: #C5C3BB;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          background: #F7F6F2;
          border: 1px solid #EEEDE8;
          border-radius: 99px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #444441;
          gap: 6px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: none;
          color: #888780;
          border: none;
          font-family: "'DM Sans', sans-serif";
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease, transform 0.2s ease;
          padding: 8px 0;
        }
        .back-btn:hover {
          color: #1A1A18;
          transform: translateX(-2px);
        }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 840, margin: "0 auto", padding: "48px 24px 100px" }}>

        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "0ms" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="back-btn" onClick={() => navigate("/")}>
              ← Back to scanner
            </button>

            <button
              onClick={handleShare}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#F7F6F2", color: "#1A1A18", border: "1px solid #EEEDE8",
                borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.target.style.background = "#EEEDE8"}
              onMouseLeave={(e) => e.target.style.background = "#F7F6F2"}
              title="Feature not available currently"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              Share Result
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(32px, 5vw, 42px)", letterSpacing: "-1px", color: "#1A1A18", lineHeight: 1.1 }}>
                Analysis Result
              </h1>
              <p style={{ fontSize: 15, color: "#888780", marginTop: 8 }}>
                Review the AI verification breakdown below.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="pill">
                <span style={{ color: "#AEADA6" }}>Type:</span>
                <span style={{ textTransform: "capitalize" }}>{data.input_type || "Unknown"}</span>
              </div>
              <div className="pill">
                <span style={{ color: "#AEADA6" }}>Chars:</span>
                <span>{data.raw_text?.length || "0"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Badge */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "50ms", marginBottom: 32 }}>
          <div style={{ padding: "24px 32px", background: "#fff", border: "1px solid #E2E0D8", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px rgba(0,0,0,0.03)" }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#888780", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Final Verification</span>
              <div style={{ background: badge.bg, color: badge.color, padding: "8px 20px", borderRadius: 12, fontSize: 26, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.5px", display: "inline-block" }}>
                {verdict}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#888780", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 4 }}>Confidence Level</span>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#1A1A18", letterSpacing: "-1px" }}>
                {confidence}%
              </div>
            </div>
          </div>
        </div>

        {/* Cleaned Text (Primary Highlight) */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "100ms" }}>
          <div className="result-card elevated">
            <h3 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600, color: "#1A1A18", marginBottom: 20, letterSpacing: "-0.2px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ background: "#D1FAE5", borderRadius: "50%", padding: 3 }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Verified & Cleaned Text
            </h3>
            <div
              style={{
                background: "#FAFAF8",
                border: "1px solid #EEEDE8",
                borderRadius: 14,
                padding: 20,
                fontSize: 14,
                lineHeight: 1.8,
                color: "#444",
                maxHeight: 360,
                overflowY: "auto",
                whiteSpace: "pre-wrap"
              }}>
              {data.cleaned_text || "No cleaned text found"}
            </div>

          </div>
        </div>

        {/* Raw Text Input */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "150ms" }}>
          <div className="result-card" style={{ padding: "24px 32px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#444441", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Original Raw Input
            </h3>
            <div style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#888780",
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              overflowY: "auto",
              paddingRight: "8px"
            }}>
              {data.raw_text || "No raw text found"}
            </div>
          </div>
        </div>
        {/* Trusted Source Coverage */}
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ transitionDelay: "200ms", marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1A1A18", letterSpacing: "-0.5px" }}>
                Trusted Source Coverage
              </h2>

              <p style={{ fontSize: 14, color: "#888780", marginTop: 4 }}>
                {searchResults.length} trusted sources found
              </p>
            </div>
          </div>

          {searchResults.map((article, index) => {
            const expanded = expandedIndex === index;

            return (
              <div
                key={index}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E0D8",
                  borderRadius: 20,
                  padding: 24,
                  marginBottom: 20,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  transition: "all 0.3s ease"
                }}
              >

                {/* Source Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#065F46"
                      }}
                    />

                    <div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#1A1A18"
                        }}
                      >
                        {article.source}
                      </span>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#065F46"
                        }}
                      >
                        Relevance: {
                          Math.round(
                            (article.score /
                              Math.max(...searchResults.map((a) => a.score), 1)) * 100
                          )}
                        %
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        background: "#D1FAE5",
                        color: "#065F46",
                        padding: "4px 10px",
                        borderRadius: 999
                      }}
                    >
                      Trusted
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: 20,
                    lineHeight: 1.4,
                    fontWeight: 700,
                    color: "#1A1A18",
                    marginBottom: 14,
                    letterSpacing: "-0.3px"
                  }}
                >
                  {article.title}
                </h3>

                {/* Snippet */}
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "#555",
                    marginBottom: 18
                  }}
                >
                  {article.snippet}
                </p>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >

                  <button
                    onClick={() =>
                      setExpandedIndex(expanded ? null : index)
                    }
                    style={{
                      background: "#1A1A18",
                      color: "#FAFAF8",
                      border: "none",
                      borderRadius: 12,
                      padding: "10px 16px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {expanded ? "Hide Full Article ▲" : "Read Full Article ▼"}
                  </button>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1A1A18",
                      textDecoration: "none"
                    }}
                  >
                    Visit Original Source →
                  </a>
                </div>

                {/* Expanded Article */}
                <div
                  style={{
                    maxHeight: expanded ? 400 : 0,
                    overflow: "hidden",
                    transition: "all 0.4s ease",
                    marginTop: expanded ? 24 : 0
                  }}
                >
                  <div
                    style={{
                      background: "#FAFAF8",
                      border: "1px solid #EEEDE8",
                      borderRadius: 14,
                      padding: 20,
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "#444",
                      maxHeight: 360,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {showFullText[index]
                      ? article.full_text
                      : `${article.full_text?.slice(0, 700)}...`}
                    <button
                      onClick={() =>
                        setShowFullText((prev) => ({
                          ...prev,
                          [index]: !prev[index]
                        }))
                      }
                      style={{
                        marginTop: 14,
                        background: "transparent",
                        border: "none",
                        color: "#1A1A18",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 14,
                        display: "block"
                      }}
                    >
                      {showFullText[index]
                        ? "Show Less ▲"
                        : "Show More ▼"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}