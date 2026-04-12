import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const TABS = ["Email", "Phone"];

function friendlyError(code) {
  const map = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "Email already registered. Sign in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/invalid-phone-number": "Invalid phone number. Include country code.",
    "auth/invalid-verification-code": "Incorrect OTP code.",
    "auth/too-many-requests": "Too many attempts. Please wait.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("Email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);
  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const clearError = () => setError("");

  const handleGoogle = async () => {
    setLoading(true); clearError();
    try { await signInWithPopup(auth, googleProvider); navigate("/"); }
    catch (e) { setError(friendlyError(e.code)); }
    finally { setLoading(false); }
  };

  const handleEmail = async (e) => {
    e.preventDefault(); setLoading(true); clearError();
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); clearError();
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmResult(result); setOtpSent(true);
    } catch (err) { setError(friendlyError(err.code)); window.recaptchaVerifier = null; }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setLoading(true); clearError();
    try { await confirmResult.confirm(otp); navigate("/"); }
    catch (err) { setError(friendlyError(err.code)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fade-up { opacity: 0; transform: translateY(14px); transition: opacity 0.45s ease, transform 0.45s ease; }
        .fade-up.in { opacity: 1; transform: translateY(0); }
        .g-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: #fff; border: 1px solid #E2E0D8; border-radius: 12px; padding: 11px 18px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: #1A1A18; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .g-btn:hover { border-color: #C5C3BB; background: #F7F6F2; }
        .tab-btn { flex: 1; background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 0; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #AEADA6; cursor: pointer; transition: color 0.15s, border-color 0.15s; font-weight: 500; }
        .tab-btn.active { color: #1A1A18; border-bottom-color: #1A1A18; }
        .field { width: 100%; padding: 11px 14px; border: 1px solid #E2E0D8; border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: #1A1A18; background: #fff; outline: none; transition: border-color 0.2s; }
        .field:focus { border-color: #1A1A18; }
        .field::placeholder { color: #C5C3BB; }
        .submit-btn { width: 100%; background: #1A1A18; color: #FAFAF8; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
        .submit-btn:hover:not(:disabled) { opacity: 0.85; }
        .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .link-btn { background: none; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #888780; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .link-btn:hover { color: #1A1A18; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .divider-line { flex: 1; height: 1px; background: #EEEDE8; }
      `}</style>

      <Navbar />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div className={`fade-up ${visible ? "in" : ""}`} style={{ width: "100%", maxWidth: 400, background: "#fff", border: "1px solid #EEEDE8", borderRadius: 20, padding: "36px 32px" }}>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, letterSpacing: "-0.5px", color: "#1A1A18" }}>SUSCAN</span>
            </div>
            <p style={{ fontSize: 15, color: "#888780" }}>{isSignUp ? "Create your account" : "Sign in to your account"}</p>
          </div>

          {/* Google */}
          <button className="g-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider">
            <div className="divider-line" />
            <span style={{ fontSize: 12, color: "#C5C3BB" }}>or</span>
            <div className="divider-line" />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #EEEDE8", marginBottom: 20 }}>
            {TABS.map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`}
                onClick={() => { setTab(t); clearError(); setOtpSent(false); }}>
                {t}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Email form */}
          {tab === "Email" && (
            <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="field" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="field" type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <button className="submit-btn" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
              </button>
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <button type="button" className="link-btn" onClick={() => { setIsSignUp((v) => !v); clearError(); }}>
                  {isSignUp ? "Already have an account? Sign in" : "No account? Sign up"}
                </button>
              </div>
            </form>
          )}

          {/* Phone form */}
          {tab === "Phone" && !otpSent && (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="field" type="tel" placeholder="+92 300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <p style={{ fontSize: 12, color: "#AEADA6", lineHeight: 1.5 }}>Include country code. A one-time code will be sent via SMS.</p>
              <button className="submit-btn" type="submit" disabled={loading}>{loading ? "Sending…" : "Send OTP"}</button>
            </form>
          )}

          {tab === "Phone" && otpSent && (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "#888780" }}>Code sent to <strong style={{ color: "#1A1A18" }}>{phone}</strong></p>
              <input className="field" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} style={{ letterSpacing: "4px", textAlign: "center", fontSize: 18 }} required />
              <button className="submit-btn" type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify & sign in"}</button>
              <div style={{ textAlign: "center" }}>
                <button type="button" className="link-btn" onClick={() => { setOtpSent(false); clearError(); }}>Change number</button>
              </div>
            </form>
          )}

          <div id="recaptcha-container" />

          <p style={{ fontSize: 12, color: "#C5C3BB", textAlign: "center", marginTop: 20, lineHeight: 1.5 }}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
