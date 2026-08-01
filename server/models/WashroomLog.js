const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema(
  {
    item: { type: String, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const washroomLogSchema = new mongoose.Schema(
  {
    location: { type: String, trim: true },
    floor: { type: Number, min: 1, max: 6, required: true },
    type: { type: String, enum: ['girls', 'boys'], required: true },
    cleanedAt: { type: Date, required: true },
    cleanedBy: { type: String, trim: true },
    cleaningType: {
      type: String,
      enum: ['Mopping', 'Deep Cleaning', 'Flushing'],
    },
    auditedAt: { type: Date },
    auditedBy: { type: String, trim: true },
    score: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['Excellent', 'Good', 'Watch'],
    },
    supplyStatus: {
      type: String,
      enum: ['In stock', 'Attention needed'],
      default: 'In stock',
    },
    issue: { type: String, trim: true },
    comments: { type: String, trim: true },
    checklist: [checklistItemSchema],
    beforePhotoUrl: { type: String, trim: true },
    afterPhotoUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

washroomLogSchema.index({ floor: 1, type: 1, cleanedAt: -1 });

const WashroomLog = mongoose.model('WashroomLog', washroomLogSchema);

module.exports = WashroomLog;
