const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    enquiryCode: { type: String, unique: true, trim: true },
    childName: { type: String, required: true, trim: true },
    dob: { type: Date },
    currentSchool: { type: String, trim: true },
    applyingForGrade: { type: Number, min: 1, max: 10 },
    enquiryType: {
      type: String,
      enum: ['New Admission', 'Transfer', 'Re-Admission'],
      default: 'New Admission',
    },
    area: { type: String, trim: true },
    parentName: { type: String, trim: true },
    parentMobile: { type: String, trim: true },
    parentEmail: { type: String, trim: true },
    source: {
      type: String,
      enum: ['Website', 'Phone', 'Walk-in', 'Referral', 'Social Media'],
      default: 'Phone',
    },
    status: {
      type: String,
      enum: ['Enquiry', 'In Process', 'Document Verification', 'Confirmed', 'Rejected'],
      default: 'Enquiry',
    },
    followUpNote: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    assignedTo: { type: String, trim: true },
    academicYear: { type: String, default: '2025-26', trim: true },
  },
  { timestamps: true }
);

admissionSchema.index({ status: 1, applyingForGrade: 1 });
admissionSchema.index({ childName: 'text', parentName: 'text' });

const Admission = mongoose.model('Admission', admissionSchema);

module.exports = Admission;
