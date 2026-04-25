const GRADES = Array.from({ length: 10 }, (_, index) => index + 1);
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const STUDENTS_PER_DIVISION = 40;

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
  const firstNameSlots = [];
  const surnameSlots = [];

  const firstBase = Math.floor(TOTAL_STUDENTS / ALL_FIRST_NAMES.length);
  const firstRemainder = TOTAL_STUDENTS % ALL_FIRST_NAMES.length;
  ALL_FIRST_NAMES.forEach((firstName, index) => {
    const count = firstBase + (index < firstRemainder ? 1 : 0);
    for (let i = 0; i < Math.min(count, MAX_FIRST_NAME_REPEAT); i += 1) {
      firstNameSlots.push(firstName);
    }
  });

  const surnameBase = Math.floor(TOTAL_STUDENTS / ALL_SURNAMES.length);
  const surnameRemainder = TOTAL_STUDENTS % ALL_SURNAMES.length;
  ALL_SURNAMES.forEach((surname, index) => {
    const count = surnameBase + (index < surnameRemainder ? 1 : 0);
    for (let i = 0; i < Math.min(count, MAX_SURNAME_REPEAT); i += 1) {
      surnameSlots.push(surname);
    }
  });

  const shuffledFirstNames = shuffle(firstNameSlots).slice(0, TOTAL_STUDENTS);
  const shuffledSurnames = shuffle(surnameSlots).slice(0, TOTAL_STUDENTS);

  const namePool = [];
  for (let i = 0; i < TOTAL_STUDENTS; i += 1) {
    const firstName = shuffledFirstNames[i];
    const surname = shuffledSurnames[i];

    namePool.push({
      fullName: `${firstName} ${surname}`,
      firstName,
      surname,
      isMaharashtrian: MAHARASHTRIAN_SURNAMES.includes(surname),
    });
  }

  return namePool;
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
