const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    examCode: { type: String, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    grade: { type: Number, required: true, min: 1, max: 10 },
    division: { type: String, default: 'all', trim: true },
    type: {
      type: String,
      enum: ['Unit Test', 'Mid-Term', 'Final', 'Oral', 'Practical'],
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, trim: true },
    durationMinutes: { type: Number, default: 60 },
    maxMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 35 },
    venue: { type: String, trim: true },
    invigilator: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    academicYear: { type: String, default: '2025-26', trim: true },
  },
  { timestamps: true }
);

examSchema.index({ grade: 1, status: 1 });
examSchema.index({ scheduledDate: 1 });

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
