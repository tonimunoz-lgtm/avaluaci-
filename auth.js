// auth.js
import { auth } from './firebase.js'; // assumeixes que tens firebase inicialitzat aquí

// ---------------- Login ----------------
export async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    console.log('Usuari autenticat correctament');
  } catch(e) {
    console.error('Error login:', e);
    throw e;
  }
}

// ---------------- Logout ----------------
export async function logout() {
  try {
    await auth.signOut();
    console.log('Usuari tancat correctament');
  } catch(e) {
    console.error('Error logout:', e);
    throw e;
  }
}

// ---------------- Canviar contrasenya ----------------
export async function changePassword(newPassword) {
  const user = auth.currentUser;
  if(!user) throw new Error('No hi ha cap usuari actiu');
  try {
    await user.updatePassword(newPassword);
    console.log('Contrasenya canviada correctament');
  } catch(e) {
    console.error('Error canviant contrasenya:', e);
    throw e;
  }
}

// ---------------- Reset contrasenya per email ----------------
export async function sendPasswordReset(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    console.log('Email de reset enviat correctament');
  } catch(e) {
    console.error('Error enviant reset de contrasenya:', e);
    throw e;
  }
}

// ---------------- Obtenir usuari actual ----------------
export function getCurrentUser() {
  return auth.currentUser || null;
}

// ---------------- Event listener botó menú ----------------
export function setupUserMenu(userMenuBtn, userMenu, changePasswordBtn) {
  if(!userMenuBtn || !userMenu || !changePasswordBtn) return;

  // Toggle menú
  userMenuBtn.addEventListener('click', e => {
    e.stopPropagation();
    userMenu.classList.toggle('hidden');
  });

  // Tancar menú si clics fora
  document.addEventListener('click', () => {
    userMenu.classList.add('hidden');
  });

  // Canviar contrasenya
  changePasswordBtn.addEventListener('click', async () => {
    const newPw = prompt('Introdueix la nova contrasenya:');
    if(!newPw) return;
    try {
      await changePassword(newPw);
      alert('Contrasenya canviada correctament!');
    } catch(e) {
      alert('Error: ' + e.message);
    }
  });
}
