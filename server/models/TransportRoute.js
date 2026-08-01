const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stopName: { type: String, trim: true },
    pickupTime: { type: String, trim: true },
    dropTime: { type: String, trim: true },
    sequence: { type: Number },
  },
  { _id: false }
);

const transportRouteSchema = new mongoose.Schema(
  {
    routeCode: { type: String, unique: true, trim: true },
    routeName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    capacity: { type: Number, default: 40 },
    currentOccupancy: { type: Number, default: 0 },
    morningDepartureTime: { type: String, trim: true },
    eveningDepartureTime: { type: String, trim: true },
    stops: [stopSchema],
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true }
);

const TransportRoute = mongoose.model('TransportRoute', transportRouteSchema);

module.exports = TransportRoute;
