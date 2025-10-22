const QRCode = require('qrcode');
const fs = require('fs');
const crypto = require('crypto');

// créer un dossier pour stocker les QR codes
if (!fs.existsSync('./qrcodes')) {
  fs.mkdirSync('./qrcodes');
}

// nombre de tables
const numberOfTables = 20;

// base URL de ton app (changer par ton vrai domaine)
const baseUrl = 'https://moncafe.com/menu?code=';

// mapping token -> table
const tableTokens = {};

for (let i = 1; i <= numberOfTables; i++) {
  // générer un token unique sécurisé
  const token = crypto.randomBytes(6).toString('hex'); // ex: "a1b2c3d4e5f6"

  // sauvegarder le mapping
  tableTokens[token] = `Table ${i}`;

  // créer l’URL pour cette table
  const url = `${baseUrl}${token}`;

  // chemin du fichier QR code
  const outputPath = `./qrcodes/table-${i}.png`;

  // générer le QR code
  QRCode.toFile(outputPath, url, {
    color: {
      dark: '#000000',  // couleur du QR
      light: '#ffffff'  // fond blanc
    },
    width: 300
  }, function (err) {
    if (err) console.error(`❌ Erreur pour Table ${i}:`, err);
    else console.log(`✅ QR code généré pour Table ${i} -> ${outputPath}`);
  });
}

// sauvegarder les tokens dans un fichier JSON
fs.writeFileSync('./tableTokens.json', JSON.stringify(tableTokens, null, 2));
console.log('📂 tableTokens.json créé avec le mapping token -> table');
