import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, letterSpacing: "-0.5px", color: "#1A1A18" }}>verify</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#AEADA6", fontWeight: 400 }}>.ai</span>
      </div>

      <div style={{ display: "flex", gap: 28 }}>
        {[["History", "/history"], ["Sources", "/sources"], ["About", "/about"]].map(([label, path]) => (
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#888780", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.displayName ?? user.email ?? user.phoneNumber}
          </span>
          <div
            title="Sign out"
            onClick={handleLogout}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#1A1A18", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 600,
              color: "#FAFAF8", cursor: "pointer", userSelect: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >{initials}</div>
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
