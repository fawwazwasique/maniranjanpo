
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration for ethenpodashboard
const firebaseConfig = {
  apiKey: "AIzaSyCKZ5_AiDMWgoIzoivtZWfVge323uS5ouk",
  authDomain: "ethenpodashboard.firebaseapp.com",
  projectId: "ethenpodashboard",
  storageBucket: "ethenpodashboard.firebasestorage.app",
  messagingSenderId: "127863031137",
  appId: "1:127863031137:web:1c3b74333be75df43b3120"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore and Auth services
export const db = getFirestore(app);
export const auth = getAuth(app);
