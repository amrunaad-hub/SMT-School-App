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
const MAHARASHTRIAN_TARGET = Math.floor(TOTAL_STUDENTS * 0.8);
const MAX_FIRST_NAME_REPEAT = Math.max(2, Math.floor(TOTAL_STUDENTS * 0.02));

const formatDivision = (division) => `${division.charAt(0).toUpperCase()}${division.slice(1)}`;

const getComboName = (pointer, firstNamePool, surnamePool) => {
  const firstIndex = pointer % firstNamePool.length;
  const surnameIndex = Math.floor(pointer / firstNamePool.length) % surnamePool.length;
  return {
    firstName: firstNamePool[firstIndex],
    surname: surnamePool[surnameIndex],
  };
};

const buildStudentDirectory = () => {
  const students = [];
  const usedFullNames = new Set();
  const firstNameUsage = new Map();
  let maharashtrianPointer = 0;
  let nonMaharashtrianPointer = 0;

  const pickUniqueName = (isMaharashtrian) => {
    const firstNamePool = isMaharashtrian ? MAHARASHTRIAN_FIRST_NAMES : NON_MAHARASHTRIAN_FIRST_NAMES;
    const surnamePool = isMaharashtrian ? MAHARASHTRIAN_SURNAMES : NON_MAHARASHTRIAN_SURNAMES;
    const poolSize = firstNamePool.length * surnamePool.length;

    for (let attempt = 0; attempt < poolSize; attempt += 1) {
      const pointer = isMaharashtrian ? maharashtrianPointer + attempt : nonMaharashtrianPointer + attempt;
      const { firstName, surname } = getComboName(pointer, firstNamePool, surnamePool);
      const fullName = `${firstName} ${surname}`;
      const currentUsage = firstNameUsage.get(firstName) || 0;

      if (!usedFullNames.has(fullName) && currentUsage < MAX_FIRST_NAME_REPEAT) {
        if (isMaharashtrian) {
          maharashtrianPointer = pointer + 1;
        } else {
          nonMaharashtrianPointer = pointer + 1;
        }

        usedFullNames.add(fullName);
        firstNameUsage.set(firstName, currentUsage + 1);
        return { fullName, firstName, surname, isMaharashtrian };
      }
    }

    for (let attempt = 0; attempt < poolSize; attempt += 1) {
      const pointer = isMaharashtrian ? maharashtrianPointer + attempt : nonMaharashtrianPointer + attempt;
      const { firstName, surname } = getComboName(pointer, firstNamePool, surnamePool);
      const fullName = `${firstName} ${surname}`;

      if (!usedFullNames.has(fullName)) {
        if (isMaharashtrian) {
          maharashtrianPointer = pointer + 1;
        } else {
          nonMaharashtrianPointer = pointer + 1;
        }

        usedFullNames.add(fullName);
        firstNameUsage.set(firstName, (firstNameUsage.get(firstName) || 0) + 1);
        return { fullName, firstName, surname, isMaharashtrian };
      }
    }

    return null;
  };

  let globalIndex = 0;

  GRADES.forEach((grade) => {
    DIVISIONS.forEach((division) => {
      for (let rollNo = 1; rollNo <= STUDENTS_PER_DIVISION; rollNo += 1) {
        const isMaharashtrian = globalIndex < MAHARASHTRIAN_TARGET;
        const chosenName = pickUniqueName(isMaharashtrian);

        if (!chosenName) {
          continue;
        }

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
