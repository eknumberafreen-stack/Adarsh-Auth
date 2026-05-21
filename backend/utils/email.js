const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otp) => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || `"Adarsh Auth Security" <${user}>`;

  console.log(`📧 Attempting to send OTP email to: ${email}`);
  console.log(`📧 SMTP User: ${user ? user : 'NOT SET'}`);

  if (!user || !pass) {
    console.warn('⚠️ SMTP credentials not set in .env. Email not sent. OTP:', otp);
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  const mailOptions = {
    from,
    to: email,
    subject: `🔒 ${otp} is your Adarsh Auth password reset code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #07070a;
            color: #ffffff;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 550px;
            margin: 40px auto;
            background-color: #0f1015;
            border: 1px solid #1f2029;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          }
          .header {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 1px;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #ffffff;
          }
          .description {
            font-size: 14px;
            line-height: 1.6;
            color: #94a3b8;
            margin-bottom: 30px;
          }
          .otp-code {
            display: inline-block;
            font-size: 36px;
            font-weight: 800;
            color: #a855f7;
            background-color: #1a1523;
            border: 1px dashed #6366f1;
            padding: 12px 30px;
            border-radius: 12px;
            letter-spacing: 6px;
            margin: 10px 0 30px 0;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
          }
          .warning {
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #1f2029;
            padding-top: 20px;
            margin-top: 20px;
          }
          .footer {
            background-color: #07070a;
            padding: 20px;
            text-align: center;
            font-size: 11px;
            color: #475569;
            border-top: 1px solid #1f2029;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>ADARSH AUTH</h1>
          </div>
          <div class="content">
            <div class="greeting">Password Reset Verification</div>
            <div class="description">
              We received a request to reset your password. Use the verification code below to complete the action.
              This code will expire in <strong>10 minutes</strong>.
            </div>
            <div class="otp-code">${otp}</div>
            <div class="description">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>
            <div class="warning">
              ⚠️ Never share this verification code with anyone. Our support team will never ask for this code.
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Adarsh Auth Platform. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email successfully sent to:', email, 'MessageId:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP Email to:', email, 'Error:', error);
    return false;
  }
};

module.exports = { sendOTPEmail };
