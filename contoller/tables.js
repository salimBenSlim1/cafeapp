const Table = require('../models/table');
const crypto = require("crypto");

module.exports = {
  getQRCodes: async (req, res) => {
    try {
      const cafeId = req.cafe.id; // يجي من الـmiddleware متاع التوثيق
      const tables = await Table.findAll({
        where: { cafeId },
        attributes: ['id', 'number', 'qrCodeURL','assignedTo']
      });

      res.status(200).json(tables);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Internal server error', error: e.message });
    }
  },
  downloadQR:async (req, res) => {
  const cafeId = req.cafe.id;
  const pdfPath = path.join(__dirname, `../qr_exports/Cafe_${cafeId}_QRCodes.pdf`);
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath);
  } else {
    res.status(404).json({ message: 'PDF not found' });
  }
},

 startSession:async(req, res)=> {
  const { key } = req.query;
  if (!key) return res.status(400).json('key not found')
  const table = await Table.findOne({ where: { qrKey: key } });
  if (!table) return res.status(404).json({ error: "Table introuvable" });

  const newToken = crypto.randomBytes(16).toString("hex");
  table.sessionToken = newToken;
  await table.save();

  res.json({ token: newToken, tableNumber: table.id,cafeId:table.cafeId,tableId:table.number });
}

};
