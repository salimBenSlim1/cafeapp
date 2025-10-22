const crypto = require('crypto');
const Cafe = require('../models/cafe');
const Table = require('../models/table');
const Item = require('../models/item');

// Génère une API Key unique
function generateApiKey() {
  return crypto.randomBytes(16).toString('hex'); // 32 caractères hex
}
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
    const url = `https://cafeapp-frontend-lij4.vercel.app/client-panier?t=${table.qrKey}`;
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




// Génère un mot de passe aléatoire sécurisé

// Fonction principale de provisionnement
async function provisionTenant(req,res) {
    const now=new Date()
    const apiKeyExpiresAt=now.getFullYear()+1
  const password = generatePassword(); // on génère le password ici
  const tenant = await Cafe.create({
    name: req.body.cafeName,
    email: req.body.email,
    plan: req.body.plan,
    apiKey: generateApiKey(),
    password: password, // ajout du password
    apiKeyExpiresAt
  }).then(async(tenant)=>{
      const tablesData = [
  { cafeId: tenant.id, number: 1,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 2 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 3,status:'libre' ,sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 4 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 5 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 6 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 7 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 8 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 9 ,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
  { cafeId: tenant.id, number: 10,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 11,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 12,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 13,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 14,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 15,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 16,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 17,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 18,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 19,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex") },
  { cafeId: tenant.id, number: 20,status:'libre',sessionToken:crypto.randomBytes(16).toString("hex"),qrKey:crypto.randomBytes(16).toString("hex")},
];

await Table.bulkCreate(tablesData, { validate: true, ignoreDuplicates: true });

    await Item.bulkCreate([
      { cafeId: tenant.id, name: 'Cappuccin', price: 15, category: 'Coffee',imageUrl:'/images/cappucin.jpg',stock:10 },
      { cafeId: tenant.id, name: 'Directe', price: 12, category: 'Coffee',imageUrl:'/images/cafecreme.jpg',stock:10 },
      { cafeId: tenant.id, name: 'Pathé', price: 8, category: 'Food',imageUrl:'/images/pathé.jpg' ,stock:10},
    ]);
    
    const data=await generateQRForTables(tenant.id,req.body.domaine);
    return res.status(200).json(tenant,password,data)
  })

  // 🪑 Tables par défaut

  // ☕ Produits par défaut

  // 📸 Génération QR

  // 👤 Création admin
  
}
// Controller pour télécharger le PDF

module.exports={provisionTenant,generateQRForTables,downloadQRCodes}
