const crypto = require('crypto');
const Cafe = require('../models/cafe');
const Table = require('../models/table');
const Item = require('../models/item');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

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

// ─── Generate QR PDF entirely in memory (no disk I/O) ─────────────────────────
async function generateQRPDFBuffer(cafeId) {
  const tables = await Table.findAll({ where: { cafeId } });
  if (!tables.length) throw new Error('No tables found for this cafe.');

  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const qrSize   = 180;
    const cardW    = 240;
    const cardH    = 320;
    const spacing  = 30;
    const startX   = (doc.page.width - (cardW * 2 + spacing)) / 2;
    const startY   = 60;

    let currentX = startX;
    let currentY = startY;
    let count    = 0;

    for (const table of tables) {
      const url = `https://coffai.tn/client-panier?t=${table.qrKey}`;

      // Save the URL on the table record
      table.qrCodeURL = url;
      await table.save();

      // Generate QR code as a raw PNG buffer (no base64, no temp file)
      const qrBuffer = await QRCode.toBuffer(url, {
        width: qrSize * 2,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      // Draw card border
      doc.save();
      doc.rect(currentX, currentY, cardW, cardH).lineWidth(2).stroke('#000000');
      doc.restore();

      // QR code image (buffer passed directly to pdfkit)
      const qrX = currentX + (cardW - qrSize) / 2;
      const qrY = currentY + 30;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // "SCAN TO ORDER" label
      doc.font('Helvetica-Bold')
         .fontSize(16)
         .fillColor('#000000')
         .text('SCAN TO ORDER', currentX, qrY + qrSize + 15, {
           width: cardW,
           align: 'center',
         });

      // Black footer bar with table number
      const barY = currentY + cardH - 50;
      doc.rect(currentX, barY, cardW, 50).fill('#000000');
      doc.font('Helvetica-Bold')
         .fontSize(20)
         .fillColor('#FFFFFF')
         .text(`Table ${table.number}`, currentX, barY + 15, {
           width: cardW,
           align: 'center',
         });

      count++;

      if (count % 2 === 0) {
        currentX  = startX;
        currentY += cardH + spacing;
        if (currentY + cardH > doc.page.height - 40) {
          doc.addPage();
          currentY = startY;
        }
      } else {
        currentX += cardW + spacing;
      }
    }

    doc.end();
  });
}

// ─── Download QR codes as PDF (streamed directly to requester) ────────────────
async function downloadQRCodes(req, res) {
  try {
    const cafeId = req.cafe.id;

    console.log(`🔄 Generating in-memory PDF for cafe ${cafeId}...`);

    const pdfBuffer = await generateQRPDFBuffer(cafeId);

    console.log('✅ PDF generated in memory, size:', pdfBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cafe_${cafeId}_QRCodes.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

  } catch (error) {
    console.error('❌ QR PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate PDF',
        details: error.message,
      });
    }
  }
}

// ─── Provision tenant ─────────────────────────────────────────────────────────
async function provisionTenant(req, res) {
  try {
    const now        = new Date();
    const monthLater = new Date();
    monthLater.setMonth(monthLater.getMonth() + 1);
    const password = generatePassword();

    if (!req.body.cafeName || !req.body.email || !req.body.plan) {
      return res.status(400).json('invalid details');
    }

    const existing = await Cafe.findOne({ where: { email: req.body.email } });
    if (existing) return res.status(400).json('email exist');

    let numberOfTables = 20;
    if (req.body.plan === 'pro') numberOfTables = 50;
    if (req.body.plan === 'custom' && req.body.customTables) {
      numberOfTables = parseInt(req.body.customTables);
      if (isNaN(numberOfTables) || numberOfTables < 1) {
        return res.status(400).json('invalid custom table number');
      }
    }

    const tenant = await Cafe.create({
      name: req.body.cafeName,
      email: req.body.email,
      plan: req.body.plan,
      password,
      verifiedPayment: '0',
      subscriptionStartDate: now,
      subscriptionEndDate: monthLater,
      lastLoginDate: now,
    });

    const tablesData = Array.from({ length: numberOfTables }, (_, i) => ({
      cafeId: tenant.id,
      number: i + 1,
      status: 'libre',
      sessionToken: crypto.randomBytes(16).toString('hex'),
      qrKey: crypto.randomBytes(16).toString('hex'),
    }));

    await Table.bulkCreate(tablesData, { validate: true, ignoreDuplicates: true });

    await Item.bulkCreate([
      { cafeId: tenant.id, name: 'Cappuccin', price: 15, category: 'coffee', imageUrl: '/images/cappucin.jpg',   stock: 10 },
      { cafeId: tenant.id, name: 'Directe',   price: 12, category: 'coffee', imageUrl: '/images/cafecreme.jpg', stock: 10 },
      { cafeId: tenant.id, name: 'Pathé',     price: 8,  category: 'food',   imageUrl: '/images/pathé.jpg',     stock: 10 },
    ]);

    // Re-use the in-memory generator — result is a buffer (not a path)
    const pdfBuffer = await generateQRPDFBuffer(tenant.id);

    return res.status(200).json({
      tenant,
      password,
      tables: numberOfTables,
      // Return base64 so the caller can handle it however they like
      qr: pdfBuffer.toString('base64'),
    });

  } catch (err) {
    console.error('Error provisioning tenant:', err);
    return res.status(500).json({ 'internal error': err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generatePassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function authAdmin(req, res) {
  try {
    if (
      req.body.email    === 'salimbenslim@outgmail.com' &&
      req.body.password === 'eWFhdGlrc2FoYTEyM2FpemVmYmFpemV1ZmJpYXpldWJmYWl6ZXViZg=='
    ) {
      const data = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
      return res.status(200).json({ data });
    }
    res.status(400).json('unauthorized');
  } catch (e) {
    res.status(500).json('server err');
  }
}

module.exports = { provisionTenant, generateQRPDFBuffer, downloadQRCodes, authAdmin };