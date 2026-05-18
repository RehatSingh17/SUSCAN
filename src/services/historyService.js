import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  serverTimestamp,
} from "firebase/firestore";

import {
  deleteDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase/config";


// ─────────────────────────────
// SAVE SEARCH
// ─────────────────────────────
export async function saveSearchHistory({
  userId,
  inputType,
  query,
  result,
  focusRegions = [],
}) {

  if (!userId || userId === "anonymous") {
    return;
  }

  try {

    await addDoc(
      collection(db, "search_history"),
      {
        userId,

        inputType,

        query,

        focusRegions,

        result,

        createdAt: serverTimestamp(),
      }
    );

  } catch (err) {

    console.error(
      "Failed to save history:",
      err
    );
  }
}


export async function deleteHistoryItem(id) {

  try {

    await deleteDoc(
      doc(db, "search_history", id)
    );

  } catch (err) {

    console.error(
      "Failed to delete history item:",
      err
    );
  }
}

// ─────────────────────────────
// GET HISTORY
export async function getUserHistory(userId) {

  try {

    const q = query(
      collection(db, "search_history"),

      where("userId", "==", userId),

      orderBy("createdAt", "desc"),

      limit(50)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (err) {

    console.error(
      "Failed to fetch history:",
      err
    );

    return [];
  }
}