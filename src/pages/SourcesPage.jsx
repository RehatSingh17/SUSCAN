import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

const SOURCES = [
  { name: "Reuters Fact Check", url: "reuters.com", description: "Global news organization dedicated to verifying claims." },
  { name: "AFP Fact Check", url: "factcheck.afp.com", description: "International fact-checking network covering multiple regions." },
  { name: "AP News Fact Check", url: "apnews.com", description: "Independent journalism exposing misinformation." },
  { name: "Snopes", url: "snopes.com", description: "One of the oldest and most trusted internet reference sources." },
  { name: "Local News Networks", url: "Various", description: "Aggregated reporting from verified and traditional local news channels." },
];

export default function SourcesPage() {
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
        .source-card { background: #fff; border: 1px solid #EEEDE8; border-radius: 12px; padding: 20px; margin-bottom: 12px; transition: border-color 0.15s, transform 0.15s; }
        .source-card:hover { border-color: #C5C3BB; transform: translateY(-2px); }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className={`fade-up ${visible ? "in" : ""}`}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, letterSpacing: "-0.5px", color: "#1A1A18", marginBottom: 8 }}>
            Our Sources
          </h1>
          <p style={{ fontSize: 15, color: "#888780", marginBottom: 32 }}>
            SUSCAN aggregates data from verified news outlets and fact-checking organizations to ensure you get the most accurate context.
          </p>

          <div>
            {SOURCES.map((s, i) => (
              <div key={i} className="source-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A18" }}>{s.name}</h3>
                  <span style={{ fontSize: 13, color: "#AEADA6", fontFamily: "monospace" }}>{s.url}</span>
                </div>
                <p style={{ fontSize: 14, color: "#888780", lineHeight: 1.5 }}>{s.description}</p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: 40, padding: "24px", background: "#F7F6F2", borderRadius: 12, border: "1px dashed #C5C3BB", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#888780" }}>
              Are you a recognized fact-checking organization? <br/>
              <a href="#" style={{ color: "#1A1A18", fontWeight: 500, textDecoration: "underline" }}>Apply to join our network</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
