const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    grade: { type: Number, required: true },
    division: { type: String, required: true, lowercase: true },
    rollNo: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'HalfDay'],
      default: 'Present',
    },
    reason: { type: String, trim: true },
    intimation: {
      type: String,
      enum: ['Advance leave', 'No prior intimation', ''],
      default: '',
    },
    followUp: { type: String, trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ date: 1, student: 1 }, { unique: true });
attendanceSchema.index({ date: 1, grade: 1, division: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
