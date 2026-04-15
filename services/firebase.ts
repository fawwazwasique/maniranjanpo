
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration for maniranjanpo
const firebaseConfig = {
  apiKey: "AIzaSyAzjiIzSqCK85EnnyWmYhT6gYRB6MgXmck",
  authDomain: "maniranjanpo.firebaseapp.com",
  projectId: "maniranjanpo",
  storageBucket: "maniranjanpo.firebasestorage.app",
  messagingSenderId: "72268852274",
  appId: "1:72268852274:web:33919d281e5519d609a02b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore and Auth services
export const db = getFirestore(app);
export const auth = getAuth(app);
