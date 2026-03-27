const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendEmailGmailAPI(to, subject, body) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const emailLines = [
    `From: "CoffeeCloud" <${process.env.EMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    body
  ];
  const email = emailLines.join('\n');

  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  console.log('Email sent:', res.data);
}
sendEmailGmailAPI('salimbenslim09@gmail.com', 'Test Email', '<h1>Hello!</h1>')
  .catch(console.error);
