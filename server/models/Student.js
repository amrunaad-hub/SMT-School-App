const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentCode: {
      type: String,
      unique: true,
      required: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    grade: { type: Number, required: true, min: 1, max: 10 },
    division: {
      type: String,
      required: true,
      enum: ['alpha', 'beta', 'gamma'],
      lowercase: true,
    },
    rollNo: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female'], default: 'Male' },
    dob: { type: Date },
    parentName: { type: String, trim: true },
    parentMobile: { type: String, trim: true },
    parentEmail: { type: String, trim: true },
    address: { type: String, trim: true },
    photoUrl: { type: String },
    isRte: { type: Boolean, default: false },
    isMaharashtrian: { type: Boolean, default: false },
    admissionYear: { type: Number },
    status: {
      type: String,
      enum: ['Active', 'TC', 'Detained'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

studentSchema.index({ grade: 1, division: 1, rollNo: 1 }, { unique: true });
studentSchema.index({ grade: 1, division: 1 });
studentSchema.index({ firstName: 'text', lastName: 'text', studentCode: 'text' });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
