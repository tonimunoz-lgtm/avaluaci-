// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ---------------- FIREBASE CONFIG ----------------
const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fcf948813805c5395"
};

// Inicialitza Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
