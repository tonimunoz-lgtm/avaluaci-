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
