const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    installmentId: {
      type: String,
      enum: ['april', 'july', 'november'],
      required: true,
    },
    label: { type: String },
    dueDate: { type: Date },
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        'Paid',
        'Pending',
        'Overdue',
        'Delayed',
        'Condonence',
        'Condonence Requested',
        'Condonence Approved',
        'RTE Zero Fee',
        'Upcoming',
      ],
      default: 'Upcoming',
    },
    paymentDate: { type: String },
    paymentMethod: { type: String },
    transactionRef: { type: String },
    note: { type: String },
  },
  { _id: false }
);

const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    academicYear: { type: String, required: true, default: '2025-26' },
    isRte: { type: Boolean, default: false },
    annualFee: { type: Number, default: 90000 },
    installments: [installmentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

feeSchema.index({ student: 1, academicYear: 1 }, { unique: true });
feeSchema.index({ academicYear: 1 });

feeSchema.virtual('paidAmount').get(function () {
  return (this.installments || []).reduce((sum, inst) => {
    return sum + (inst.status === 'Paid' ? (inst.amount || 0) : 0);
  }, 0);
});

feeSchema.virtual('pendingAmount').get(function () {
  if (this.isRte) return 0;
  return Math.max((this.annualFee || 90000) - this.paidAmount, 0);
});

const Fee = mongoose.model('Fee', feeSchema);

module.exports = Fee;
