
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration for ethenpo-3afb3
const firebaseConfig = {
  apiKey: "AIzaSyAChppSkKwwbWk3Pmc23xXMcEKgvc1MpI0",
  authDomain: "ethenpo-3afb3.firebaseapp.com",
  projectId: "ethenpo-3afb3",
  storageBucket: "ethenpo-3afb3.firebasestorage.app",
  messagingSenderId: "27456690712",
  appId: "1:27456690712:web:6e8a5755ab3042a4c9016d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore and Auth services
export const db = getFirestore(app);
export const auth = getAuth(app);
