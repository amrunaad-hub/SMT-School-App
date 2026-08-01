const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Auto-generate itemCode
const generateItemCode = async () => {
  const prefix = 'INV-';
  const last = await InventoryItem.findOne({ itemCode: { $regex: `^${prefix}` } })
    .sort({ itemCode: -1 })
    .lean();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.itemCode.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (search && search.trim()) {
      const kw = search.trim();
      filter.$or = [
        { name: { $regex: kw, $options: 'i' } },
        { itemCode: { $regex: kw, $options: 'i' } },
      ];
    }

    const allItems = await InventoryItem.find(filter).sort({ name: 1 }).lean({ virtuals: true });

    // Filter by virtual status if requested
    let items = allItems;
    if (status && status !== 'all') {
      items = allItems.filter((item) => item.status === status);
    }

    const lowStockCount = allItems.filter((i) => i.status === 'Low Stock').length;
    const outOfStockCount = allItems.filter((i) => i.status === 'Out of Stock').length;

    return res.json({ items, total: items.length, lowStockCount, outOfStockCount });
  } catch (err) {
    console.error('GET /api/inventory error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/inventory/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id).lean({ virtuals: true });
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json(item);
  } catch (err) {
    console.error('GET /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/inventory (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const itemCode = await generateItemCode();
    const item = new InventoryItem({ ...req.body, itemCode });
    await item.save();
    const saved = await InventoryItem.findById(item._id).lean({ virtuals: true });
    return res.status(201).json(saved);
  } catch (err) {
    console.error('POST /api/inventory error:', err.message);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate item code.' });
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/inventory/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json(item);
  } catch (err) {
    console.error('PUT /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/inventory/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json({ message: 'Inventory item deleted.' });
  } catch (err) {
    console.error('DELETE /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
