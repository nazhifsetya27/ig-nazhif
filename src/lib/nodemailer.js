const nodemailer = require("nodemailer");

require("dotenv").config();
// console.log(process.env.nodemailer_email);

const transport = nodemailer.createTransport({
  auth: {
    user: process.env.nodemailer_email,
    pass: process.env.nodemailer_password,
  },
  host: "smtp.gmail.com",
  service: "gmail",
  port: 465,
  secure: true,
});

const mailer = async ({ subject, html, to, text }) => {
  await transport.sendMail({
    subject: subject || "testing",
    html: html || "<h1>send through api</h1>",
    to: to || "mrdwnqdry@gmail.com",
    text: text || "hello world",
  });
};

module.exports = mailer;
