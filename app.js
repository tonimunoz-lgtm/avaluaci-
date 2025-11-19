// app.js
import { openModal, closeModal, confirmAction } from './modals.js';
import { loadClassesScreen, openClass, loadClassData } from './screens.js';
import { authListeners, setupAfterAuth } from './auth.js';
import { btnLogin, btnRegister, btnRecover, btnLogout, btnCreateClass } from './elements.js';
import { btnImportAL } from './elements.js';
import { initMobileStudentsUI } from './students.js';
import { initImportAL } from './import.js';
import { initUserMenu } from './menu.js';
import { firebaseConfig, auth, db, professorUID, setProfessorUID } from './firebase.js';

// Inicialitzar Firebase
firebase.initializeApp(firebaseConfig);

// ---------------- Globals ----------------
let currentClassId = null;
let classStudents = [];
let classActivities = [];
let deleteMode = false;
let currentCalcActivityId = null;

// ---------------- Elements ----------------
// (Si vols, podem passar tots els elements a elements.js)
const loginScreen = document.getElementById('loginScreen');
const appRoot = document.getElementById('appRoot');
const usuariNom = document.getElementById('usuariNom');
const screenClasses = document.getElementById('screen-classes');
const screenClass = document.getElementById('screen-class');
const classesGrid = document.getElementById('classesGrid');

// ---------- UTILS ---------- 
export function showLogin() {
  loginScreen.style.display = 'block';
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}
export function showApp() {
  loginScreen.style.display = 'none';
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}

// ---------------- AUTH ----------------
authListeners({
  onLogin: (user) => {
    setProfessorUID(user.uid);
    setupAfterAuth(user, { showApp, usuariNom, loadClassesScreen });
  },
  onLogout: () => {
    setProfessorUID(null);
    showLogin();
  }
});

// Botons globals
btnCreateClass.addEventListener('click', ()=> openModal('modalCreateClass'));
btnImportAL.addEventListener('click', ()=> openModal('modalImportAL'));

// Inicialitzar UI mòbil i menús
initMobileStudentsUI();
initUserMenu();

// Import alumnes
initImportAL({ db, classStudents, currentClassId, loadClassData, closeModal });

// firebase.js
export const firebaseConfig = {
  apiKey: "AIzaSyA0P7TWcEw9y9_13yqRhvsgWN5d3YKH7yo",
  authDomain: "gestornotes-cc6d0.firebaseapp.com",
  projectId: "gestornotes-cc6d0",
  storageBucket: "gestornotes-cc6d0.firebasestorage.app",
  messagingSenderId: "324570393360",
  appId: "1:324570393360:web:13a65fcf948813805c5395"
};

export const auth = firebase.auth();
export const db = firebase.firestore();

export let professorUID = null;
export function setProfessorUID(uid) {
  professorUID = uid;
}
