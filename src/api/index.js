const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function analyseText(text, userId) {
  const res = await fetch(`${BASE_URL}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text", content: text, user_id: userId }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function analyseImage(file, userId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId ?? "anonymous");
  const res = await fetch(`${BASE_URL}/analyse`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function getHistory(userId) {
  const res = await fetch(`${BASE_URL}/history/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getTrending() {
  const res = await fetch(`${BASE_URL}/trending`);
  if (!res.ok) throw new Error("Failed to fetch trending");
  return res.json();
}
