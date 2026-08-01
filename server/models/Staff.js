const mongoose = require('mongoose');

const compensationSchema = new mongoose.Schema(
  {
    basePay: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    academicAllowance: { type: Number, default: 0 },
    performanceBonus: { type: Number, default: 0 },
    monthlyGross: { type: Number, default: 0 },
    annualCtc: { type: Number, default: 0 },
  },
  { _id: false }
);

const staffSchema = new mongoose.Schema(
  {
    staffCode: { type: String, unique: true, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    category: {
      type: String,
      enum: ['Teaching', 'Non-Teaching'],
      required: true,
    },
    department: { type: String, trim: true },
    role: { type: String, trim: true },
    assignedSubjects: [{ type: String }],
    qualification: { type: String, trim: true },
    joiningDate: { type: Date },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    photoUrl: { type: String },
    isMaharashtrian: { type: Boolean, default: false },
    isBrahmin: { type: Boolean, default: false },
    compensation: { type: compensationSchema, default: () => ({}) },
    experienceYearsPrior: { type: Number, default: 0 },
    experienceYearsCurrentSchool: { type: Number, default: 0 },
    classesTakenTotal: { type: mongoose.Schema.Types.Mixed, default: 0 },
    classesTakenYtd: { type: mongoose.Schema.Types.Mixed, default: 0 },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Resigned'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

staffSchema.index({ category: 1 });
staffSchema.index({ department: 1 });
staffSchema.index({ displayName: 'text', staffCode: 'text', role: 'text' });

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;
