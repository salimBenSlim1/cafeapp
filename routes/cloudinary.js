const express = require('express');
const router = express.Router();
const upload = require('../mulet');

router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    res.json({
      success: true,
      imageUrl: req.file.path, 
      publicId: req.file.filename 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});
module.exports=router