const SUBJECTS_G1_G4 = [
  'Library',
  'Maths',
  'EVS',
  'English',
  'Hindi',
  'Marathi',
  'Yoga',
  'Gym',
  'Cyber / Computer',
];

const TIME_SLOTS = [
  '1:00-1:30', '1:30-2:00', '2:00-2:30', '2:30-3:00', '3:00-3:20', '3:20-3:50',
  '3:50-4:20', '4:20-4:30', '4:30-5:00', '5:00-5:30', '5:30-5:45',
];

const PERIOD_TYPES = [
  'Prayer & Assembly', 'Period 1', 'Period 2', 'Period 3', 'Long Break', 'Period 4',
  'Period 5', 'Short Break', 'Period 6', 'Period 7', 'Period 8',
];

const DIVISION_ORDER = ['alpha', 'beta', 'gamma'];
const DIVISION_LABEL = {
  alpha: 'Alpha',
  beta: 'Beta',
  gamma: 'Gamma',
};

const DIVISION_SUBJECT_TEACHER_CODES = {
  alpha: {
    'English': 'TCH001',
    'Library': 'TCH001',
    'Maths': 'TCH002',
    'EVS': 'TCH002',
    'Hindi': 'TCH003',
    'Marathi': 'TCH003',
    'Yoga': 'TCH004',
    'Gym': 'TCH004',
    'Cyber / Computer': 'TCH005',
  },
  beta: {
    'English': 'TCH006',
    'Library': 'TCH006',
    'Maths': 'TCH007',
    'EVS': 'TCH007',
    'Hindi': 'TCH008',
    'Marathi': 'TCH008',
    'Yoga': 'TCH009',
    'Gym': 'TCH009',
    'Cyber / Computer': 'TCH010',
  },
  gamma: {
    'English': 'TCH011',
    'Library': 'TCH011',
    'Maths': 'TCH012',
    'EVS': 'TCH012',
    'Hindi': 'TCH013',
    'Marathi': 'TCH013',
    'Yoga': 'TCH014',
    'Gym': 'TCH014',
    'Cyber / Computer': 'TCH015',
  },
};

const gradeSubjectPattern = {
  1: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Library', 'Yoga', 'Gym'],
  2: ['Maths', 'English', 'EVS', 'Marathi', 'Hindi', 'Library', 'Cyber / Computer', 'Yoga'],
  3: ['English', 'Maths', 'EVS', 'Hindi', 'Marathi', 'Cyber / Computer', 'Library', 'Gym'],
  4: ['Maths', 'English', 'EVS', 'Marathi', 'Hindi', 'Cyber / Computer', 'Yoga', 'Library'],
};

const makeAvatar = (code, name, gender) => {
  const seed = encodeURIComponent(`${code}-${name}`);
  if (gender === 'Female') {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
};

const buildCompensation = (index, isTeaching) => {
  const basePay = isTeaching ? 42000 + (index % 8) * 2500 : 28000 + (index % 6) * 1700;
  const hra = Math.round(basePay * 0.25);
  const academicAllowance = isTeaching ? 3500 + (index % 4) * 800 : 1800 + (index % 3) * 500;
  const performanceBonus = isTeaching ? 4500 + (index % 5) * 700 : 2200 + (index % 4) * 450;
  const monthlyGross = basePay + hra + academicAllowance;
  const annualCtc = monthlyGross * 12 + performanceBonus;

  return {
    basePay,
    hra,
    academicAllowance,
    performanceBonus,
    monthlyGross,
    annualCtc,
  };
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

const brahminMaleFirstNames = ['Soham', 'Adwait', 'Pranav', 'Shrinivas', 'Kaustubh', 'Atharva', 'Niranjan', 'Tanmay'];
const brahminFemaleFirstNames = ['Shravani', 'Isha', 'Mrunmayi', 'Aditi', 'Madhura', 'Ketaki', 'Rujuta', 'Vaidehi'];
const brahminSurnames = ['Kulkarni', 'Joshi', 'Apte', 'Gokhale', 'Ranade', 'Bhave', 'Thatte', 'Agashe'];

const marathiMaleFirstNames = ['Rohan', 'Akshay', 'Yash', 'Nikhil', 'Swapnil', 'Sagar', 'Ravindra', 'Harshal', 'Kiran', 'Pratik'];
const marathiFemaleFirstNames = ['Snehal', 'Kavya', 'Neha', 'Tanvi', 'Mansi', 'Rutuja', 'Gauri', 'Ashwini', 'Shreya', 'Komal'];
const marathiSurnames = ['Patil', 'Shinde', 'Jadhav', 'Pawar', 'Gaikwad', 'Deshmukh', 'Chavan', 'Rane', 'More', 'Mane'];

const nonMaharashtrianMaleNames = ['Raghav', 'Aman', 'Kunal', 'Arnav', 'Vivaan', 'Rudra'];
const nonMaharashtrianFemaleNames = ['Naina', 'Kiara', 'Sara', 'Anika', 'Myra', 'Aisha'];
const nonMaharashtrianSurnames = ['Singh', 'Gupta', 'Sharma', 'Reddy', 'Verma', 'Jain', 'Kapoor', 'Agarwal'];

const subjectBundleRotation = [
  ['English', 'Library'],
  ['Maths', 'EVS'],
  ['Hindi', 'Marathi'],
  ['Yoga', 'Gym'],
  ['Cyber / Computer'],
  ['Maths', 'Cyber / Computer'],
  ['English', 'Marathi'],
  ['EVS', 'Library'],
];

const generatedTeachers = [];
for (let i = 16; i <= 50; i += 1) {
  const localIndex = i - 16;
  const code = `TCH${String(i).padStart(3, '0')}`;
  const gender = i % 2 === 0 ? 'Male' : 'Female';

  let isMaharashtrian;
  let isBrahmin;

  if (localIndex < 25) {
    isMaharashtrian = true;
    isBrahmin = localIndex < 10;
  } else {
    isMaharashtrian = false;
    isBrahmin = false;
  }

  let firstName;
  let surname;

  if (isMaharashtrian && isBrahmin) {
    firstName = gender === 'Male'
      ? brahminMaleFirstNames[localIndex % brahminMaleFirstNames.length]
      : brahminFemaleFirstNames[localIndex % brahminFemaleFirstNames.length];
    surname = brahminSurnames[Math.floor(localIndex / 2) % brahminSurnames.length];
  } else if (isMaharashtrian) {
    firstName = gender === 'Male'
      ? marathiMaleFirstNames[localIndex % marathiMaleFirstNames.length]
      : marathiFemaleFirstNames[localIndex % marathiFemaleFirstNames.length];
    surname = marathiSurnames[Math.floor(localIndex / 2) % marathiSurnames.length];
  } else {
    firstName = gender === 'Male'
      ? nonMaharashtrianMaleNames[localIndex % nonMaharashtrianMaleNames.length]
      : nonMaharashtrianFemaleNames[localIndex % nonMaharashtrianFemaleNames.length];
    surname = nonMaharashtrianSurnames[Math.floor(localIndex / 2) % nonMaharashtrianSurnames.length];
  }

  const prefix = gender === 'Male' ? 'Mr.' : 'Ms.';
  generatedTeachers.push({
    code,
    name: `${prefix} ${firstName} ${surname}`,
    gender,
    isMaharashtrian,
    isBrahmin,
    assignedSubjects: subjectBundleRotation[localIndex % subjectBundleRotation.length],
  });
}

const TEACHING_FACULTY = [...foundationalTeachers, ...generatedTeachers].map((teacher, index) => {
  const compensation = buildCompensation(index, true);
  return {
    ...teacher,
    category: 'Teaching',
    department: 'Academics',
    qualification: teacher.assignedSubjects.includes('Cyber / Computer')
      ? 'B.Tech, B.Ed'
      : teacher.assignedSubjects.includes('Maths')
      ? 'M.Sc, B.Ed'
      : 'M.A, B.Ed',
    experienceYearsPrior: 3 + (index % 11),
    experienceYearsCurrentSchool: 2 + (index % 8),
    classesTakenTotal: 2400 + index * 34,
    classesTakenYtd: 130 + (index * 8) % 180,
    joiningDate: `15-06-${2015 + (index % 9)}`,
    phone: `+91 98${String(10000000 + index * 173).slice(-8)}`,
    email: `${teacher.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')}@smtschool.edu.in`,
    compensation,
    photo: makeAvatar(teacher.code, teacher.name, teacher.gender),
    status: index % 10 === 0 ? 'On Leave' : 'Active',
  };
});

const nonTeachingStaffSeed = [
  { code: 'NTS001', name: 'Mrs. Smita Naik', gender: 'Female', role: 'Principal', department: 'Administration', qualification: 'M.Ed, M.A (Education)' },
  { code: 'NTS002', name: 'Mr. Nilesh Kulkarni', gender: 'Male', role: 'Vice Principal', department: 'Administration', qualification: 'M.Ed, B.Ed' },
  { code: 'NTS003', name: 'Ms. Rucha Patil', gender: 'Female', role: 'Admin Officer', department: 'Administration', qualification: 'MBA, B.Com' },
  { code: 'NTS004', name: 'Mr. Dheeraj Shah', gender: 'Male', role: 'Accountant', department: 'Finance', qualification: 'M.Com, CA Inter' },
  { code: 'NTS005', name: 'Ms. Pallavi Deshpande', gender: 'Female', role: 'Librarian', department: 'Operations', qualification: 'M.Lib, B.A' },
  { code: 'NTS006', name: 'Ms. Anagha Joshi', gender: 'Female', role: 'Counselor', department: 'Student Welfare', qualification: 'M.A Psychology' },
  { code: 'NTS007', name: 'Mr. Harish Singh', gender: 'Male', role: 'Nurse', department: 'Health', qualification: 'GNM, B.Sc Nursing' },
  { code: 'NTS008', name: 'Mr. Sandeep More', gender: 'Male', role: 'Lab Assistant', department: 'Academics', qualification: 'B.Sc' },
  { code: 'NTS009', name: 'Ms. Ketaki Chavan', gender: 'Female', role: 'Transport Coordinator', department: 'Transport', qualification: 'Graduate Diploma' },
  { code: 'NTS010', name: 'Mr. Ritesh Reddy', gender: 'Male', role: 'IT Support Executive', department: 'Technology', qualification: 'BCA, Diploma IT' },
];

const NON_TEACHING_STAFF = nonTeachingStaffSeed.map((staff, index) => {
  const compensation = buildCompensation(index, false);
  return {
    ...staff,
    category: 'Non-Teaching',
    experienceYearsPrior: 4 + (index % 9),
    experienceYearsCurrentSchool: 2 + (index % 7),
    classesTakenTotal: '-',
    classesTakenYtd: '-',
    joiningDate: `10-04-${2014 + (index % 9)}`,
    phone: `+91 99${String(20000000 + index * 211).slice(-8)}`,
    email: `${staff.name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.')}@smtschool.edu.in`,
    compensation,
    photo: makeAvatar(staff.code, staff.name, staff.gender),
    isMaharashtrian: index < 7,
    isBrahmin: index < 3,
    status: index === 3 ? 'On Leave' : 'Active',
  };
});

const ALL_STAFF = [...TEACHING_FACULTY, ...NON_TEACHING_STAFF];

const getTeacherByCode = (code) => {
  return TEACHING_FACULTY.find((teacher) => teacher.code === code) || null;
};

const getTeacherForSubject = (division, subject) => {
  const divisionKey = String(division || '').toLowerCase();
  const teacherCode = DIVISION_SUBJECT_TEACHER_CODES[divisionKey]?.[subject];
  return getTeacherByCode(teacherCode);
};

const buildClassTimetable = (grade, division) => {
  const gradeNumber = Number(grade);
  const divisionKey = String(division || '').toLowerCase();
  const subjectSequence = gradeSubjectPattern[gradeNumber] || gradeSubjectPattern[1];

  let sequencePointer = 0;
  return TIME_SLOTS.map((timeSlot, periodIndex) => {
    const periodType = PERIOD_TYPES[periodIndex];
    const divisionText = DIVISION_LABEL[divisionKey] || divisionKey;

    if (periodType === 'Prayer & Assembly') {
      return {
        id: `${gradeNumber}-${divisionKey}-${periodIndex}`,
        time: timeSlot,
        type: periodType,
        subject: 'Assembly',
        teacher: 'All Staff',
        teacherCode: 'ALL',
        room: 'Auditorium',
        grade: gradeNumber,
        division: divisionText,
      };
    }

    if (periodType.includes('Break')) {
      return {
        id: `${gradeNumber}-${divisionKey}-${periodIndex}`,
        time: timeSlot,
        type: periodType,
        subject: 'Break',
        teacher: '-',
        teacherCode: '-',
        room: '-',
        grade: gradeNumber,
        division: divisionText,
      };
    }

    const subject = subjectSequence[sequencePointer] || subjectSequence[0];
    sequencePointer += 1;

    const teacher = getTeacherForSubject(divisionKey, subject);
    const room = `G${gradeNumber}${divisionText.charAt(0)}-${((periodIndex + gradeNumber) % 4) + 1}`;

    return {
      id: `${gradeNumber}-${divisionKey}-${periodIndex}`,
      time: timeSlot,
      type: periodType,
      subject,
      teacher: teacher ? teacher.name : 'To Be Assigned',
      teacherCode: teacher ? teacher.code : 'TBA',
      room,
      grade: gradeNumber,
      division: divisionText,
    };
  });
};

const buildConsolidatedTimetable = () => {
  const timetable = {};
  const grades = [1, 2, 3, 4];

  grades.forEach((grade) => {
    DIVISION_ORDER.forEach((divisionKey) => {
      const classKey = `Grade ${grade} ${DIVISION_LABEL[divisionKey]}`;
      timetable[classKey] = buildClassTimetable(grade, divisionKey);
    });
  });

  return {
    timetable,
    timeSlots: TIME_SLOTS,
  };
};

const getPeriodById = (id) => {
  const match = String(id || '').match(/^(\d+)-([a-z]+)-(\d+)$/);
  if (!match) return null;

  const grade = Number(match[1]);
  const division = match[2];
  const periodIndex = Number(match[3]);
  const classPeriods = buildClassTimetable(grade, division);
  return classPeriods[periodIndex] || null;
};

export {
  ALL_STAFF,
  DIVISION_SUBJECT_TEACHER_CODES,
  DIVISION_ORDER,
  NON_TEACHING_STAFF,
  PERIOD_TYPES,
  SUBJECTS_G1_G4,
  TEACHING_FACULTY,
  TIME_SLOTS,
  buildClassTimetable,
  buildConsolidatedTimetable,
  getPeriodById,
  getTeacherByCode,
  getTeacherForSubject,
};
