const crypto = require("crypto");
const Cafe = require("../models/cafe");
const bcrypt=require('bcrypt')
module.exports={
    login:async(req, res) => {
  const { email, password } = req.body;

  const cafe = await Cafe.findOne({ where: { email } });
  if (!cafe) return res.status(404).json({ error: "Email introuvable" });
  const valid=cafe.password===password
  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

  res.status(200).json({ apiKey: cafe.apiKey })

}
}
async function createCafe(data) {
  const apiKey = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // صالح لعام

  const cafe = await Cafe.create({
    name: data.name,
    email: data.email,
    plan: data.plan,
    apiKey,
    apiKeyExpiresAt: expiresAt,
  });

  return cafe;
}
