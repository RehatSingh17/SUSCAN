import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

export default function AboutPage() {
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
        .content-block { background: #fff; border: 1px solid #EEEDE8; border-radius: 16px; padding: 32px 40px; margin-bottom: 24px; line-height: 1.7; font-size: 15px; color: "#444441"; }
      `}</style>

      <Navbar />

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className={`fade-up ${visible ? "in" : ""}`}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, letterSpacing: "-0.5px", color: "#1A1A18", marginBottom: 12 }}>
              About <span style={{ color: "#1A1A18" }}>SUSCAN</span>
            </h1>
            <p style={{ fontSize: 16, color: "#888780", maxWidth: 500, margin: "0 auto" }}>
              Our mission is to help people navigate the digital landscape with clarity and confidence.
            </p>
          </div>

          <div className="content-block">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 16, color: "#1A1A18" }}>The Problem</h2>
            <p style={{ marginBottom: 16, color: "#444441" }}>
              In today's hyper-connected world, misinformation spreads faster than ever before. Headlines, images, and out-of-context quotes can quickly go viral, shaping public perception before fact-checkers even have a chance to respond.
            </p>
            <p style={{ color: "#444441" }}>
              We realized that people needed a simple, accessible way to verify the authenticity of the content they consume daily without having to spend hours doing their own research.
            </p>
          </div>

          <div className="content-block">
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginBottom: 16, color: "#1A1A18" }}>How SUSCAN Works</h2>
            <p style={{ marginBottom: 16, color: "#444441" }}>
              SUSCAN acts as your personal verification assistant. By leveraging state-of-the-art AI alongside trusted global sources, we streamline the fact-checking process.
            </p>
            <p style={{ marginBottom: 16, color: "#444441" }}>
              Whether you paste a textual claim or upload an image, SUSCAN analyzes the context, checks for manipulation, and cross-references the topic against a vast database of verified reports. The result is a clear, concise summary of the truth, complete with reliability scores and direct source links.
            </p>
            <p style={{ color: "#444441" }}>
              Our goal isn't to tell you what to think, but to give you the verified facts so you can form your own conclusions.
            </p>
          </div>
          
        </div>
      </main>
    </div>
  );
}
