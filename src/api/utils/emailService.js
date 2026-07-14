const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // Force IPv4, Render IPv6 routing is blocked
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

exports.sendDataExportEmail = async (toEmail, zipBuffer) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail credentials not configured in environment variables.");
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: 'Your Data Export - Antigravity Island',
    text: 'Hello, attached is your requested data export from Antigravity Island.',
    attachments: [
      {
        filename: 'data_export.zip',
        content: zipBuffer
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};
