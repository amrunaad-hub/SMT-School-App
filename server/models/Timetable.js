const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema(
  {
    periodIndex: { type: Number, required: true },
    time: { type: String },
    type: { type: String },
    subject: { type: String },
    staffCode: { type: String },
    teacherName: { type: String },
    room: { type: String },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    grade: { type: Number, required: true },
    division: { type: String, required: true, lowercase: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 6 },
    academicYear: { type: String, default: '2025-26' },
    periods: [periodSchema],
  },
  { timestamps: true }
);

timetableSchema.index(
  { grade: 1, division: 1, dayOfWeek: 1, academicYear: 1 },
  { unique: true }
);

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
