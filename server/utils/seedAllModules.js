/* eslint-disable no-console */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');

const Admission = require('../models/Admission');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const TransportRoute = require('../models/TransportRoute');
const InventoryItem = require('../models/InventoryItem');
const Notice = require('../models/Notice');
const WashroomLog = require('../models/WashroomLog');
const Student = require('../models/Student');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/school-erp';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

// ─── 1. Admissions seed ───────────────────────────────────────────────────────

async function seedAdmissions() {
  const count = await Admission.countDocuments();
  if (count > 0) {
    console.log(`  Admissions: ${count} records already exist — skipping.`);
    return;
  }

  const admissions = [
    {
      enquiryCode: 'ENQ-2025-001',
      childName: 'Arjun Deshmukh',
      dob: new Date('2019-06-15'),
      currentSchool: 'Sunrise Play School',
      applyingForGrade: 1,
      enquiryType: 'New Admission',
      area: 'Thane West',
      parentName: 'Rajesh Deshmukh',
      parentMobile: '9876501001',
      parentEmail: 'rajesh.deshmukh@email.com',
      source: 'Website',
      status: 'Enquiry',
      followUpNote: 'Parent will visit on weekend for campus tour.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-002',
      childName: 'Saanvi Kulkarni',
      dob: new Date('2018-03-22'),
      currentSchool: 'Little Angels Academy',
      applyingForGrade: 2,
      enquiryType: 'Transfer',
      area: 'Kopri',
      parentName: 'Surekha Kulkarni',
      parentMobile: '9876501002',
      parentEmail: 'surekha.kulkarni@email.com',
      source: 'Referral',
      status: 'In Process',
      followUpNote: 'Transfer certificate requested from current school.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-003',
      childName: 'Vedant Pawar',
      dob: new Date('2017-09-10'),
      currentSchool: 'Greenfield Public School',
      applyingForGrade: 3,
      enquiryType: 'Transfer',
      area: 'Kalwa',
      parentName: 'Mahesh Pawar',
      parentMobile: '9876501003',
      parentEmail: 'mahesh.pawar@email.com',
      source: 'Phone',
      status: 'Document Verification',
      followUpNote: 'Birth certificate and Aadhaar submitted. Medical certificate pending.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-004',
      childName: 'Ira Joshi',
      dob: new Date('2019-11-05'),
      currentSchool: 'St. Xavier Preschool',
      applyingForGrade: 1,
      enquiryType: 'New Admission',
      area: 'Thane West',
      parentName: 'Prashant Joshi',
      parentMobile: '9876501004',
      parentEmail: 'prashant.joshi@email.com',
      source: 'Walk-in',
      status: 'Confirmed',
      followUpNote: 'Admission confirmed. Uniform ordered.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-005',
      childName: 'Tanish Gaikwad',
      dob: new Date('2018-07-20'),
      currentSchool: 'Abacus International',
      applyingForGrade: 2,
      enquiryType: 'New Admission',
      area: 'Mumbra',
      parentName: 'Kishore Gaikwad',
      parentMobile: '9876501005',
      parentEmail: 'kishore.gaikwad@email.com',
      source: 'Social Media',
      status: 'Rejected',
      rejectionReason: 'Seats full for Grade 2 Alpha and Beta.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-006',
      childName: 'Diya Bhosale',
      dob: new Date('2016-02-14'),
      currentSchool: 'Delhi Public School',
      applyingForGrade: 4,
      enquiryType: 'Transfer',
      area: 'Diva',
      parentName: 'Avinash Bhosale',
      parentMobile: '9876501006',
      parentEmail: 'avinash.bhosale@email.com',
      source: 'Website',
      status: 'Enquiry',
      followUpNote: 'Family relocating from Delhi. Needs provisional admission letter.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-007',
      childName: 'Soham Chavan',
      dob: new Date('2019-08-30'),
      currentSchool: 'None',
      applyingForGrade: 1,
      enquiryType: 'New Admission',
      area: 'Thane West',
      parentName: 'Nilesh Chavan',
      parentMobile: '9876501007',
      parentEmail: 'nilesh.chavan@email.com',
      source: 'Referral',
      status: 'In Process',
      followUpNote: 'Documents submitted. Interview scheduled for next week.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-008',
      childName: 'Ananya Rane',
      dob: new Date('2017-05-18'),
      currentSchool: 'Mumbai Model School',
      applyingForGrade: 3,
      enquiryType: 'New Admission',
      area: 'Kopri',
      parentName: 'Smita Rane',
      parentMobile: '9876501008',
      parentEmail: 'smita.rane@email.com',
      source: 'Phone',
      status: 'Confirmed',
      followUpNote: 'Fee receipt issued. Joining next Monday.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-009',
      childName: 'Parth Shinde',
      dob: new Date('2016-12-01'),
      currentSchool: 'Holy Cross English Medium',
      applyingForGrade: 4,
      enquiryType: 'Re-Admission',
      area: 'Kalwa',
      parentName: 'Deepak Shinde',
      parentMobile: '9876501009',
      parentEmail: 'deepak.shinde@email.com',
      source: 'Walk-in',
      status: 'Enquiry',
      followUpNote: 'Previously attended this school in Grade 2. Wants re-entry.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-010',
      childName: 'Meera Salunkhe',
      dob: new Date('2018-04-25'),
      currentSchool: 'Bright Future School',
      applyingForGrade: 2,
      enquiryType: 'Transfer',
      area: 'Mumbra',
      parentName: 'Ramesh Salunkhe',
      parentMobile: '9876501010',
      parentEmail: 'ramesh.salunkhe@email.com',
      source: 'Social Media',
      status: 'Rejected',
      rejectionReason: 'Incomplete documents — TC not submitted within deadline.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-011',
      childName: 'Krish Jadhav',
      dob: new Date('2019-02-09'),
      currentSchool: 'Rainbow Nursery',
      applyingForGrade: 1,
      enquiryType: 'New Admission',
      area: 'Thane West',
      parentName: 'Yogesh Jadhav',
      parentMobile: '9876501011',
      parentEmail: 'yogesh.jadhav@email.com',
      source: 'Website',
      status: 'In Process',
      followUpNote: 'Waiting for principal approval for mid-year joining.',
      academicYear: '2025-26',
    },
    {
      enquiryCode: 'ENQ-2025-012',
      childName: 'Rutuja More',
      dob: new Date('2016-10-14'),
      currentSchool: 'Nalanda Vidyalaya',
      applyingForGrade: 4,
      enquiryType: 'New Admission',
      area: 'Diva',
      parentName: 'Sunil More',
      parentMobile: '9876501012',
      parentEmail: 'sunil.more@email.com',
      source: 'Referral',
      status: 'Document Verification',
      followUpNote: 'Documents submitted. Caste certificate pending for scholarship.',
      academicYear: '2025-26',
    },
  ];

  await Admission.insertMany(admissions);
  console.log(`  Admissions: seeded ${admissions.length} records.`);
}

// ─── 2. Exams seed ────────────────────────────────────────────────────────────

async function seedExams() {
  const count = await Exam.countDocuments();
  if (count > 0) {
    console.log(`  Exams: ${count} records already exist — skipping.`);
    return;
  }

  const exams = [
    {
      examCode: 'EX-2025-001',
      title: 'Unit Test 1 - Mathematics',
      subject: 'Mathematics',
      grade: 1,
      division: 'all',
      type: 'Unit Test',
      scheduledDate: daysAgo(20),
      scheduledTime: '09:00',
      durationMinutes: 45,
      maxMarks: 25,
      passingMarks: 10,
      venue: 'Classroom 1-Alpha',
      status: 'Completed',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-002',
      title: 'Unit Test 1 - English',
      subject: 'English',
      grade: 2,
      division: 'all',
      type: 'Unit Test',
      scheduledDate: daysAgo(18),
      scheduledTime: '10:00',
      durationMinutes: 45,
      maxMarks: 25,
      passingMarks: 10,
      venue: 'Classroom 2-Beta',
      status: 'Completed',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-003',
      title: 'Mid-Term Examination - Science',
      subject: 'Science',
      grade: 3,
      division: 'all',
      type: 'Mid-Term',
      scheduledDate: daysAgo(10),
      scheduledTime: '09:00',
      durationMinutes: 90,
      maxMarks: 50,
      passingMarks: 17,
      venue: 'Examination Hall A',
      status: 'Completed',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-004',
      title: 'Mid-Term Examination - Mathematics',
      subject: 'Mathematics',
      grade: 4,
      division: 'all',
      type: 'Mid-Term',
      scheduledDate: daysAgo(8),
      scheduledTime: '09:00',
      durationMinutes: 90,
      maxMarks: 50,
      passingMarks: 17,
      venue: 'Examination Hall B',
      status: 'Completed',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-005',
      title: 'Unit Test 2 - Hindi',
      subject: 'Hindi',
      grade: 1,
      division: 'all',
      type: 'Unit Test',
      scheduledDate: daysFromNow(5),
      scheduledTime: '09:00',
      durationMinutes: 45,
      maxMarks: 25,
      passingMarks: 10,
      venue: 'Classroom 1-Beta',
      status: 'Scheduled',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-006',
      title: 'Oral Test - Marathi',
      subject: 'Marathi',
      grade: 2,
      division: 'alpha',
      type: 'Oral',
      scheduledDate: daysFromNow(7),
      scheduledTime: '11:00',
      durationMinutes: 20,
      maxMarks: 20,
      passingMarks: 7,
      venue: 'Language Lab',
      status: 'Scheduled',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-007',
      title: 'Unit Test 2 - EVS',
      subject: 'EVS',
      grade: 3,
      division: 'all',
      type: 'Unit Test',
      scheduledDate: daysFromNow(10),
      scheduledTime: '09:30',
      durationMinutes: 45,
      maxMarks: 25,
      passingMarks: 10,
      venue: 'Classroom 3-Alpha',
      status: 'Scheduled',
      academicYear: '2025-26',
    },
    {
      examCode: 'EX-2025-008',
      title: 'Practical Test - Science Lab',
      subject: 'Science',
      grade: 4,
      division: 'alpha',
      type: 'Practical',
      scheduledDate: daysFromNow(14),
      scheduledTime: '10:30',
      durationMinutes: 60,
      maxMarks: 30,
      passingMarks: 10,
      venue: 'Science Laboratory',
      status: 'Scheduled',
      academicYear: '2025-26',
    },
  ];

  await Exam.insertMany(exams);
  console.log(`  Exams: seeded ${exams.length} records.`);
  return exams;
}

// ─── 3. ExamResults seed ──────────────────────────────────────────────────────

async function seedExamResults() {
  const count = await ExamResult.countDocuments();
  if (count > 0) {
    console.log(`  ExamResults: ${count} records already exist — skipping.`);
    return;
  }

  // Get completed exams
  const completedExams = await Exam.find({ status: 'Completed' }).lean();
  if (completedExams.length === 0) {
    console.log('  ExamResults: No completed exams found — skipping.');
    return;
  }

  const computeGrade = (marks, max) => {
    const pct = (marks / max) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 35) return 'D';
    return 'F';
  };

  const resultDocs = [];

  for (const exam of completedExams) {
    const filter = { grade: exam.grade, status: 'Active' };
    if (exam.division && exam.division !== 'all') {
      filter.division = exam.division;
    }
    const students = await Student.find(filter).lean();

    for (const student of students) {
      // ~5% absent
      const isAbsent = Math.random() < 0.05;
      const marksObtained = isAbsent
        ? null
        : Math.round(exam.passingMarks + Math.random() * (exam.maxMarks - exam.passingMarks));

      resultDocs.push({
        exam: exam._id,
        student: student._id,
        marksObtained: isAbsent ? null : marksObtained,
        grade: isAbsent ? null : computeGrade(marksObtained, exam.maxMarks),
        isAbsent,
        remarks: isAbsent ? 'Absent' : '',
      });
    }
  }

  if (resultDocs.length > 0) {
    // Insert in batches to avoid timeout
    const BATCH = 500;
    for (let i = 0; i < resultDocs.length; i += BATCH) {
      await ExamResult.insertMany(resultDocs.slice(i, i + BATCH), { ordered: false }).catch(() => {});
    }
    console.log(`  ExamResults: seeded ${resultDocs.length} records.`);
  }
}

// ─── 4. Transport routes seed ─────────────────────────────────────────────────

async function seedTransport() {
  const count = await TransportRoute.countDocuments();
  if (count > 0) {
    console.log(`  TransportRoutes: ${count} records already exist — skipping.`);
    return;
  }

  // Get some student IDs to assign
  const students = await Student.find({ status: 'Active' }).select('_id').lean();
  const chunk = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
  };
  const studentChunks = chunk(students, Math.ceil(students.length / 5));

  const routes = [
    {
      routeCode: 'RT-01',
      routeName: 'Thane West – Kopri Route',
      vehicleNumber: 'MH-04-AB-1234',
      driverName: 'Ramesh Pawar',
      driverPhone: '9845001001',
      capacity: 40,
      currentOccupancy: 32,
      morningDepartureTime: '07:00',
      eveningDepartureTime: '14:30',
      stops: [
        { stopName: 'Thane Station (W)', pickupTime: '07:05', dropTime: '15:10', sequence: 1 },
        { stopName: 'Teen Hath Naka', pickupTime: '07:12', dropTime: '15:05', sequence: 2 },
        { stopName: 'Vasant Vihar', pickupTime: '07:18', dropTime: '14:58', sequence: 3 },
        { stopName: 'Kopri Bridge', pickupTime: '07:25', dropTime: '14:52', sequence: 4 },
        { stopName: 'Saket Colony', pickupTime: '07:30', dropTime: '14:47', sequence: 5 },
      ],
      status: 'Active',
      assignedStudents: (studentChunks[0] || []).slice(0, 30).map((s) => s._id),
    },
    {
      routeCode: 'RT-02',
      routeName: 'Kalwa – Mumbra Route',
      vehicleNumber: 'MH-04-CD-5678',
      driverName: 'Suresh Yadav',
      driverPhone: '9845001002',
      capacity: 40,
      currentOccupancy: 35,
      morningDepartureTime: '06:55',
      eveningDepartureTime: '14:35',
      stops: [
        { stopName: 'Kalwa Station', pickupTime: '07:00', dropTime: '15:15', sequence: 1 },
        { stopName: 'Kalwa Market', pickupTime: '07:06', dropTime: '15:10', sequence: 2 },
        { stopName: 'Vithalwadi', pickupTime: '07:12', dropTime: '15:04', sequence: 3 },
        { stopName: 'Mumbra Station', pickupTime: '07:20', dropTime: '14:56', sequence: 4 },
        { stopName: 'Mumba Devi Road', pickupTime: '07:26', dropTime: '14:50', sequence: 5 },
        { stopName: 'Mumbra Bypass', pickupTime: '07:32', dropTime: '14:44', sequence: 6 },
      ],
      status: 'Active',
      assignedStudents: (studentChunks[1] || []).slice(0, 33).map((s) => s._id),
    },
    {
      routeCode: 'RT-03',
      routeName: 'Diva – Airoli Route',
      vehicleNumber: 'MH-04-EF-9012',
      driverName: 'Dnyaneshwar Mane',
      driverPhone: '9845001003',
      capacity: 40,
      currentOccupancy: 28,
      morningDepartureTime: '07:10',
      eveningDepartureTime: '14:25',
      stops: [
        { stopName: 'Diva Station', pickupTime: '07:15', dropTime: '15:00', sequence: 1 },
        { stopName: 'Diva Gaon', pickupTime: '07:21', dropTime: '14:54', sequence: 2 },
        { stopName: 'Shil Phata', pickupTime: '07:28', dropTime: '14:47', sequence: 3 },
        { stopName: 'Airoli Sector 2', pickupTime: '07:35', dropTime: '14:40', sequence: 4 },
        { stopName: 'Airoli Bus Depot', pickupTime: '07:40', dropTime: '14:35', sequence: 5 },
        { stopName: 'Mahape Junction', pickupTime: '07:45', dropTime: '14:30', sequence: 6 },
        { stopName: 'TTC Colony', pickupTime: '07:50', dropTime: '14:25', sequence: 7 },
      ],
      status: 'Active',
      assignedStudents: (studentChunks[2] || []).slice(0, 26).map((s) => s._id),
    },
    {
      routeCode: 'RT-04',
      routeName: 'Naupada – Charai Route',
      vehicleNumber: 'MH-04-GH-3456',
      driverName: 'Santosh Kale',
      driverPhone: '9845001004',
      capacity: 40,
      currentOccupancy: 25,
      morningDepartureTime: '07:05',
      eveningDepartureTime: '14:40',
      stops: [
        { stopName: 'Naupada Bus Stop', pickupTime: '07:10', dropTime: '15:05', sequence: 1 },
        { stopName: 'Gokhale Road', pickupTime: '07:15', dropTime: '15:00', sequence: 2 },
        { stopName: 'Charai Junction', pickupTime: '07:22', dropTime: '14:53', sequence: 3 },
        { stopName: 'Cadbury Junction', pickupTime: '07:28', dropTime: '14:47', sequence: 4 },
        { stopName: 'Hiranandani Estate Gate 5', pickupTime: '07:35', dropTime: '14:40', sequence: 5 },
      ],
      status: 'Active',
      assignedStudents: (studentChunks[3] || []).slice(0, 24).map((s) => s._id),
    },
    {
      routeCode: 'RT-05',
      routeName: 'Wagle Estate – Manpada Route',
      vehicleNumber: 'MH-04-IJ-7890',
      driverName: 'Vijay Sawant',
      driverPhone: '9845001005',
      capacity: 40,
      currentOccupancy: 30,
      morningDepartureTime: '07:00',
      eveningDepartureTime: '14:30',
      stops: [
        { stopName: 'Wagle Estate Depot', pickupTime: '07:05', dropTime: '15:10', sequence: 1 },
        { stopName: 'Pokhran Road No.1', pickupTime: '07:12', dropTime: '15:03', sequence: 2 },
        { stopName: 'Eastern Express Highway', pickupTime: '07:18', dropTime: '14:57', sequence: 3 },
        { stopName: 'Ghodbunder Road Junction', pickupTime: '07:25', dropTime: '14:50', sequence: 4 },
        { stopName: 'Manpada Naka', pickupTime: '07:32', dropTime: '14:43', sequence: 5 },
        { stopName: 'Manpada Village', pickupTime: '07:38', dropTime: '14:37', sequence: 6 },
        { stopName: 'Majiwade T-Junction', pickupTime: '07:45', dropTime: '14:30', sequence: 7 },
        { stopName: 'Dhokali', pickupTime: '07:50', dropTime: '14:25', sequence: 8 },
      ],
      status: 'Active',
      assignedStudents: (studentChunks[4] || []).slice(0, 29).map((s) => s._id),
    },
  ];

  await TransportRoute.insertMany(routes);
  console.log(`  TransportRoutes: seeded ${routes.length} records.`);
}

// ─── 5. Inventory seed ────────────────────────────────────────────────────────

async function seedInventory() {
  const count = await InventoryItem.countDocuments();
  if (count > 0) {
    console.log(`  Inventory: ${count} records already exist — skipping.`);
    return;
  }

  const items = [
    { itemCode: 'INV-001', name: 'A4 Copy Paper (Ream)', category: 'Stationery', unit: 'ream', quantityInStock: 120, reorderLevel: 20, unitPrice: 280, supplier: 'Navneet Publications', location: 'Store Room A' },
    { itemCode: 'INV-002', name: 'Whiteboard Markers (Pack)', category: 'Stationery', unit: 'pack', quantityInStock: 45, reorderLevel: 10, unitPrice: 150, supplier: 'Camlin Ltd', location: 'Staff Room Cupboard' },
    { itemCode: 'INV-003', name: 'Student Chairs (Plastic)', category: 'Furniture', unit: 'pcs', quantityInStock: 320, reorderLevel: 20, unitPrice: 950, supplier: 'Godrej Interio', location: 'Basement Store' },
    { itemCode: 'INV-004', name: 'Teacher Desk (Wooden)', category: 'Furniture', unit: 'pcs', quantityInStock: 18, reorderLevel: 5, unitPrice: 4500, supplier: 'Godrej Interio', location: 'Basement Store' },
    { itemCode: 'INV-005', name: 'Projector (Epson EB-X49)', category: 'Electronics', unit: 'pcs', quantityInStock: 14, reorderLevel: 3, unitPrice: 28000, supplier: 'Epson India', location: 'IT Room' },
    { itemCode: 'INV-006', name: 'Desktop Computer (i5)', category: 'Electronics', unit: 'pcs', quantityInStock: 42, reorderLevel: 5, unitPrice: 38000, supplier: 'Dell India', location: 'Computer Lab' },
    { itemCode: 'INV-007', name: 'Cricket Bat (Junior)', category: 'Sports', unit: 'pcs', quantityInStock: 8, reorderLevel: 10, unitPrice: 1200, supplier: 'SG Sports', location: 'Sports Room' },
    { itemCode: 'INV-008', name: 'Football (Cosco)', category: 'Sports', unit: 'pcs', quantityInStock: 4, reorderLevel: 6, unitPrice: 800, supplier: 'Cosco India', location: 'Sports Room' },
    { itemCode: 'INV-009', name: 'Microscope (Student-grade)', category: 'Lab Equipment', unit: 'pcs', quantityInStock: 20, reorderLevel: 5, unitPrice: 3500, supplier: 'MBB Lab Supplies', location: 'Science Lab' },
    { itemCode: 'INV-010', name: 'Beakers & Measuring Cylinders Set', category: 'Lab Equipment', unit: 'set', quantityInStock: 15, reorderLevel: 5, unitPrice: 650, supplier: 'Borosil', location: 'Science Lab' },
    { itemCode: 'INV-011', name: 'Floor Cleaner (5L)', category: 'Cleaning Supplies', unit: 'bottle', quantityInStock: 24, reorderLevel: 10, unitPrice: 420, supplier: 'Phenyl House', location: 'Cleaning Store' },
    { itemCode: 'INV-012', name: 'Sanitizer Dispenser (Wall-mount)', category: 'Cleaning Supplies', unit: 'pcs', quantityInStock: 3, reorderLevel: 4, unitPrice: 1800, supplier: 'Lifebuoy B2B', location: 'Main Corridor' },
    { itemCode: 'INV-013', name: 'EVS Textbooks (Grade 3)', category: 'Books', unit: 'pcs', quantityInStock: 140, reorderLevel: 30, unitPrice: 180, supplier: 'Maharashtra State Board', location: 'Library Store' },
    { itemCode: 'INV-014', name: 'English Workbooks (Grade 2)', category: 'Books', unit: 'pcs', quantityInStock: 125, reorderLevel: 30, unitPrice: 120, supplier: 'Navneet Publications', location: 'Library Store' },
    { itemCode: 'INV-015', name: 'Chart Paper (Pack of 10)', category: 'Stationery', unit: 'pack', quantityInStock: 0, reorderLevel: 5, unitPrice: 85, supplier: 'Classmate', location: 'Arts Room' },
    { itemCode: 'INV-016', name: 'Sketch Pen Set (12 colours)', category: 'Stationery', unit: 'box', quantityInStock: 6, reorderLevel: 15, unitPrice: 75, supplier: 'Camlin Ltd', location: 'Arts Room' },
    { itemCode: 'INV-017', name: 'Badminton Racket Set', category: 'Sports', unit: 'set', quantityInStock: 6, reorderLevel: 4, unitPrice: 1100, supplier: 'Yonex India', location: 'Sports Room' },
    { itemCode: 'INV-018', name: 'First Aid Box (Complete)', category: 'Other', unit: 'pcs', quantityInStock: 5, reorderLevel: 2, unitPrice: 1200, supplier: 'Johnson & Johnson', location: 'Medical Room' },
    { itemCode: 'INV-019', name: 'Printer Ink Cartridge (HP 680)', category: 'Electronics', unit: 'pcs', quantityInStock: 2, reorderLevel: 4, unitPrice: 560, supplier: 'HP India', location: 'Admin Office' },
    { itemCode: 'INV-020', name: 'Yoga Mats', category: 'Sports', unit: 'pcs', quantityInStock: 22, reorderLevel: 10, unitPrice: 650, supplier: 'Nivia Sports', location: 'Yoga Room' },
  ];

  // Set lastRestockedAt for variety
  items.forEach((item, idx) => {
    item.lastRestockedAt = daysAgo(idx * 3 + 5);
  });

  await InventoryItem.insertMany(items);
  console.log(`  Inventory: seeded ${items.length} records.`);
}

// ─── 6. Notices seed ─────────────────────────────────────────────────────────

async function seedNotices() {
  const count = await Notice.countDocuments();
  if (count > 0) {
    console.log(`  Notices: ${count} records already exist — skipping.`);
    return;
  }

  const notices = [
    {
      noticeCode: 'NTC-001',
      title: 'PTM Scheduled for 20th May 2026',
      body: 'Parent-Teacher Meeting is scheduled on 20 May 2026 from 9:00 AM to 1:00 PM. All parents are requested to attend their allotted time slots. Detailed schedule has been shared via the school diary.',
      category: 'Event',
      targetAudience: ['parents'],
      issuedBy: 'TCH-PRINCIPAL',
      publishedAt: daysAgo(10),
      expiresAt: daysFromNow(5),
      priority: 'High',
      isActive: true,
      academicYear: '2025-26',
    },
    {
      noticeCode: 'NTC-002',
      title: 'Maharashtra Day Holiday – 1st May',
      body: 'The school will remain closed on 1st May 2026 on account of Maharashtra Day (Maharashtra Diwas). Classes will resume on 2nd May 2026 as scheduled.',
      category: 'Holiday',
      targetAudience: ['all'],
      issuedBy: 'TCH-PRINCIPAL',
      publishedAt: daysAgo(15),
      expiresAt: daysAgo(5),
      priority: 'Normal',
      isActive: false,
    },
    {
      noticeCode: 'NTC-003',
      title: 'Mid-Term Exam Schedule Released',
      body: 'The mid-term examination schedule for Grades 1-4 has been released. Exams will be conducted from 6th May to 14th May 2026. Detailed timetable is available in the school diary and on the notice board.',
      category: 'Exam',
      targetAudience: ['parents', 'students', 'teachers'],
      issuedBy: 'TCH-PRINCIPAL',
      publishedAt: daysAgo(8),
      priority: 'High',
      isActive: true,
    },
    {
      noticeCode: 'NTC-004',
      title: 'Annual Fee Reminder – July Installment',
      body: 'This is a reminder that the July installment of the annual school fee is due on 1st July 2026. Parents are requested to make the payment on time to avoid late fees. Payment can be made via UPI, Net Banking, or cheque at the school accounts office.',
      category: 'Fee',
      targetAudience: ['parents'],
      issuedBy: 'TCH-ACCOUNTS',
      publishedAt: daysAgo(3),
      expiresAt: daysFromNow(45),
      priority: 'Urgent',
      isActive: true,
    },
    {
      noticeCode: 'NTC-005',
      title: 'Science Exhibition – Registration Open',
      body: 'Annual Science Exhibition will be held on 25th May 2026. Students from Grades 3-10 are invited to participate. Teams of 2-3 students may register with their class teacher by 18th May. Theme: "Science for Sustainable Future".',
      category: 'Academic',
      targetAudience: ['students', 'parents', 'teachers'],
      issuedBy: 'TCH-SCI-HOD',
      publishedAt: daysAgo(5),
      expiresAt: daysFromNow(9),
      priority: 'Normal',
      isActive: true,
    },
    {
      noticeCode: 'NTC-006',
      title: 'Uniform and ID Card Compliance',
      body: 'All students are reminded to come to school in full uniform including the school tie, belt, and ID card. Students without ID cards will not be permitted entry. Parents are requested to ensure compliance from Monday.',
      category: 'General',
      targetAudience: ['parents', 'students'],
      issuedBy: 'TCH-DISCIPLINE',
      publishedAt: daysAgo(2),
      expiresAt: daysFromNow(14),
      priority: 'Normal',
      isActive: true,
    },
    {
      noticeCode: 'NTC-007',
      title: 'Water Day Celebration – Special Assembly',
      body: 'On account of World Water Day, a special assembly will be conducted on 22nd May 2026. Students are requested to bring handmade posters on water conservation. Best displays will be exhibited in the school corridor.',
      category: 'Event',
      targetAudience: ['students', 'teachers'],
      issuedBy: 'TCH-EVS-HOD',
      publishedAt: daysAgo(1),
      expiresAt: daysFromNow(6),
      priority: 'Normal',
      isActive: true,
    },
    {
      noticeCode: 'NTC-008',
      title: 'URGENT: Road Safety Week – Reduced Speed Zone',
      body: 'During Road Safety Week (10-17 May), vehicles near school premises should strictly follow the 20 km/h speed limit. Parents are requested not to park vehicles at the school gate and use designated drop-off zones only.',
      category: 'Urgent',
      targetAudience: ['parents'],
      issuedBy: 'TCH-PRINCIPAL',
      publishedAt: daysAgo(6),
      expiresAt: daysAgo(1),
      priority: 'Urgent',
      isActive: false,
    },
    {
      noticeCode: 'NTC-009',
      title: 'Staff Meeting – 21st May 2026',
      body: 'All teaching and non-teaching staff are requested to attend the monthly staff meeting on 21st May 2026 at 3:30 PM in the Conference Room. Agenda: Term-end report submission and next academic year planning.',
      category: 'General',
      targetAudience: ['teachers', 'staff'],
      issuedBy: 'TCH-PRINCIPAL',
      publishedAt: daysAgo(4),
      expiresAt: daysFromNow(5),
      priority: 'High',
      isActive: true,
    },
    {
      noticeCode: 'NTC-010',
      title: 'Inter-School Sports Competition – Nomination Open',
      body: 'SMT School is participating in the Thane District Inter-School Sports Meet on 1st June 2026. Students interested in Athletics, Kabaddi, or Chess should register with the Sports Teacher by 22nd May 2026.',
      category: 'Event',
      targetAudience: ['students', 'parents'],
      issuedBy: 'TCH-SPORTS',
      publishedAt: daysAgo(2),
      expiresAt: daysFromNow(6),
      priority: 'Normal',
      isActive: true,
    },
  ];

  await Notice.insertMany(notices);
  console.log(`  Notices: seeded ${notices.length} records.`);
}

// ─── 7. WashroomLogs seed ─────────────────────────────────────────────────────

async function seedWashroomLogs() {
  const count = await WashroomLog.countDocuments();
  if (count > 0) {
    console.log(`  WashroomLogs: ${count} records already exist — skipping.`);
    return;
  }

  const floors = [1, 2, 3, 4, 5, 6];
  const types = ['girls', 'boys'];
  const cleanerNames = ['Sunita Yadav', 'Rakesh Kumar', 'Pooja Sharma', 'Mohan Patel', 'Anita Singh', 'Vikas Rao'];
  const supervisors = ['Neelam Verma', 'Harish Nair'];
  const cleaningTypes = ['Mopping', 'Deep Cleaning', 'Flushing'];
  const issuePool = [
    'No issue reported',
    'Floor disinfectant stock running low',
    'Air freshener cartridge replaced',
    'Flush sensor checked after slow refill',
    'Handwash refill delayed by stores',
    'Wet floor sign missing during last round',
  ];
  const commentsByType = {
    girls: [
      'Sanitary bin cleared, mirror wiped, and entry area disinfected.',
      'Flooring done with disinfectant. All dispensers refilled.',
      'Deep cleaning completed. Fresh air circulation checked.',
      'Light mopping and quick sanitization done.',
      'Full washroom sanitation with odour control applied.',
    ],
    boys: [
      'Urinal line flushed, door latches checked, and floor corners scrubbed.',
      'All cubicles sanitized. Drain systems checked.',
      'Deep cleaning with high-pressure jet applied.',
      'Routine mopping and fixture maintenance done.',
      'Complete overhaul with odour control measures.',
    ],
  };

  const defaultChecklist = [
    { item: 'Floor and cubicles sanitized', done: true },
    { item: 'Handwash dispensers checked', done: true },
    { item: 'Odour control reviewed', done: true },
    { item: 'Supervisor sign-off captured', done: true },
  ];

  const logs = [];
  let docCount = 0;

  for (const floor of floors) {
    for (const type of types) {
      const typeIndex = type === 'girls' ? 0 : 1;
      const supervisor = floor % 2 === 0 ? supervisors[0] : supervisors[1];

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const baseDate = daysAgo(dayOffset);
        const cleanHour = (7 + floor) % 24;
        const cleanMinute = type === 'girls' ? (10 + dayOffset * 5) % 60 : (35 + dayOffset * 7) % 60;
        const auditHour = (8 + floor) % 24;
        const auditMinute = type === 'girls' ? (25 + dayOffset * 3) % 60 : (50 + dayOffset * 2) % 60;

        const cleanedAt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), cleanHour, cleanMinute, 0);
        const auditedAt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), auditHour, auditMinute, 0);

        const score = Math.max(80, 97 - floor - typeIndex * 2 - dayOffset * 1);
        const status = score >= 90 ? 'Excellent' : score >= 80 ? 'Good' : 'Watch';
        const supplyStatus = floor % 3 === 0 && type === 'boys' && dayOffset === 0 ? 'Attention needed' : 'In stock';

        logs.push({
          location: `Floor ${floor} ${type === 'girls' ? 'Girls' : 'Boys'}`,
          floor,
          type,
          cleanedAt,
          cleanedBy: cleanerNames[(floor + dayOffset + typeIndex) % cleanerNames.length],
          cleaningType: cleaningTypes[(floor + dayOffset + typeIndex) % cleaningTypes.length],
          auditedAt,
          auditedBy: supervisor,
          score,
          status,
          supplyStatus,
          issue: issuePool[(floor + dayOffset + (type === 'girls' ? 0 : 2)) % issuePool.length],
          comments: commentsByType[type][dayOffset % commentsByType[type].length],
          checklist: defaultChecklist,
        });
        docCount++;
      }
    }
  }

  await WashroomLog.insertMany(logs);
  console.log(`  WashroomLogs: seeded ${docCount} records (${floors.length * types.length * 5} = 60 total).`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const MONGODB_URI_USED =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/school-erp';

  if (!MONGODB_URI_USED) {
    console.error('MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI_USED, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected.\n');

  console.log('Seeding all modules...');
  await seedAdmissions();
  await seedExams();
  await seedExamResults();
  await seedTransport();
  await seedInventory();
  await seedNotices();
  await seedWashroomLogs();

  console.log('\nAll module seeds complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
