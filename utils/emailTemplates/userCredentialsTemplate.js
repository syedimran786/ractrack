const userCredentialsTemplate = ({
  fullname,
  email,
  password,
  role,
}) => {

  
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      
      <h2>Hello, ${fullname} Your account has been created successfully. <br/>
       Below are your Login Credentials</h2>

      <table cellpadding="8" cellspacing="0" border="1">
        <tr>
          <td><strong>Email</strong></td>
          <td>${email}</td>
        </tr>

        <tr>
          <td><strong>Password</strong></td>
          <td>${password}</td>
        </tr>

        <tr>
          <td><strong>Role</strong></td>
          <td>${role}</td>
        </tr>
      </table>

      <br/>

      <p>
        Please login and change your password after first login.
      </p>

      <br/>

      <p>
        Regards,<br/>
        Student Management Team
      </p>

    </div>
  `;
};

module.exports = userCredentialsTemplate;