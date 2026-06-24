const nodemailer = require("nodemailer");

const sendMail = async ({
  to,
  subject,
  html,
}) => {
  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

  return await transporter.sendMail({
    from: `"Rest Coder Academy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendMail;