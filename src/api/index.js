const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────
// 🔹 COMMON RESPONSE HANDLER
// ─────────────────────────────────────────────
async function handleResponse(res) {
  if (!res.ok) {
    let errorMessage = "Request failed";
    try {
      const err = await res.text();
      console.error("API Error:", err);
      errorMessage = err;
    } catch {
      console.error("Unknown API error");
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// 🔹 ANALYSE TEXT
// ✅ Sends JSON to POST /analyse
// ─────────────────────────────────────────────
export async function analyseText(text, userId, focusRegions = []) {
  const res = await fetch(`${BASE_URL}/analyse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",   // ← backend Pydantic model needs this
    },
    body: JSON.stringify({
      content: text,
      user_id: userId || "anonymous",
      focus_regions: focusRegions,
    }),
  });

  return handleResponse(res);
}

// ─────────────────────────────────────────────
// 🔹 ANALYSE IMAGE
// ✅ Sends FormData to POST /analyse/image
// ─────────────────────────────────────────────
export async function analyseImage(file, userId, focusRegions = []) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId || "anonymous");
  formData.append("focus_regions", JSON.stringify(focusRegions));

  const res = await fetch(`${BASE_URL}/analyse/image`, {   // ← correct endpoint
    method: "POST",
    body: formData,
    // ❌ Do NOT set Content-Type header manually —
    //    browser sets it automatically with the correct boundary
  });

  return handleResponse(res);
}

// ─────────────────────────────────────────────
// 🔹 GET HISTORY
// ─────────────────────────────────────────────
export async function getHistory(userId) {
  const res = await fetch(`${BASE_URL}/history/${userId}`);
  return handleResponse(res);
}

// ─────────────────────────────────────────────
// 🔹 GET TRENDING
// ─────────────────────────────────────────────
export async function getTrending() {
  const res = await fetch(`${BASE_URL}/trending`);
  return handleResponse(res);
}