/* eslint-disable no-console */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const TimetableModel = require('../models/Timetable');
const Fee = require('../models/Fee');

// ─── Name pools (mirroring studentDirectory.js) ──────────────────────────────
const MAHARASHTRIAN_FIRST_NAMES = [
  'Aarav', 'Aditya', 'Atharva', 'Om', 'Vedant', 'Siddharth', 'Rohit', 'Rohan', 'Yash', 'Sanket',
  'Pranav', 'Aniket', 'Abhishek', 'Swapnil', 'Tejas', 'Akash', 'Harshad', 'Kunal', 'Nikhil', 'Sachin',
  'Aditi', 'Ananya', 'Sakshi', 'Shruti', 'Pooja', 'Kavya', 'Neha', 'Ritika', 'Prachi', 'Mrunal',
  'Isha', 'Tanvi', 'Rutuja', 'Sneha', 'Mansi', 'Vaishnavi', 'Ketaki', 'Komal', 'Gauri', 'Ashwini',
  'Tanish', 'Parth', 'Soham', 'Aviral', 'Krish', 'Ishaan', 'Vihaan', 'Arjun', 'Kabir', 'Dev',
  'Meera', 'Riya', 'Ira', 'Saanvi', 'Diya', 'Tara', 'Nandini', 'Anjali', 'Shreya', 'Pallavi',
];
const MAHARASHTRIAN_SURNAMES = [
  'Deshmukh', 'Bhosale', 'Pawar', 'Jadhav', 'More', 'Kulkarni', 'Joshi', 'Patil', 'Desai', 'Gaikwad',
  'Chavan', 'Rane', 'Salunkhe', 'Mahajan', 'Nimbalkar', 'Gokhale', 'Apte', 'Tilak', 'Ranade', 'Shirke',
  'Shinde', 'Wagh', 'Kadam', 'Thakur', 'Sawant', 'Mane', 'Kale', 'Bendre', 'Dongre', 'Inamdar',
];
const NON_MAHARASHTRIAN_FIRST_NAMES = [
  'Rahul', 'Vikas', 'Aman', 'Karan', 'Arnav', 'Rudra', 'Dhruv', 'Samarth', 'Vivaan', 'Ranbir',
  'Priya', 'Naina', 'Anika', 'Siya', 'Jiya', 'Myra', 'Kiara', 'Sara', 'Alisha', 'Aisha',
];
const NON_MAHARASHTRIAN_SURNAMES = [
  'Singh', 'Kumar', 'Gupta', 'Reddy', 'Verma', 'Jain', 'Agarwal', 'Shah', 'Kapoor', 'Malhotra',
];

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const STUDENTS_PER_DIVISION = 40;
const TOTAL_STUDENTS = GRADES.length * DIVISIONS.length * STUDENTS_PER_DIVISION;
const ALL_FIRST_NAMES = [...MAHARASHTRIAN_FIRST_NAMES, ...NON_MAHARASHTRIAN_FIRST_NAMES];
const ALL_SURNAMES = [...MAHARASHTRIAN_SURNAMES, ...NON_MAHARASHTRIAN_SURNAMES];

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildRandomNamePool = () => {
  const MAX_FIRST = Math.max(2, Math.floor(TOTAL_STUDENTS * 0.05));
  const MAX_SURNAME = Math.max(2, Math.floor(TOTAL_STUDENTS * 0.03));

  const firstSlots = [];
  const surnameSlots = [];

  const firstBase = Math.floor(TOTAL_STUDENTS / ALL_FIRST_NAMES.length);
  const firstRem = TOTAL_STUDENTS % ALL_FIRST_NAMES.length;
  ALL_FIRST_NAMES.forEach((name, idx) => {
    const count = firstBase + (idx < firstRem ? 1 : 0);
    for (let i = 0; i < Math.min(count, MAX_FIRST); i += 1) firstSlots.push(name);
  });

  const surBase = Math.floor(TOTAL_STUDENTS / ALL_SURNAMES.length);
  const surRem = TOTAL_STUDENTS % ALL_SURNAMES.length;
  ALL_SURNAMES.forEach((name, idx) => {
    const count = surBase + (idx < surRem ? 1 : 0);
    for (let i = 0; i < Math.min(count, MAX_SURNAME); i += 1) surnameSlots.push(name);
  });

  const shuffledFirst = shuffle(firstSlots).slice(0, TOTAL_STUDENTS);
  const shuffledSur = shuffle(surnameSlots).slice(0, TOTAL_STUDENTS);

  const pool = [];
  for (let i = 0; i < TOTAL_STUDENTS; i += 1) {
    const firstName = shuffledFirst[i] || ALL_FIRST_NAMES[i % ALL_FIRST_NAMES.length];
    const lastName = shuffledSur[i] || ALL_SURNAMES[i % ALL_SURNAMES.length];
    pool.push({ firstName, lastName, isMaharashtrian: MAHARASHTRIAN_SURNAMES.includes(lastName) });
  }
  return pool;
};

// ─── Seed Students ────────────────────────────────────────────────────────────
async function seedStudents() {
  if ((await Student.countDocuments()) > 0) {
    console.log('Students already seeded, skipping.');
    return;
  }

  console.log('Seeding students...');
  const namePool = buildRandomNamePool();
  let globalIndex = 0;
  const docs = [];

  const parentFirstNames = ['Rajesh', 'Sunita', 'Amit', 'Meera', 'Vikram', 'Priya', 'Rohan', 'Anjali', 'Sachin', 'Kavita'];
  const parentLastNames = ['Kumar', 'Sharma', 'Patel', 'Singh', 'Joshi', 'Desai', 'Gupta', 'Reddy', 'Bhosale', 'Pawar'];

  GRADES.forEach((grade) => {
    DIVISIONS.forEach((division) => {
      for (let rollNo = 1; rollNo <= STUDENTS_PER_DIVISION; rollNo += 1) {
        const { firstName, lastName, isMaharashtrian } = namePool[globalIndex];
        const seed = globalIndex;
        const pFirst = parentFirstNames[seed % parentFirstNames.length];
        const pLast = parentLastNames[(seed * 3) % parentLastNames.length];
        const divUpper = division.toUpperCase();
        const studentCode = `G${grade}-${divUpper}-${String(rollNo).padStart(3, '0')}`;
        const birthYear = 2026 - grade - 5 + (seed % 2);
        const dob = new Date(`${birthYear}-${String((seed % 12) + 1).padStart(2, '0')}-${String((seed % 28) + 1).padStart(2, '0')}`);

        docs.push({
          studentCode,
          firstName,
          lastName,
          grade,
          division,
          rollNo,
          gender: seed % 2 === 0 ? 'Male' : 'Female',
          dob,
          parentName: `${pFirst} ${pLast}`,
          parentMobile: `${9000000000 + seed * 7 % 999999999}`,
          parentEmail: `${pFirst.toLowerCase()}.${pLast.toLowerCase()}${seed % 100}@gmail.com`,
          address: `${100 + seed % 900} Shivaji Nagar, Thane, Maharashtra`,
          photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentCode}`,
          isRte: rollNo <= 10, // first 10 rolls in each division = 25%
          isMaharashtrian,
          admissionYear: 2020 + (grade % 6),
          status: 'Active',
        });

        globalIndex += 1;
      }
    });
  });

  await Student.insertMany(docs);
  console.log(`done (${docs.length}).`);
  return docs;
}

// ─── Staff data (mirroring facultyScheduler.js) ────────────────────────────
const makeAvatar = (code, name, gender) => {
  const seed = encodeURIComponent(`${code}-${name}`);
  return gender === 'Female'
    ? `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`
    : `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
};

const buildCompensation = (index, isTeaching) => {
  const basePay = isTeaching ? 42000 + (index % 8) * 2500 : 28000 + (index % 6) * 1700;
  const hra = Math.round(basePay * 0.25);
  const academicAllowance = isTeaching ? 3500 + (index % 4) * 800 : 1800 + (index % 3) * 500;
  const performanceBonus = isTeaching ? 4500 + (index % 5) * 700 : 2200 + (index % 4) * 450;
  const monthlyGross = basePay + hra + academicAllowance;
  const annualCtc = monthlyGross * 12 + performanceBonus;
  return { basePay, hra, academicAllowance, performanceBonus, monthlyGross, annualCtc };
};

const foundationalTeachers = [
  { code: 'TCH001', name: 'Ms. Anuja Kulkarni', gender: 'Female', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['English', 'Library'] },
  { code: 'TCH002', name: 'Mr. Shrirang Joshi', gender: 'Male', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['Maths', 'EVS'] },
  { code: 'TCH003', name: 'Ms. Revati Apte', gender: 'Female', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['Hindi', 'Marathi'] },
  { code: 'TCH004', name: 'Mr. Vedant Gokhale', gender: 'Male', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['Yoga', 'Gym'] },
  { code: 'TCH005', name: 'Ms. Samruddhi Bhave', gender: 'Female', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['Cyber / Computer'] },
  { code: 'TCH006', name: 'Ms. Nandini Ranade', gender: 'Female', isMaharashtrian: true, isBrahmin: true, assignedSubjects: ['English', 'Library'] },
  { code: 'TCH007', name: 'Mr. Akshay Deshmukh', gender: 'Male', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Maths', 'EVS'] },
  { code: 'TCH008', name: 'Ms. Pranjali Patil', gender: 'Female', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Hindi', 'Marathi'] },
  { code: 'TCH009', name: 'Mr. Chetan Shinde', gender: 'Male', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Yoga', 'Gym'] },
  { code: 'TCH010', name: 'Ms. Mitali Pawar', gender: 'Female', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Cyber / Computer'] },
  { code: 'TCH011', name: 'Ms. Sakshi Chavan', gender: 'Female', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['English', 'Library'] },
  { code: 'TCH012', name: 'Mr. Omkar Jadhav', gender: 'Male', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Maths', 'EVS'] },
  { code: 'TCH013', name: 'Ms. Tejal Gaikwad', gender: 'Female', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Hindi', 'Marathi'] },
  { code: 'TCH014', name: 'Mr. Ruturaj More', gender: 'Male', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Yoga', 'Gym'] },
  { code: 'TCH015', name: 'Ms. Pooja Bhosale', gender: 'Female', isMaharashtrian: true, isBrahmin: false, assignedSubjects: ['Cyber / Computer'] },
];

const brahminMale = ['Soham', 'Adwait', 'Pranav', 'Shrinivas', 'Kaustubh', 'Atharva', 'Niranjan', 'Tanmay'];
const brahminFemale = ['Shravani', 'Isha', 'Mrunmayi', 'Aditi', 'Madhura', 'Ketaki', 'Rujuta', 'Vaidehi'];
const brahminSur = ['Kulkarni', 'Joshi', 'Apte', 'Gokhale', 'Ranade', 'Bhave', 'Thatte', 'Agashe'];
const marathiMale = ['Rohan', 'Akshay', 'Yash', 'Nikhil', 'Swapnil', 'Sagar', 'Ravindra', 'Harshal', 'Kiran', 'Pratik'];
const marathiFemale = ['Snehal', 'Kavya', 'Neha', 'Tanvi', 'Mansi', 'Rutuja', 'Gauri', 'Ashwini', 'Shreya', 'Komal'];
const marathiSur = ['Patil', 'Shinde', 'Jadhav', 'Pawar', 'Gaikwad', 'Deshmukh', 'Chavan', 'Rane', 'More', 'Mane'];
const nonMahMale = ['Raghav', 'Aman', 'Kunal', 'Arnav', 'Vivaan', 'Rudra'];
const nonMahFemale = ['Naina', 'Kiara', 'Sara', 'Anika', 'Myra', 'Aisha'];
const nonMahSur = ['Singh', 'Gupta', 'Sharma', 'Reddy', 'Verma', 'Jain', 'Kapoor', 'Agarwal'];
const subjectBundles = [
  ['English', 'Library'], ['Maths', 'EVS'], ['Hindi', 'Marathi'],
  ['Yoga', 'Gym'], ['Cyber / Computer'], ['Maths', 'Cyber / Computer'],
  ['English', 'Marathi'], ['EVS', 'Library'],
];

const generatedTeachers = [];
for (let i = 16; i <= 50; i += 1) {
  const li = i - 16;
  const code = `TCH${String(i).padStart(3, '0')}`;
  const gender = i % 2 === 0 ? 'Male' : 'Female';
  const isMaharashtrian = li < 25;
  const isBrahmin = isMaharashtrian && li < 10;
  let firstName, surname;
  if (isMaharashtrian && isBrahmin) {
    firstName = gender === 'Male' ? brahminMale[li % brahminMale.length] : brahminFemale[li % brahminFemale.length];
    surname = brahminSur[Math.floor(li / 2) % brahminSur.length];
  } else if (isMaharashtrian) {
    firstName = gender === 'Male' ? marathiMale[li % marathiMale.length] : marathiFemale[li % marathiFemale.length];
    surname = marathiSur[Math.floor(li / 2) % marathiSur.length];
  } else {
    firstName = gender === 'Male' ? nonMahMale[li % nonMahMale.length] : nonMahFemale[li % nonMahFemale.length];
    surname = nonMahSur[Math.floor(li / 2) % nonMahSur.length];
  }
  const prefix = gender === 'Male' ? 'Mr.' : 'Ms.';
  generatedTeachers.push({
    code,
    name: `${prefix} ${firstName} ${surname}`,
    firstName,
    surname,
    gender,
    isMaharashtrian,
    isBrahmin,
    assignedSubjects: subjectBundles[li % subjectBundles.length],
  });
}

const nonTeachingStaffSeed = [
  { code: 'NTS001', name: 'Mrs. Smita Naik', firstName: 'Smita', lastName: 'Naik', gender: 'Female', role: 'Principal', department: 'Administration', qualification: 'M.Ed, M.A (Education)' },
  { code: 'NTS002', name: 'Mr. Nilesh Kulkarni', firstName: 'Nilesh', lastName: 'Kulkarni', gender: 'Male', role: 'Vice Principal', department: 'Administration', qualification: 'M.Ed, B.Ed' },
  { code: 'NTS003', name: 'Ms. Rucha Patil', firstName: 'Rucha', lastName: 'Patil', gender: 'Female', role: 'Admin Officer', department: 'Administration', qualification: 'MBA, B.Com' },
  { code: 'NTS004', name: 'Mr. Dheeraj Shah', firstName: 'Dheeraj', lastName: 'Shah', gender: 'Male', role: 'Accountant', department: 'Finance', qualification: 'M.Com, CA Inter' },
  { code: 'NTS005', name: 'Ms. Pallavi Deshpande', firstName: 'Pallavi', lastName: 'Deshpande', gender: 'Female', role: 'Librarian', department: 'Operations', qualification: 'M.Lib, B.A' },
  { code: 'NTS006', name: 'Ms. Anagha Joshi', firstName: 'Anagha', lastName: 'Joshi', gender: 'Female', role: 'Counselor', department: 'Student Welfare', qualification: 'M.A Psychology' },
  { code: 'NTS007', name: 'Mr. Harish Singh', firstName: 'Harish', lastName: 'Singh', gender: 'Male', role: 'Nurse', department: 'Health', qualification: 'GNM, B.Sc Nursing' },
  { code: 'NTS008', name: 'Mr. Sandeep More', firstName: 'Sandeep', lastName: 'More', gender: 'Male', role: 'Lab Assistant', department: 'Academics', qualification: 'B.Sc' },
  { code: 'NTS009', name: 'Ms. Ketaki Chavan', firstName: 'Ketaki', lastName: 'Chavan', gender: 'Female', role: 'Transport Coordinator', department: 'Transport', qualification: 'Graduate Diploma' },
  { code: 'NTS010', name: 'Mr. Ritesh Reddy', firstName: 'Ritesh', lastName: 'Reddy', gender: 'Male', role: 'IT Support Executive', department: 'Technology', qualification: 'BCA, Diploma IT' },
];

async function seedStaff() {
  if ((await Staff.countDocuments()) > 0) {
    console.log('Staff already seeded, skipping.');
    return;
  }

  console.log('Seeding staff...');

  const allTeacherDefs = [...foundationalTeachers, ...generatedTeachers];
  const teachingDocs = allTeacherDefs.map((t, index) => {
    const comp = buildCompensation(index, true);
    const nameParts = t.name.replace(/^(Mr\.|Ms\.|Mrs\.)\s+/, '').split(' ');
    const firstName = t.firstName || nameParts[0];
    const lastName = t.surname || t.lastName || nameParts.slice(1).join(' ');
    return {
      staffCode: t.code,
      displayName: t.name,
      firstName,
      lastName,
      gender: t.gender,
      category: 'Teaching',
      department: 'Academics',
      role: 'Teacher',
      assignedSubjects: t.assignedSubjects || [],
      qualification: (t.assignedSubjects || []).includes('Cyber / Computer')
        ? 'B.Tech, B.Ed'
        : (t.assignedSubjects || []).includes('Maths') ? 'M.Sc, B.Ed' : 'M.A, B.Ed',
      joiningDate: new Date(`${2015 + (index % 9)}-06-15`),
      phone: `+91 98${String(10000000 + index * 173).slice(-8)}`,
      email: `${t.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')}@smtschool.edu.in`,
      photoUrl: makeAvatar(t.code, t.name, t.gender),
      isMaharashtrian: t.isMaharashtrian !== undefined ? t.isMaharashtrian : true,
      isBrahmin: t.isBrahmin !== undefined ? t.isBrahmin : false,
      compensation: comp,
      experienceYearsPrior: 3 + (index % 11),
      experienceYearsCurrentSchool: 2 + (index % 8),
      classesTakenTotal: 2400 + index * 34,
      classesTakenYtd: 130 + (index * 8) % 180,
      status: index % 10 === 0 ? 'On Leave' : 'Active',
    };
  });

  const nonTeachingDocs = nonTeachingStaffSeed.map((s, index) => {
    const comp = buildCompensation(index, false);
    return {
      staffCode: s.code,
      displayName: s.name,
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender,
      category: 'Non-Teaching',
      department: s.department,
      role: s.role,
      assignedSubjects: [],
      qualification: s.qualification,
      joiningDate: new Date(`${2014 + (index % 9)}-04-10`),
      phone: `+91 99${String(20000000 + index * 211).slice(-8)}`,
      email: `${s.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')}@smtschool.edu.in`,
      photoUrl: makeAvatar(s.code, s.name, s.gender),
      isMaharashtrian: index < 7,
      isBrahmin: index < 3,
      compensation: comp,
      experienceYearsPrior: 4 + (index % 9),
      experienceYearsCurrentSchool: 2 + (index % 7),
      classesTakenTotal: '-',
      classesTakenYtd: '-',
      status: index === 3 ? 'On Leave' : 'Active',
    };
  });

  const allDocs = [...teachingDocs, ...nonTeachingDocs];
  await Staff.insertMany(allDocs);
  console.log(`done (${allDocs.length}).`);
}

// ─── Timetable data ───────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '1:00-1:30', '1:30-2:00', '2:00-2:30', '2:30-3:00', '3:00-3:20', '3:20-3:50',
  '3:50-4:20', '4:20-4:30', '4:30-5:00', '5:00-5:30', '5:30-5:45',
];
const PERIOD_TYPES = [
  'Prayer & Assembly', 'Period 1', 'Period 2', 'Period 3', 'Long Break', 'Period 4',
  'Period 5', 'Short Break', 'Period 6', 'Period 7', 'Period 8',
];
const DIVISION_LABEL = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma' };
const DIVISION_SUBJECT_TEACHER_CODES = {
  alpha: { 'English': 'TCH001', 'Library': 'TCH001', 'Maths': 'TCH002', 'EVS': 'TCH002', 'Hindi': 'TCH003', 'Marathi': 'TCH003', 'Yoga': 'TCH004', 'Gym': 'TCH004', 'Cyber / Computer': 'TCH005' },
  beta: { 'English': 'TCH006', 'Library': 'TCH006', 'Maths': 'TCH007', 'EVS': 'TCH007', 'Hindi': 'TCH008', 'Marathi': 'TCH008', 'Yoga': 'TCH009', 'Gym': 'TCH009', 'Cyber / Computer': 'TCH010' },
  gamma: { 'English': 'TCH011', 'Library': 'TCH011', 'Maths': 'TCH012', 'EVS': 'TCH012', 'Hindi': 'TCH013', 'Marathi': 'TCH013', 'Yoga': 'TCH014', 'Gym': 'TCH014', 'Cyber / Computer': 'TCH015' },
};
const gradeSubjectPatternByDay = {
  1: { 1: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Library', 'English', 'Maths'], 2: ['Maths', 'Hindi', 'English', 'EVS', 'Marathi', 'Yoga', 'Maths', 'English'], 3: ['EVS', 'English', 'Maths', 'Marathi', 'Hindi', 'Library', 'EVS', 'English'], 4: ['Hindi', 'Maths', 'English', 'EVS', 'Marathi', 'Gym', 'Hindi', 'Maths'], 5: ['English', 'Marathi', 'Maths', 'EVS', 'Hindi', 'Yoga', 'English', 'Marathi'], 6: ['Maths', 'English', 'EVS', 'Hindi', 'Library', 'Marathi', 'Maths', 'English'] },
  2: { 1: ['Maths', 'EVS', 'English', 'Marathi', 'Hindi', 'Cyber / Computer', 'Maths', 'EVS'], 2: ['English', 'Maths', 'Hindi', 'EVS', 'Marathi', 'Library', 'English', 'Maths'], 3: ['Marathi', 'EVS', 'Maths', 'English', 'Hindi', 'Yoga', 'Marathi', 'EVS'], 4: ['EVS', 'Hindi', 'Maths', 'Marathi', 'English', 'Cyber / Computer', 'EVS', 'Hindi'], 5: ['Maths', 'English', 'Marathi', 'EVS', 'Hindi', 'Library', 'Maths', 'English'], 6: ['English', 'Maths', 'EVS', 'Hindi', 'Cyber / Computer', 'Marathi', 'English', 'Maths'] },
  3: { 1: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Cyber / Computer', 'English', 'Maths'], 2: ['Maths', 'Hindi', 'English', 'EVS', 'Marathi', 'Library', 'Maths', 'Hindi'], 3: ['EVS', 'Maths', 'Hindi', 'English', 'Marathi', 'Gym', 'EVS', 'Maths'], 4: ['Hindi', 'English', 'Maths', 'Marathi', 'EVS', 'Cyber / Computer', 'Hindi', 'English'], 5: ['English', 'EVS', 'Marathi', 'Maths', 'Hindi', 'Library', 'English', 'EVS'], 6: ['Maths', 'English', 'EVS', 'Hindi', 'Cyber / Computer', 'Marathi', 'Maths', 'English'] },
  4: { 1: ['Maths', 'EVS', 'English', 'Marathi', 'Hindi', 'Cyber / Computer', 'Maths', 'EVS'], 2: ['English', 'Hindi', 'Maths', 'EVS', 'Marathi', 'Yoga', 'English', 'Hindi'], 3: ['EVS', 'Maths', 'English', 'Hindi', 'Marathi', 'Library', 'EVS', 'Maths'], 4: ['Hindi', 'Marathi', 'Maths', 'English', 'EVS', 'Cyber / Computer', 'Hindi', 'Marathi'], 5: ['Maths', 'English', 'EVS', 'Marathi', 'Hindi', 'Library', 'Maths', 'English'], 6: ['English', 'Maths', 'EVS', 'Marathi', 'Cyber / Computer', 'Hindi', 'English', 'Maths'] },
};
const gradeSubjectFallback = {
  1: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Library', 'Yoga', 'Gym'],
  2: ['Maths', 'English', 'EVS', 'Marathi', 'Hindi', 'Library', 'Cyber / Computer', 'Yoga'],
  3: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Cyber / Computer', 'Library', 'Gym'],
  4: ['Maths', 'English', 'EVS', 'Marathi', 'Hindi', 'Cyber / Computer', 'Yoga', 'Library'],
};

// Build teacher lookup by code
const buildTeacherLookup = (staffDocs) => {
  const map = {};
  staffDocs.forEach((s) => { map[s.staffCode] = s.displayName; });
  return map;
};

async function seedTimetable() {
  if ((await TimetableModel.countDocuments()) > 0) {
    console.log('Timetable already seeded, skipping.');
    return;
  }

  console.log('Seeding timetable...');
  const staffDocs = await Staff.find({ category: 'Teaching' }).lean();
  const teacherNames = buildTeacherLookup(staffDocs);

  const docs = [];
  const seedGrades = [1, 2, 3, 4];

  seedGrades.forEach((grade) => {
    DIVISIONS.forEach((division) => {
      [1, 2, 3, 4, 5, 6].forEach((dayOfWeek) => {
        const dayPatterns = gradeSubjectPatternByDay[grade];
        const subjectSeq = (dayPatterns && dayPatterns[dayOfWeek]) || gradeSubjectFallback[grade] || gradeSubjectFallback[1];
        const divLabel = DIVISION_LABEL[division] || division;
        let ptr = 0;

        const periods = TIME_SLOTS.map((time, periodIndex) => {
          const type = PERIOD_TYPES[periodIndex];

          if (type === 'Prayer & Assembly') {
            return { periodIndex, time, type, subject: 'Assembly', staffCode: 'ALL', teacherName: 'All Staff', room: 'Auditorium' };
          }
          if (type.includes('Break')) {
            return { periodIndex, time, type, subject: 'Break', staffCode: '-', teacherName: '-', room: '-' };
          }

          const subject = subjectSeq[ptr] || subjectSeq[0];
          ptr += 1;
          const divCodes = DIVISION_SUBJECT_TEACHER_CODES[division] || {};
          const staffCode = divCodes[subject] || 'TBA';
          const teacherName = teacherNames[staffCode] || 'To Be Assigned';
          const room = `G${grade}${divLabel.charAt(0)}-${((periodIndex + grade) % 4) + 1}`;

          return { periodIndex, time, type, subject, staffCode, teacherName, room };
        });

        docs.push({ grade, division, dayOfWeek, academicYear: '2025-26', periods });
      });
    });
  });

  await TimetableModel.insertMany(docs);
  console.log(`done (${docs.length}).`);
}

// ─── Seed Fees ────────────────────────────────────────────────────────────────
async function seedFees() {
  if ((await Fee.countDocuments()) > 0) {
    console.log('Fees already seeded, skipping.');
    return;
  }

  console.log('Seeding fees...');
  const students = await Student.find({}).lean();
  const ANNUAL_FEE = 90000;
  const INSTALLMENT_AMOUNT = ANNUAL_FEE / 3; // 30000

  const paymentMethods = ['NEFT', 'UPI', 'Cash', 'Card'];
  const delayReasons = [
    'Cheque pickup scheduled next week',
    'Parent requested payment extension',
    'Transfer confirmation awaited from employer',
    'Accounts team awaiting revised waiver approval',
  ];
  const condonenceReasons = [
    'Sibling concession requested',
    'Medical emergency payment deferment',
    'Temporary income disruption',
    'Late fee waiver requested',
  ];

  const seedFromId = (id) => String(id).split('').reduce((t, c) => t + c.charCodeAt(0), 0);

  const feeDocs = students.map((student) => {
    const seed = seedFromId(student.studentCode);
    const isRte = student.isRte;
    const pm = paymentMethods[seed % paymentMethods.length];

    if (isRte) {
      return {
        student: student._id,
        academicYear: '2025-26',
        isRte: true,
        annualFee: 90000,
        installments: [
          { installmentId: 'april', label: 'April Instalment', dueDate: new Date('2026-04-01'), amount: 0, status: 'RTE Zero Fee', paymentDate: '-', paymentMethod: '-', note: 'Covered under Right to Education quota' },
          { installmentId: 'july', label: 'July Instalment', dueDate: new Date('2026-07-01'), amount: 0, status: 'RTE Zero Fee', paymentDate: '-', paymentMethod: '-', note: 'Covered under Right to Education quota' },
          { installmentId: 'november', label: 'November Instalment', dueDate: new Date('2026-11-01'), amount: 0, status: 'RTE Zero Fee', paymentDate: '-', paymentMethod: '-', note: 'Covered under Right to Education quota' },
        ],
      };
    }

    // April
    const aprilR = seed % 100;
    let aprilStatus, aprilDate, aprilMethod, aprilNote;
    if (aprilR < 73) {
      aprilStatus = 'Paid';
      const day = String(Math.min(1 + (seed % 18), 28)).padStart(2, '0');
      aprilDate = aprilR < 5 ? '2026-03-29' : `2026-04-${day}`;
      aprilMethod = pm;
      aprilNote = aprilR < 5 ? 'Advance payment before due date' : 'Paid on schedule';
    } else if (aprilR < 90) {
      aprilStatus = 'Delayed'; aprilDate = '-'; aprilMethod = '-';
      aprilNote = delayReasons[seed % delayReasons.length];
    } else if (aprilR < 97) {
      aprilStatus = 'Condonence Requested'; aprilDate = '-'; aprilMethod = '-';
      aprilNote = condonenceReasons[seed % condonenceReasons.length];
    } else {
      aprilStatus = 'Condonence Approved'; aprilDate = '-'; aprilMethod = '-';
      aprilNote = 'Partial waiver approved by management';
    }

    // July
    const julyR = (seed * 3 + 17) % 100;
    const julyStatus = julyR < 3 ? 'Paid' : 'Upcoming';
    const julyDate = julyR < 3 ? '2026-05-08' : '-';
    const julyMethod = julyR < 3 ? pm : '-';
    const julyNote = julyR < 3 ? 'Advance payment for July instalment' : 'Due 1st July 2026';

    // November
    const novR = (seed * 7 + 41) % 100;
    const novStatus = novR < 1 ? 'Paid' : 'Upcoming';
    const novDate = novR < 1 ? '2026-05-03' : '-';
    const novMethod = novR < 1 ? pm : '-';
    const novNote = novR < 1 ? 'Full-year advance payment' : 'Due 1st November 2026';

    return {
      student: student._id,
      academicYear: '2025-26',
      isRte: false,
      annualFee: 90000,
      installments: [
        { installmentId: 'april', label: 'April Instalment', dueDate: new Date('2026-04-01'), amount: INSTALLMENT_AMOUNT, status: aprilStatus, paymentDate: aprilDate, paymentMethod: aprilMethod, note: aprilNote },
        { installmentId: 'july', label: 'July Instalment', dueDate: new Date('2026-07-01'), amount: INSTALLMENT_AMOUNT, status: julyStatus, paymentDate: julyDate, paymentMethod: julyMethod, note: julyNote },
        { installmentId: 'november', label: 'November Instalment', dueDate: new Date('2026-11-01'), amount: INSTALLMENT_AMOUNT, status: novStatus, paymentDate: novDate, paymentMethod: novMethod, note: novNote },
      ],
    };
  });

  // Insert in batches to avoid memory issues
  const BATCH_SIZE = 200;
  for (let i = 0; i < feeDocs.length; i += BATCH_SIZE) {
    await Fee.insertMany(feeDocs.slice(i, i + BATCH_SIZE));
  }
  console.log(`done (${feeDocs.length}).`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-erp';
  console.log(`Connecting to MongoDB at ${MONGODB_URI} ...`);

  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected.\n');

  await seedStudents();
  await seedStaff();
  await seedTimetable();
  await seedFees();

  console.log('\nSeeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
