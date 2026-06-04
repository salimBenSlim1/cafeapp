// routes/ai.js
const express = require('express');
const aiRouter  = express.Router();
function generateDescription({ name, category, price }) {
  const adjectives = [
    "rich", "creamy", "fresh", "delicious", "smooth",
    "aromatic", "perfectly balanced", "indulgent"
  ];

  const endings = [
    "perfect for any time of day.",
    "crafted to satisfy your cravings.",
    "a true customer favorite.",
    "made with care and quality ingredients."
  ];

  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomEnd = endings[Math.floor(Math.random() * endings.length)];

  return `${name} is a ${randomAdj} ${category || 'specialty'} priced at ${parseFloat(price).toFixed(2)} TND. ${randomEnd}`;
}

aiRouter.post('/describe-product', async (req, res) => {
  const { name, category, price, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const text = generateDescription({ name, category, price });

  res.json({ description: text });
});

module.exports = aiRouter;