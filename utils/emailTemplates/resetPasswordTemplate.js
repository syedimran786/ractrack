const sendMail = require("../sendMail");

const sendResetPasswordMail = async ({
  fullname,
  email,
  password,
}) => {
  try {
    await sendMail({
      to: email,
      subject: "Password Reset Successfully",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Password Reset Notification</h2>

          <p>Hello ${fullname},</p>

          <p>Your password has been reset successfully.</p>

          <p>
            <strong>Temporary Password:</strong>
            ${password}
          </p>

          <p>
            Please login using the above password and
            change it immediately.
          </p>

          <br/>

          <p>Regards,</p>
          <p>Rest Coder Academy</p>
        </div>
      `,
    });
  } catch (error) {
    console.error(
      "Reset password email failed:",
      error.message
    );
  }
};

module.exports = sendResetPasswordMail;