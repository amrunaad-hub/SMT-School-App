const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { serializeRow } = require('../utils/serialize');

const CAMEL_TO_SNAKE = {
  name: 'name', category: 'category', unit: 'unit', quantityInStock: 'quantity_in_stock',
  reorderLevel: 'reorder_level', unitPrice: 'unit_price', supplier: 'supplier',
  lastRestockedAt: 'last_restocked_at', location: 'location',
};

function bodyToRow(body) {
  const row = {};
  Object.entries(body).forEach(([key, value]) => {
    const column = CAMEL_TO_SNAKE[key];
    if (column) row[column] = value;
  });
  return row;
}

// Mirrors the old Mongoose virtual: status derived from stock level, not stored.
function withStatus(row) {
  const item = serializeRow(row);
  if (item.quantityInStock === 0) item.status = 'Out of Stock';
  else if (item.quantityInStock <= item.reorderLevel) item.status = 'Low Stock';
  else item.status = 'In Stock';
  return item;
}

// Auto-generate itemCode
const generateItemCode = async () => {
  const prefix = 'INV-';
  const last = await db('inventory_items').where('item_code', 'like', `${prefix}%`).orderBy('item_code', 'desc').first();
  if (!last) return `${prefix}001`;
  const num = parseInt(last.item_code.slice(prefix.length), 10) || 0;
  return `${prefix}${String(num + 1).padStart(3, '0')}`;
};

// GET /api/inventory
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = db('inventory_items');
    if (category && category !== 'all') query = query.where({ category });
    if (search && search.trim()) {
      const kw = `%${search.trim()}%`;
      query = query.where((qb) => {
        qb.whereRaw('name LIKE ? COLLATE NOCASE', [kw]).orWhereRaw('item_code LIKE ? COLLATE NOCASE', [kw]);
      });
    }

    const rows = await query.orderBy('name', 'asc');
    const allItems = rows.map(withStatus);

    let items = allItems;
    if (status && status !== 'all') items = allItems.filter((item) => item.status === status);

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
    const item = await db('inventory_items').where({ id: req.params.id }).first();
    if (!item) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json(withStatus(item));
  } catch (err) {
    console.error('GET /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/inventory (admin)
router.post('/', auth, authorize(['admin']), async (req, res) => {
  try {
    const itemCode = await generateItemCode();
    const now = new Date().toISOString();
    const [id] = await db('inventory_items').insert({ ...bodyToRow(req.body), item_code: itemCode, created_at: now, updated_at: now });
    const item = await db('inventory_items').where({ id }).first();
    return res.status(201).json(withStatus(item));
  } catch (err) {
    console.error('POST /api/inventory error:', err.message);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Duplicate item code.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/inventory/:id (admin)
router.put('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const updates = { ...bodyToRow(req.body), updated_at: new Date().toISOString() };
    const count = await db('inventory_items').where({ id: req.params.id }).update(updates);
    if (!count) return res.status(404).json({ message: 'Inventory item not found.' });
    const item = await db('inventory_items').where({ id: req.params.id }).first();
    return res.json(withStatus(item));
  } catch (err) {
    console.error('PUT /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/inventory/:id (admin)
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  try {
    const count = await db('inventory_items').where({ id: req.params.id }).delete();
    if (!count) return res.status(404).json({ message: 'Inventory item not found.' });
    return res.json({ message: 'Inventory item deleted.' });
  } catch (err) {
    console.error('DELETE /api/inventory/:id error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
