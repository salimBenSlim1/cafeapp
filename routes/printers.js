const express = require('express');
const router = express.Router();
const  verifyServer  = require('../middleware/serverMiddlware');
const PrinterConfiguration = require('../models/printers');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================
// LOAD PRIVATE KEY
// ============================================
// Make sure your key.pem file is in the correct location
const PRIVATE_KEY_PATH = path.join(__dirname, 'key.pem');

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  console.log('✅ Private key loaded successfully');
  console.log('Key preview:', PRIVATE_KEY.substring(0, 50) + '...');
} catch (error) {
  console.error('❌ Failed to load private key:', error);
  process.exit(1);
}

// ============================================
// SIGN ENDPOINT - FIXED FOR QZ TRAY
// ============================================
router.post('/sign', verifyServer, async (req, res) => {
  try {
    const { request } = req.body;
    
    if (!request) {
      return res.status(400).json({ error: 'No request data provided' });
    }


    // Convert to string exactly as QZ sends it
    const toSign = typeof request === 'string' ? request : JSON.stringify(request);

    // Create SHA512 signature (QZ Tray requirement)
    const sign = crypto.createSign('SHA512');
    sign.update(toSign);
    sign.end();
    
    const signature = sign.sign(PRIVATE_KEY, 'base64');


    // Return signature
    res.json({ signature });

  } catch (error) {
    console.error('❌ SIGNATURE ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to sign request',
      message: error.message 
    });
  }
});


// ============================================
// GET PRINTER CONFIGURATION FOR CAFE
// ============================================
router.get('/config', verifyServer, async (req, res) => {
  try {
    const cafeId = req.server.cafeId;

    const printers = await PrinterConfiguration.findAll({
      where: { 
        cafeId,
        
      }
    });
    console.log(printers,'aze')
    // Transform to frontend format
    const config = {};
    printers.forEach(printer => {
      config[printer.type] = printer.name;
    });

    res.json({ config });

  } catch (error) {
    console.error('❌ Error fetching printer config:', error);
    res.status(500).json({ error: 'Failed to fetch printer configuration' });
  }
});

// ============================================
// UPDATE PRINTER CONFIGURATION
// ============================================
router.put('/config', verifyServer, async (req, res) => {
  try {
    const cafeId = req.server.cafeId;
    const { printers } = req.body; // { kitchen: "...", bar: "...", chicha: "..." }
    // Update or create each printer config
    console.log(printers,"azae")
    for (const [type, name] of Object.entries(printers)) {
      await PrinterConfiguration.upsert({
        cafeId: cafeId,
        type: type,
        name: name,
      });
    }

    res.json({ 
      success: true,
      message: 'Printer configuration updated' 
    });

  } catch (error) {
    console.error('❌ Error updating printer config:', error);
    res.status(500).json({ error: 'Failed to update printer configuration' });
  }
});

// ============================================
// GET AVAILABLE PRINTERS (from QZ via frontend)
// ============================================
router.post('/available', verifyServer, async (req, res) => {
  try {
    const cafeId = req.server.cafeId;
    const { printers } = req.body; // Array of printer names from QZ Tray
    console.log(printers)
    // const data=await PrinterConfiguration.create({

    // })
    // Store detected printers for this café (optional - for admin panel)
    // You can save this to a separate table if needed

    res.json({ 
      success: true,
      message: `Registered ${printers.length} printers for café ${cafeId}` 
    });

  } catch (error) {
    console.error('❌ Error registering printers:', error);
    res.status(500).json({ error: 'Failed to register printers' });
  }
});

module.exports = router;