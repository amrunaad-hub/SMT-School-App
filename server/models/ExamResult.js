const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    marksObtained: { type: Number },
    grade: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'],
    },
    remarks: { type: String, trim: true },
    isAbsent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

const ExamResult = mongoose.model('ExamResult', examResultSchema);

module.exports = ExamResult;
