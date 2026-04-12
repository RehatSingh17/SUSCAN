import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "firebase/auth";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNewName(user.displayName ?? "");
    }
  }, [user]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === user.displayName) {
      setIsEditingName(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile(user, { displayName: newName.trim() });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
    setIsSaving(false);
    setIsEditingName(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 32px", borderBottom: "1px solid #EEEDE8",
      background: "#FAFAF8", position: "sticky", top: 0, zIndex: 10,
    }}>
      <div
        onClick={() => navigate("/")}
        style={{ display: "flex", alignItems: "baseline", gap: 2, cursor: "pointer" }}
      >
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, letterSpacing: "-0.5px", color: "#1A1A18" }}>SUSCAN</span>
      </div>

      <div style={{ display: "flex", gap: 28 }}>
        {[["Home", "/"], ["History", "/history"], ["Sources", "/sources"], ["About", "/about"]].map(([label, path]) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              background: "none", border: "none", fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, color: location.pathname === path ? "#1A1A18" : "#888780",
              cursor: "pointer", padding: "6px 0", transition: "color 0.15s",
              fontWeight: location.pathname === path ? 500 : 400,
            }}
          >{label}</button>
        ))}
      </div>

      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }} ref={menuRef}>
          <div
            title="Profile menu"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#1A1A18", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 600,
              color: "#FAFAF8", cursor: "pointer", userSelect: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >{initials}</div>
          
          {menuOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 10,
              background: "#fff",
              border: "1px solid #EEEDE8",
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              padding: "8px 0",
              minWidth: 180,
              zIndex: 20,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              <div style={{ padding: "8px 16px", borderBottom: "1px solid #EEEDE8", marginBottom: 8 }}>
                {isEditingName ? (
                  <form onSubmit={handleSaveName} style={{ display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      disabled={isSaving}
                      style={{ flex: 1, minWidth: 0, fontSize: 13, padding: "4px 6px", border: "1px solid #1A1A18", borderRadius: 6, outline: "none", fontFamily: "'DM Sans', sans-serif" }}
                      placeholder="Your name"
                    />
                    <button type="submit" disabled={isSaving} style={{ background: "#F7F6F2", border: "1px solid #EEEDE8", borderRadius: 6, padding: "0 8px", cursor: isSaving ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 500, color: "#1A1A18", fontFamily: "'DM Sans', sans-serif" }}>
                      {isSaving ? "..." : "Save"}
                    </button>
                  </form>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#888780", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.displayName ?? user.email ?? user.phoneNumber}
                    </span>
                    <button onClick={() => setIsEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#AEADA6", padding: 2, transition: "color 0.15s" }} onMouseEnter={(e)=>e.target.style.color="#1A1A18"} onMouseLeave={(e)=>e.target.style.color="#AEADA6"} title="Rename">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => { setMenuOpen(false); navigate("/"); }}
                style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: "#1A1A18", cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "#F7F6F2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >Home</button>
              
              <button
                onClick={() => { setMenuOpen(false); navigate("/history"); }}
                style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: "#1A1A18", cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "#F7F6F2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >History</button>
              
              <button
                onClick={() => { setMenuOpen(false); navigate("/sources"); }}
                style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: "#1A1A18", cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "#F7F6F2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >Sources</button>
              
              <button
                onClick={() => { setMenuOpen(false); navigate("/about"); }}
                style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: "#1A1A18", cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "#F7F6F2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >About</button>

              <div style={{ height: 1, background: "#EEEDE8", margin: "8px 0" }} />
              
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                style={{ width: "100%", padding: "8px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: "#991B1B", cursor: "pointer" }}
                onMouseEnter={(e) => e.target.style.background = "#FEF2F2"}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >Sign out</button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "#1A1A18", color: "#FAFAF8", border: "none",
            borderRadius: 8, padding: "7px 16px", fontSize: 13,
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
            cursor: "pointer", letterSpacing: "-0.1px",
          }}
        >Sign in</button>
      )}
    </nav>
  );
}
