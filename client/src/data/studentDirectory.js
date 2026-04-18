const GRADES = Array.from({ length: 10 }, (_, index) => index + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const STUDENTS_PER_DIVISION = 38;

const MAHARASHTRIAN_FIRST_NAMES = [
  'Aarav', 'Aditya', 'Atharva', 'Om', 'Vedant', 'Siddharth', 'Rohit', 'Rohan', 'Yash', 'Sanket',
  'Pranav', 'Aniket', 'Abhishek', 'Swapnil', 'Tejas', 'Akash', 'Harshad', 'Kunal', 'Nikhil', 'Sachin',
  'Aditi', 'Ananya', 'Sakshi', 'Shruti', 'Pooja', 'Kavya', 'Neha', 'Ritika', 'Prachi', 'Mrunal',
  'Isha', 'Tanvi', 'Rutuja', 'Sneha', 'Mansi', 'Vaishnavi', 'Ketaki', 'Komal', 'Gauri', 'Ashwini',
  'Tanish', 'Parth', 'Soham', 'Aviral', 'Krish', 'Ishaan', 'Vihaan', 'Arjun', 'Kabir', 'Dev',
  'Meera', 'Riya', 'Ira', 'Saanvi', 'Diya', 'Tara', 'Nandini', 'Anjali', 'Shreya', 'Pallavi'
];

const MAHARASHTRIAN_SURNAMES = [
  'Deshmukh', 'Bhosale', 'Pawar', 'Jadhav', 'More', 'Kulkarni', 'Joshi', 'Patil', 'Desai', 'Gaikwad',
  'Chavan', 'Rane', 'Salunkhe', 'Mahajan', 'Nimbalkar', 'Gokhale', 'Apte', 'Tilak', 'Ranade', 'Shirke',
  'Shinde', 'Wagh', 'Kadam', 'Thakur', 'Sawant', 'Mane', 'Kale', 'Bendre', 'Dongre', 'Inamdar'
];

const NON_MAHARASHTRIAN_FIRST_NAMES = [
  'Rahul', 'Vikas', 'Aman', 'Karan', 'Arnav', 'Rudra', 'Dhruv', 'Samarth', 'Vivaan', 'Ranbir',
  'Priya', 'Naina', 'Anika', 'Siya', 'Jiya', 'Myra', 'Kiara', 'Sara', 'Alisha', 'Aisha'
];

const NON_MAHARASHTRIAN_SURNAMES = [
  'Singh', 'Kumar', 'Gupta', 'Reddy', 'Verma', 'Jain', 'Agarwal', 'Shah', 'Kapoor', 'Malhotra'
];

const TOTAL_STUDENTS = GRADES.length * DIVISIONS.length * STUDENTS_PER_DIVISION;
const MAX_SURNAME_REPEAT = Math.max(2, Math.floor(TOTAL_STUDENTS * 0.03));
const MAX_FIRST_NAME_REPEAT = Math.max(2, Math.floor(TOTAL_STUDENTS * 0.05));
const ALL_FIRST_NAMES = [...MAHARASHTRIAN_FIRST_NAMES, ...NON_MAHARASHTRIAN_FIRST_NAMES];
const ALL_SURNAMES = [...MAHARASHTRIAN_SURNAMES, ...NON_MAHARASHTRIAN_SURNAMES];

const formatDivision = (division) => `${division.charAt(0).toUpperCase()}${division.slice(1)}`;

const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildRandomNamePool = () => {
  const namePool = [];
  const usedFullNames = new Set();
  const firstNameUsage = new Map();
  const surnameUsage = new Map();
  let attempts = 0;
  const maxAttempts = TOTAL_STUDENTS * 120;

  while (namePool.length < TOTAL_STUDENTS && attempts < maxAttempts) {
    attempts += 1;

    const firstName = ALL_FIRST_NAMES[Math.floor(Math.random() * ALL_FIRST_NAMES.length)];
    const surname = ALL_SURNAMES[Math.floor(Math.random() * ALL_SURNAMES.length)];
    const fullName = `${firstName} ${surname}`;
    const firstCount = firstNameUsage.get(firstName) || 0;
    const surnameCount = surnameUsage.get(surname) || 0;

    if (usedFullNames.has(fullName)) {
      continue;
    }

    if (firstCount >= MAX_FIRST_NAME_REPEAT || surnameCount >= MAX_SURNAME_REPEAT) {
      continue;
    }

    usedFullNames.add(fullName);
    firstNameUsage.set(firstName, firstCount + 1);
    surnameUsage.set(surname, surnameCount + 1);
    namePool.push({
      fullName,
      firstName,
      surname,
      isMaharashtrian: MAHARASHTRIAN_SURNAMES.includes(surname),
    });
  }

  if (namePool.length < TOTAL_STUDENTS) {
    throw new Error('Unable to build balanced student name pool with current constraints.');
  }

  return shuffle(namePool);
};

const buildStudentDirectory = () => {
  const students = [];
  const randomizedNames = buildRandomNamePool();
  let globalIndex = 0;

  GRADES.forEach((grade) => {
    DIVISIONS.forEach((division) => {
      for (let rollNo = 1; rollNo <= STUDENTS_PER_DIVISION; rollNo += 1) {
        const chosenName = randomizedNames[globalIndex];

        const id = `${grade}-${division}-${rollNo}`;
        students.push({
          id,
          name: chosenName.fullName,
          firstName: chosenName.firstName,
          surname: chosenName.surname,
          isMaharashtrian: chosenName.isMaharashtrian,
          rollNo,
          grade,
          division,
          gradeLabel: `${grade} ${formatDivision(division)}`,
        });

        globalIndex += 1;
      }
    });
  });

  return students;
};

const SCHOOL_STUDENT_DIRECTORY = buildStudentDirectory();

const getStudentsByClass = (grade, division) => {
  const normalizedDivision = String(division || '').toLowerCase();
  const parsedGrade = Number(grade);
  return SCHOOL_STUDENT_DIRECTORY.filter((student) => {
    return student.grade === parsedGrade && student.division === normalizedDivision;
  });
};

const getStudentById = (id) => {
  return SCHOOL_STUDENT_DIRECTORY.find((student) => student.id === id) || null;
};

const searchStudentsByName = (query, limit = 30) => {
  const keyword = String(query || '').trim().toLowerCase();
  if (!keyword) return [];

  return SCHOOL_STUDENT_DIRECTORY
    .filter((student) => student.name.toLowerCase().includes(keyword))
    .slice(0, limit);
};

export {
  DIVISIONS,
  GRADES,
  SCHOOL_STUDENT_DIRECTORY,
  STUDENTS_PER_DIVISION,
  getStudentById,
  getStudentsByClass,
  searchStudentsByName,
};
