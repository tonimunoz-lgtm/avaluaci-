// auth.js - lògica d'autenticació
import { auth, db } from './firebase.js';
import { showApp, showLogin } from './ui.js';
import { loadClassesScreen } from './classes.js';

export let professorUID = null;

export function setupAuth(btnLogin, btnRegister, btnRecover, btnLogout, usuariNom){
  btnLogin.addEventListener('click', login);
  btnRegister.addEventListener('click', register);
  btnRecover.addEventListener('click', recover);
  btnLogout.addEventListener('click', logout);

  auth.onAuthStateChanged(user => {
    if (user) {
      professorUID = user.uid;
      setupAfterAuth(user);
    } else {
      professorUID = null;
      showLogin();
    }
  });

  function login(){
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    if(!email || !pw) return alert('Introdueix email i contrasenya');
    auth.signInWithEmailAndPassword(email, pw)
      .then(u => { professorUID = u.user.uid; setupAfterAuth(u.user); })
      .catch(e => alert('Error login: ' + e.message));
  }

  function register(){
    const email = document.getElementById('loginEmail').value.trim();
    const pw = document.getElementById('loginPassword').value;
    if(!email || !pw) return alert('Introdueix email i contrasenya');
    auth.createUserWithEmailAndPassword(email, pw)
      .then(u => {
        professorUID = u.user.uid;
        db.collection('professors').doc(professorUID).set({ email, classes: [] })
          .then(()=> setupAfterAuth(u.user));
      }).catch(e => alert('Error registre: ' + e.message));
  }

  function recover(){
    const email = document.getElementById('loginEmail').value.trim();
    if(!email) return alert('Introdueix el teu email per recuperar la contrasenya');
    auth.sendPasswordResetEmail(email)
      .then(()=> alert('Email de recuperació enviat!'))
      .catch(e=> alert('Error: ' + e.message));
  }

  function logout(){
    auth.signOut().then(()=>{
      professorUID = null;
      showLogin();
    });
  }

  function setupAfterAuth(user){
    showApp();
    const email = user.email || '';
    usuariNom.textContent = email.split('@')[0] || email;
    loadClassesScreen();
  }
}
