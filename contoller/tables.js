const Cafe = require('../models/cafe');
const Table = require('../models/table');
const jwt=require('jsonwebtoken')

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
 try {
    const { key } = req.query;
    const table = await Table.findOne({ where:{qrKey: key} });
    if (!table) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }
    const cafe = await Cafe.findOne({where:{id:table.cafeId}});
    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }
    if (cafe.subscriptionEndDate<Date.now()){
        return res.status(401).json('unauthorized')
      }
    const token = jwt.sign(
      {
        role: 'user',
        tableId: table.id,
        tableNumber: table.number,
        cafeId: cafe.id,
        cafeName: cafe.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' } // Session expires after 8 hours
    );

    res.json({
      token,
      cafeId:cafe.name,
      tableId:table.number
    });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: err });
  }
}

};
