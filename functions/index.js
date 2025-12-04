const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // o el teu servei SMTP
  auth: {
    user: 'el.teu.email@gmail.com',
    pass: 'la_teva_contrasenya_app'
  }
});

exports.sendMail = functions.https.onCall(async (data, context) => {
  const { email, subject, body } = data;
  await transporter.sendMail({
    from: 'el.teu.email@gmail.com',
    to: email,
    subject,
    text: body
  });
  return { success: true };
});

// ---------------- ELIMINAR USUARI COMPLETAMENT ----------------
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();

exports.deleteUserCompletely = functions.https.onCall(async (data, context) => {
  // Comprovació autenticació
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No estàs autenticat.');
  }

  // Comprovació si és admin
  const callerDoc = await admin.firestore().collection('professors').doc(context.auth.uid).get();
  if (!callerDoc.exists || !callerDoc.data().isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'No tens permisos.');
  }

  const uidToDelete = data.uid;
  if (!uidToDelete) {
    throw new functions.https.HttpsError('invalid-argument', 'No s’ha proporcionat UID.');
  }

  try {
    // 1️⃣ Eliminar de Firebase Auth
    await admin.auth().deleteUser(uidToDelete);

    // 2️⃣ Eliminar de Firestore
    await admin.firestore().collection('professors').doc(uidToDelete).delete();

    return { success: true, message: 'Usuari eliminat completament.' };
  } catch (error) {
    throw new functions.https.HttpsError('unknown', error.message);
  }
});

