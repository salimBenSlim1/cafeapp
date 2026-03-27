const crypto = require('crypto');
const Cafe = require('../models/cafe');
const Table = require('../models/table');
const Item = require('../models/item');
const nodemailer = require('nodemailer');
const jwt=require('jsonwebtoken')
const { google } = require('googleapis');

require('dotenv').config();
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});
async function sendTestEmail(toEmail = process.env.EMAIL_USER) {
  try {
    // Get a fresh access token
    const accessToken = (await oauth2Client.getAccessToken()).token;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });
await transporter.verify();
      console.log("✅ SMTP connection successful");
    const mailOptions = {
      from: `CoffeeCloud <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '☕ Test Email from CoffeeCloud',
      text: 'This is a test email sent via Gmail OAuth2!',
      html: '<p>This is a <strong>test email</strong> sent via Gmail OAuth2!</p>',
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent:', result.response);
    return result;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}
// Génère une API Key unique

const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
function generatePassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
// Génère un fichier PDF avec les QR codes de chaque table
async function generateQRForTables(cafeId, domain) {
    
  const tables = await Table.findAll({ where: { cafeId } });
  if (!tables.length) return console.log('Aucune table trouvée pour ce café.');

  const outputDir = path.join(__dirname, '../qr_exports');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const pdfPath = path.join(outputDir, `Cafe_${cafeId}_QRCodes.pdf`);
  const doc = new PDFDocument({ 
    margin: 40,
    size: 'A4'
  });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Configuration pour 2 QR codes par ligne
  const qrSize = 180;
  const cardWidth = 240;
  const cardHeight = 320;
  const spacing = 30;
  const startX = (doc.page.width - (cardWidth * 2 + spacing)) / 2;
  const startY = 60;

  let currentX = startX;
  let currentY = startY;
  let count = 0;

  for (const table of tables) {
    // const url = `https://${domain}cafeapp.tn?t=${table.qrKey}`;
    const url = `https://coffai.tn/client-panier?t=${table.qrKey}`;
    const qrImage = await QRCode.toDataURL(url, {
      width: qrSize * 2, // Haute résolution pour l'impression
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    table.qrCodeURL=url
    await table.save()
    // Extraire l'image base64
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
    const imgPath = path.join(outputDir, `table_${table.number}.png`);
    fs.writeFileSync(imgPath, base64Data, 'base64');

    // Dessiner la carte avec bordure
    doc.save();
    doc.rect(currentX, currentY, cardWidth, cardHeight)
       .lineWidth(2)
       .stroke('#000000');
    doc.restore();

    // Ajouter le QR code centré
    const qrX = currentX + (cardWidth - qrSize) / 2;
    const qrY = currentY + 30;
    doc.image(imgPath, qrX, qrY, { 
      width: qrSize, 
      height: qrSize 
    });

    // Texte "SCAN TO ORDER" en gras sous le QR code
    const textY = qrY + qrSize + 15;
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor('#000000')
       .text('SCAN TO ORDER', currentX, textY, {
         width: cardWidth,
         align: 'center'
       });

    // Barre noire en bas
    const barY = currentY + cardHeight - 50;
    doc.rect(currentX, barY, cardWidth, 50)
       .fill('#000000');

    // Numéro de table en blanc sur fond noir
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#FFFFFF')
       .text(`Table ${table.number}`, currentX, barY + 15, {
         width: cardWidth,
         align: 'center'
       });

    count++;

    // Positionnement pour le prochain QR code
    if (count % 2 === 0) {
      // Nouvelle ligne après 2 QR codes
      currentX = startX;
      currentY += cardHeight + spacing;
      
      // Nouvelle page si nécessaire
      if (currentY + cardHeight > doc.page.height - 40) {
        doc.addPage();
        currentY = startY;
      }
    } else {
      // Colonne suivante
      currentX += cardWidth + spacing;
    }
  }

  doc.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));

  console.log(`✅ QR PDF généré: ${pdfPath}`);
  return pdfPath;
}
async function downloadQRCodes (req, res) {
  try {
    const  cafeId  = req.cafe.id
        const  domain  = "req.query"

    // Validation
    if (!cafeId || !domain) {
      return res.status(400).json({ 
        error: 'cafeId et domain sont requis' 
      });
    }

    console.log(`🔄 Génération du PDF pour café ${cafeId}...`);
    
    // Générer le PDF
    const pdfPath = await generateQRForTables(cafeId, domain);

    // Vérifier que le fichier existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error('Le PDF n\'a pas été généré correctement');
    }

    console.log('✅ PDF généré:', pdfPath);

    // Définir les headers AVANT d'envoyer
    const fileName = `Cafe_${cafeId}_QRCodes.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fs.statSync(pdfPath).size);

    // Envoyer le fichier
    const fileStream = fs.createReadStream(pdfPath);
    
    fileStream.on('error', (err) => {
      console.error('❌ Erreur lecture fichier:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors de la lecture du fichier' });
      }
    });

    fileStream.pipe(res);

    // Supprimer le fichier après envoi
    fileStream.on('end', () => {
      setTimeout(() => {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          console.log('🗑️ Fichier PDF temporaire supprimé');
        }
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Erreur génération QR PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erreur lors de la génération du PDF',
        details: error.message 
      });
    }
  }
};
// Controller pour télécharger le PDF



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

}
// Génère un mot de passe aléatoire sécurisé
async function provisionTenant(req, res) {
  try {
    const now = new Date();
    const monthLater=new Date()
    monthLater.setMonth(monthLater.getMonth()+1)
    const password = generatePassword();

    // 🧩 Check required fields
    if (!req.body.cafeName || !req.body.email || !req.body.plan) {
      return res.status(400).json('invalid details');
    }

    // 🧩 Check if email already exists
    const existing = await Cafe.findOne({ where: { email: req.body.email } });
    if (existing) {
      return res.status(400).json('email exist');
    }

    // ⚙️ Determine number of tables based on plan
    let numberOfTables = 20;
    if (req.body.plan === 'pro') numberOfTables = 50;
    if (req.body.plan === 'custom' && req.body.customTables) {
      numberOfTables = parseInt(req.body.customTables);
      if (isNaN(numberOfTables) || numberOfTables < 1) {
        return res.status(400).json('invalid custom table number');
      }
    }

    // 🏠 Create tenant
    const tenant = await Cafe.create({
      name: req.body.cafeName,
      email: req.body.email,
      plan: req.body.plan,
      password,
      verifiedPayment: '0',
      subscriptionStartDate: now,
      subscriptionEndDate: monthLater,
      lastLoginDate: now
    });

    // 🪑 Generate tables dynamically
    const tablesData = Array.from({ length: numberOfTables }, (_, i) => ({
      cafeId: tenant.id,
      number: i + 1,
      status: 'libre',
      sessionToken: crypto.randomBytes(16).toString('hex'),
      qrKey: crypto.randomBytes(16).toString('hex'),
    }));

    await Table.bulkCreate(tablesData, { validate: true, ignoreDuplicates: true });

    // ☕ Default items
    await Item.bulkCreate([
      { cafeId: tenant.id, name: 'Cappuccin', price: 15, category: 'coffee', imageUrl: '/images/cappucin.jpg', stock: 10 },
      { cafeId: tenant.id, name: 'Directe', price: 12, category: 'coffee', imageUrl: '/images/cafecreme.jpg', stock: 10 },
      { cafeId: tenant.id, name: 'Pathé', price: 8, category: 'food', imageUrl: '/images/pathé.jpg', stock: 10 },
    ]);

    // 📸 Generate QR codes
    const data = await generateQRForTables(tenant.id, req.body.domaine);

    // 📧 Send welcome email
    // try {
    //   // ✅ Get fresh access token
   

    

    //   const htmlMessage = `
    //     <!DOCTYPE html>
    //     <html>
    //     <head>
    //       <meta charset="UTF-8">
    //     </head>
    //     <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    //       <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    //         <h2 style="color: #6F4E37;">Bienvenue sur Coffai ☕</h2>
            
    //         <p>Bonjour <strong>${req.body.cafeName}</strong>,</p>

    //         <p>Nous sommes ravis de vous accueillir sur <strong>Coffai</strong> — votre solution complète pour gérer votre café facilement et efficacement !</p>

    //         <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    //           <h3 style="margin-top: 0;">Vos identifiants de connexion :</h3>
    //           <ul style="list-style: none; padding: 0;">
    //             <li><strong>Email :</strong> ${req.body.email}</li>
    //             <li><strong>Mot de passe :</strong> <code style="background-color: #fff; padding: 5px 10px; border-radius: 3px;">${password}</code></li>
    //           </ul>
    //         </div>

    //         <p>Vous pouvez vous connecter à tout moment via ce lien :<br>
    //         <a href="https://coffai.tn/login" style="color: #6F4E37; text-decoration: none; font-weight: bold;">https://coffai.tn/login</a></p>

    //         <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
    //           🔒 <strong>Important :</strong> Pour des raisons de sécurité, nous vous recommandons de sauvegarder votre mot de passe dans un endroit sûr.
    //         </p>

    //         <p>Nous vous souhaitons beaucoup de succès avec votre café et sommes ravis de vous accompagner dans cette aventure !</p>

    //         <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
    //         <p style="color: #888; font-size: 14px;">
    //           Cordialement,<br>
    //           <strong>L'équipe Coffai</strong>
    //         </p>
    //       </div>
    //     </body>
    //     </html>
    //   `;

    //   // const mailOptions = {
    //   //   from: `"Coffai Support" <${process.env.EMAIL_USER}>`,
    //   //   to: req.body.email,
    //   //   subject: '☕ Bienvenue sur Coffai !',
    //   //   html: htmlMessage,
    //   // };
    //   // sendEmailGmailAPI(req.body.email,'☕ Bienvenue sur Coffai !',htmlMessage)

    // } catch (emailError) {
    //   console.error("❌ Email sending failed:", emailError);
    //   console.error("Error details:", {
    //     message: emailError.message,
    //     code: emailError.code,
    //     command: emailError.command
    //   });
    //   // Continue anyway - don't fail the entire provisioning
    // }

    return res.status(200).json({ 
      tenant, 
      password, 
      tables: numberOfTables, 
      qr: data 
    });

  } catch (err) {
    console.error('Error provisioning tenant:', err);
    return res.status(500).json({ 'internal error': err.message });
  }
}

// Fonction principale de provisionnement

async function authAdmin(req,res){
  try {
    if (req.body.email==="salimbenslim@outgmail.com"&&req.body.password==="eWFhdGlrc2FoYTEyM2FpemVmYmFpemV1ZmJpYXpldWJmYWl6ZXViZg=="){
      const data=jwt.sign({role:'admin'},process.env.JWT_SECRET)
      return res.status(200).json({data})
    }
    res.status(400).json('unauthorized')
    
  } catch (e) {
    res.status(500).json('server err')
  }
}


module.exports={provisionTenant,generateQRForTables,downloadQRCodes,authAdmin}
