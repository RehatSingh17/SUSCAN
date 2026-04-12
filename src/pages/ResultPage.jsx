import { useLocation, useNavigate } from "react-router-dom";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;

  if (!result) {
    return (
      <div style={{ padding: 40 }}>
        <h2>No result found</h2>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  const data = result.data;

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px" }}>Analysis Result</h1>

      {/* Input Type */}
      <p><strong>Type:</strong> {data.input_type}</p>

      {/* Word Count */}
      <p><strong>Word Count:</strong> {data.word_count}</p>

      {/* Raw Text */}
      <div style={{ marginTop: "20px" }}>
        <h3>Raw Text</h3>
        <div style={{
          background: "#f5f5f5",
          padding: "12px",
          borderRadius: "8px",
          whiteSpace: "pre-wrap"
        }}>
          {data.raw_text || "No raw text found"}
        </div>
      </div>

      {/* Cleaned Text (MAIN OUTPUT) */}
      <div style={{ marginTop: "20px" }}>
        <h3>Cleaned Text ✅</h3>
        <div style={{
          background: "#e6fffa",
          padding: "12px",
          borderRadius: "8px",
          whiteSpace: "pre-wrap",
          border: "1px solid #b2f5ea"
        }}>
          {data.cleaned_text || "No cleaned text found"}
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "30px",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          background: "#1A1A18",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        ← Back
      </button>
    </div>
  );
}