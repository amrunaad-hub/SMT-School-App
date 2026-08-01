const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    noticeCode: { type: String, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: ['General', 'Academic', 'Fee', 'Event', 'Holiday', 'Exam', 'Urgent'],
      default: 'General',
    },
    targetAudience: [
      {
        type: String,
        enum: ['all', 'parents', 'teachers', 'students', 'staff'],
      },
    ],
    issuedBy: { type: String, trim: true },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    attachmentUrl: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

noticeSchema.index({ isActive: 1, publishedAt: -1 });
noticeSchema.index({ category: 1 });

const Notice = mongoose.model('Notice', noticeSchema);

module.exports = Notice;
