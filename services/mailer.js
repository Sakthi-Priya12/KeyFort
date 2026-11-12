'use strict';
const config = require('../config/env');

/** Sends the reset e-mail when SMTP is configured. Never logs the link or token. */
async function sendResetEmail(to, link) {
  if (!config.SMTP.configured) return { sent: false };
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.SMTP.host, port: config.SMTP.port, secure: config.SMTP.port === 465,
    auth: config.SMTP.user ? { user: config.SMTP.user, pass: config.SMTP.pass } : undefined,
  });
  await transporter.sendMail({
    from: config.SMTP.from, to,
    subject: 'Reset your KeyFort password',
    text: `Use this link to reset your password. It expires in ${config.RESET_TOKEN_MINUTES} minutes and works once:\n\n${link}\n\nIf you did not request this, ignore this e-mail.`,
  });
  return { sent: true };
}

module.exports = { sendResetEmail };
