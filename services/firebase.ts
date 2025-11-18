import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1ZDpuPAkoBcvENFlzFpz2i0YKzVvij0c",
  authDomain: "maniranjan-po-dashboard.firebaseapp.com",
  projectId: "maniranjan-po-dashboard",
  storageBucket: "maniranjan-po-dashboard.firebasestorage.app",
  messagingSenderId: "346530301911",
  appId: "1:346530301911:web:d7979d4afe904944c9ad92",
  measurementId: "G-LTEV5FV572"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore
export const db = getFirestore(app);
