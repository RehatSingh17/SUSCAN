import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCd0U3tF5xWgEq7BXGMlrrfBkM518F1aZA",
  authDomain: "suscan-2121f.firebaseapp.com",
  projectId: "suscan-2121f",
  storageBucket: "suscan-2121f.firebasestorage.app",
  messagingSenderId: "372175377657",
  appId: "1:372175377657:web:5c0399e5210d9089987e28",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
