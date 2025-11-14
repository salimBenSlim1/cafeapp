const express = require('express');
const PrinterRouter = express.Router();
const Printer = require('../models/printers');
const Cafe = require('../models/cafe');

// Get all printers (optionally by cafeId)
PrinterRouter.get('/printers', async (req, res) => {
  try {
    const { id } = req.cafe;
    const printers = await Printer.findAll({ where:{cafeId:id} });
    res.json(printers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch printers' });
  }
});

// Get a single printer by id
// Create a new printer
PrinterRouter.post('/addPrinter', async (req, res) => {
  try {
    const { ipAddress, type } = req.body;
    const cafeId=req.cafe.id
    // Optional: validate cafe exists

    const newPrinter = await Printer.create({ ipAddress, type, cafeId });
    res.status(201).json(newPrinter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create printer' });
  }
});

// Update printer
PrinterRouter.put('/updatePrinter/:id', async (req, res) => {
  try {
    const { ipAddress, type } = req.body
    const cafeId=req.cafe.id
    const printer = await Printer.findOne({where:{id:req.params.id,cafeId}});
    if (!printer) return res.status(404).json({ error: 'Printer not found' });
    await printer.update({ ipAddress, type, cafeId });
    res.json(printer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update printer' });
  }
});

// Delete printer
PrinterRouter.delete('/deletePrinter/:id', async (req, res) => {
  try {
    const cafeId=req.cafe.id
    const printer = await Printer.findOne({where:{id:req.params.id,cafeId}});
    if (!printer) return res.status(404).json({ error: 'Printer not found' });
    await printer.destroy();
    res.json({ message: 'Printer deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete printer' });
  }
});

module.exports = PrinterRouter;
