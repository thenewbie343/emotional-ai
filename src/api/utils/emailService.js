const nodemailer = require('nodemailer');

const dns = require('dns').promises;

const createTransporter = async () => {
  // Manually resolve the IPv4 address to completely bypass Node's stubborn IPv6 routing
  // which causes ENETUNREACH on Render's free tier.
  const addrs = await dns.resolve4('smtp.gmail.com');
  const ipv4 = addrs[0];

  return nodemailer.createTransport({
    host: ipv4,
    port: 587,
    secure: false,
    tls: {
      servername: 'smtp.gmail.com' // Ensure TLS cert matches the domain, not the IP
    },
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

  const transporter = await createTransporter();

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
