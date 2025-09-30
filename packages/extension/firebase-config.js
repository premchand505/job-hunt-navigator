// File: packages/extension/firebase-config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeR2FdezQTnuP35wPYbGarqAqR_klMAmE",
  authDomain: "jobhuntnavigator-d00bf.firebaseapp.com",
  projectId: "jobhuntnavigator-d00bf",
  storageBucket: "jobhuntnavigator-d00bf.firebasestorage.app",
  messagingSenderId: "1076648023703",
  appId: "1:1076648023703:web:158e3cb52efc985da93bd2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Note: It's a best practice to use environment variables for these keys in production,
// but for a Chrome extension, this method is standard and secure as the code is client-side.