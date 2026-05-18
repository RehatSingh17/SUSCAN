const BASE_URL =
  import.meta.env.VITE_API_URL
  || "http://localhost:8000";


// ─────────────────────────────────────────────
// 🔹 ANALYSE TEXT
// ─────────────────────────────────────────────
export async function analyseText(

  text,

  userId,

  focusRegions = []

) {

  const formData = new FormData();

  formData.append(
    "content",
    text
  );

  formData.append(
    "user_id",
    userId ?? "anonymous"
  );

  // send focus mode selections
  formData.append(
    "focus_regions",
    JSON.stringify(focusRegions)
  );

  const res = await fetch(
    `${BASE_URL}/analyse`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!res.ok) {

    const err = await res.text();

    console.error(
      "Text API Error:",
      err
    );

    throw new Error(
      "Analysis failed"
    );
  }

  return res.json();
}


// ─────────────────────────────────────────────
// 🔹 ANALYSE IMAGE
// ─────────────────────────────────────────────
export async function analyseImage(

  file,

  userId,

  focusRegions = []

) {

  const formData = new FormData();

  formData.append(
    "file",
    file
  );

  formData.append(
    "user_id",
    userId ?? "anonymous"
  );

  // send focus mode selections
  formData.append(
    "focus_regions",
    JSON.stringify(focusRegions)
  );

  const res = await fetch(
    `${BASE_URL}/analyse`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!res.ok) {

    const err = await res.text();

    console.error(
      "Image API Error:",
      err
    );

    throw new Error(
      "Analysis failed"
    );
  }

  return res.json();
}


// ─────────────────────────────────────────────
// 🔹 GET HISTORY
// ─────────────────────────────────────────────
export async function getHistory(
  userId
) {

  const res = await fetch(
    `${BASE_URL}/history/${userId}`
  );

  if (!res.ok) {

    const err = await res.text();

    console.error(
      "History API Error:",
      err
    );

    throw new Error(
      "Failed to fetch history"
    );
  }

  return res.json();
}


// ─────────────────────────────────────────────
// 🔹 GET TRENDING
// ─────────────────────────────────────────────
export async function getTrending() {

  const res = await fetch(
    `${BASE_URL}/trending`
  );

  if (!res.ok) {

    const err = await res.text();

    console.error(
      "Trending API Error:",
      err
    );

    throw new Error(
      "Failed to fetch trending"
    );
  }

  return res.json();
}