    import { initializeApp } from "firebase/app";
    import { getFirestore } from "firebase/firestore";
    import { getAuth } from "firebase/auth";

    // TODO: Replace with your app's Firebase project configuration
    // You can copy this from 'packages/extension/firebase-config.js'
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
    
