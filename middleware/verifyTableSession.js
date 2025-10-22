// middlewares/verifyTableSession.js
const  Table  = require('../models/table');

module.exports = async (req, res, next) => {
  const { key, token } = req.headers;

  if (!key || !token)
    return res.status(400).json({ error: 'key ou token manquant' });

  const table = await Table.findOne({ where: { qrKey: key } });
  if (!table)
    return res.status(404).json({ error: 'Table introuvable' });

  if (table.sessionToken !== token)
    return res.status(403).json({ error: 'Session expirée ou invalide.' });

  req.table = table;
  next();
};
