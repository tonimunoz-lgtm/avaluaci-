// ui.js - utilitats per mostrar pantalla login/app
export function showLogin(){
  const loginScreen = document.getElementById('loginScreen');
  const appRoot = document.getElementById('appRoot');
  loginScreen.style.display = 'block';
  loginScreen.classList.remove('hidden');
  appRoot.classList.add('hidden');
}

export function showApp(){
  const loginScreen = document.getElementById('loginScreen');
  const appRoot = document.getElementById('appRoot');
  loginScreen.style.display = 'none';
  loginScreen.classList.add('hidden');
  appRoot.classList.remove('hidden');
}
