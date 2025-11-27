
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
// Initialize Firestore
export const db = getFirestore(app);
// Initialize Auth
export const auth = getAuth(app);
