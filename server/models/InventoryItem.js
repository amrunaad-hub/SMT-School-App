const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Stationery', 'Furniture', 'Electronics', 'Sports', 'Lab Equipment', 'Cleaning Supplies', 'Books', 'Other'],
      required: true,
    },
    unit: { type: String, default: 'pcs', trim: true },
    quantityInStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    unitPrice: { type: Number },
    supplier: { type: String, trim: true },
    lastRestockedAt: { type: Date },
    location: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

inventoryItemSchema.virtual('status').get(function () {
  if (this.quantityInStock === 0) return 'Out of Stock';
  if (this.quantityInStock <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ name: 'text', itemCode: 'text' });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

module.exports = InventoryItem;
