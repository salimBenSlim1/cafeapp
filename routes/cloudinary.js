const express = require('express');
const router = express.Router();
const upload = require('../mulet');

// Route pour uploader une image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Cloudinary retourne automatiquement l'URL
    res.json({
      success: true,
      imageUrl: req.file.path, // URL Cloudinary
      publicId: req.file.filename // Pour supprimer plus tard si besoin
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});
module.exports=router