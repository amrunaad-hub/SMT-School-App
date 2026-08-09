// Generates a realistic Maharashtra-flavoured student/guardian/admission roster for
// local development and pilot demos. Run with `npm run seed:demo`. Knex-based (the
// old server/utils/seedDatabase.js and seedAllModules.js are Mongoose-era dead code
// left over from before the SQLite migration and are not touched by this script).
//
// Grade 3 gets the full pilot roster (Alpha/Beta/Gamma x 40 = 120); every other
// grade (1,2,4-10) gets a lighter 10-15/division roster, reusing the same
// Alpha/Beta/Gamma division scheme school-wide (see Module 1 plan: this avoids a
// SQLite enum-column migration for divisions that don't otherwise need to differ).
require('dotenv').config();
const db = require('../db/database');

const MALE_FIRST_NAMES = [
  'Aarav', 'Vihaan', 'Ishaan', 'Aditya', 'Sarthak', 'Om', 'Atharv', 'Rohan', 'Yash', 'Pranav',
  'Aryan', 'Krish', 'Rudra', 'Vedant', 'Aadi', 'Arnav', 'Dev', 'Harsh', 'Kabir', 'Neel',
  'Parth', 'Reyansh', 'Samar', 'Shaurya', 'Tanish', 'Veer', 'Yug', 'Aarush', 'Advait', 'Ansh',
  'Chirag', 'Dhruv', 'Eshan', 'Girish', 'Hrithik', 'Jay', 'Karan', 'Lakshya', 'Manas', 'Nakul',
  'Omkar', 'Pratik', 'Raghav', 'Sahil', 'Tejas', 'Umang', 'Vishal', 'Abhijeet', 'Ajay', 'Akash',
  'Amol', 'Anand', 'Ashwin', 'Bhavesh', 'Chetan', 'Dinesh', 'Ganesh', 'Hemant', 'Jayesh', 'Kiran',
  'Lalit', 'Mahesh', 'Nilesh', 'Prakash', 'Sagar', 'Suresh', 'Tushar', 'Vikas', 'Yogesh', 'Rushikesh',
];

const FEMALE_FIRST_NAMES = [
  'Ananya', 'Diya', 'Ira', 'Kavya', 'Myra', 'Navya', 'Pari', 'Riya', 'Saanvi', 'Tara',
  'Vanya', 'Zara', 'Aadhya', 'Aarohi', 'Avni', 'Bhavya', 'Charvi', 'Disha', 'Esha', 'Gauri',
  'Hiya', 'Isha', 'Jiya', 'Kashvi', 'Lavanya', 'Maithili', 'Naina', 'Pihu', 'Siya', 'Trisha',
  'Urvi', 'Vidhi', 'Yashvi', 'Aashi', 'Anushka', 'Aparna', 'Bhavana', 'Devika', 'Falguni', 'Girija',
  'Harshita', 'Indira', 'Janhavi', 'Kirti', 'Leela', 'Madhuri', 'Nandini', 'Pallavi', 'Priya', 'Radha',
  'Sanika', 'Tanvi', 'Uma', 'Varsha', 'Yamini', 'Alisha', 'Damini', 'Ekta', 'Gayatri', 'Hemangi',
  'Jyoti', 'Kalyani', 'Manasi', 'Neha', 'Poonam', 'Rasika', 'Shalini', 'Trupti', 'Vaishnavi', 'Rutuja',
];

const SURNAMES = [
  'Deshmukh', 'Kulkarni', 'Joshi', 'Patil', 'Shinde', 'Pawar', 'Jadhav', 'More', 'Gaikwad', 'Chavan',
  'Bhosale', 'Sawant', 'Kadam', 'Bhagat', 'Naik', 'Desai', 'Rane', 'Salunkhe', 'Kale', 'Thorat',
  'Wagh', 'Mane', 'Gawande', 'Ingle', 'Deshpande', 'Kolhe', 'Apte', 'Karve', 'Bhave', 'Gokhale',
  'Ranade', 'Sathe', 'Vaidya', 'Damle', 'Phadke', 'Marathe', 'Ketkar', 'Limaye', 'Oak', 'Paranjape',
];

const OCCUPATIONS = ['Software Engineer', 'School Teacher', 'Doctor', 'Business Owner', 'Bank Officer', 'Government Employee', 'Accountant', 'Nurse', 'Shop Owner', 'Civil Engineer', 'Lawyer', 'Architect'];
const QUALIFICATIONS = ['B.Com', 'B.E.', 'B.Sc', 'M.Com', 'M.E.', 'MBA', 'B.A.', 'M.A.', 'Diploma', 'HSC', 'Ph.D'];
const AREAS = ['Thane West', 'Thane East', 'Ghodbunder Road', 'Vartak Nagar', 'Naupada', 'Panchpakhadi', 'Manpada', 'Kolshet Road', 'Majiwada', 'Balkum', 'Kasarvadavali', 'Hiranandani Estate'];
const BOARDS = ['CBSE', 'ICSE', 'SSC (Maharashtra State Board)'];
const PREVIOUS_SCHOOLS = ['Little Flower School', "St. Xavier's High School", 'New Horizon Public School', 'Sunshine English School', 'Podar International School', 'Ryan Global School'];
const MEDICAL_CONDITIONS = ['Asthma — carries inhaler', 'Peanut allergy', 'Type 1 Diabetes', 'Seasonal pollen allergy', 'Mild lactose intolerance'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DIVISIONS = ['alpha', 'beta', 'gamma'];
const RELATIONS_TWO_PARENT = ['Father', 'Mother'];
const GUARDIAN_ONLY_RELATIONS = ['Guardian']; // e.g. grandparent/uncle raising the child

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickWeighted = (pairs) => {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of pairs) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return pairs[0][0];
};
const pad = (n, len = 2) => String(n).padStart(len, '0');
const randomDateInYear = (year, monthMin = 0, monthMax = 11) => {
  const month = monthMin + Math.floor(Math.random() * (monthMax - monthMin + 1));
  const day = 1 + Math.floor(Math.random() * 28);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
};

const usedFullNames = new Set();
function uniqueChildName(gender, surname) {
  const pool = gender === 'Female' ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const first = pick(pool);
    const full = `${first} ${surname}`;
    if (!usedFullNames.has(full)) { usedFullNames.add(full); return first; }
  }
  const first = `${pick(pool)}${Math.floor(Math.random() * 900 + 100)}`;
  usedFullNames.add(`${first} ${surname}`);
  return first;
}

const usedMobiles = new Set();
function uniqueMobile() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const mobile = `${pick(['6', '7', '8', '9'])}${Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')}`;
    if (!usedMobiles.has(mobile)) { usedMobiles.add(mobile); return mobile; }
  }
  throw new Error('Ran out of unique mobile numbers — pool exhausted.');
}

// A "family" is generated once and can produce 1+ children (siblings/twins) that
// share guardians. familyType drives which guardian records exist.
function generateFamily() {
  const surname = pick(SURNAMES);
  const familyType = pickWeighted([['two-parent', 80], ['single-parent', 12], ['guardian-only', 8]]);
  const email = (name) => `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;

  let guardians;
  if (familyType === 'two-parent') {
    const fatherFirst = pick(MALE_FIRST_NAMES);
    const motherFirst = pick(FEMALE_FIRST_NAMES);
    guardians = [
      { fullName: `${fatherFirst} ${surname}`, mobile: uniqueMobile(), email: email(`${fatherFirst}.${surname}`), occupation: pick(OCCUPATIONS), qualification: pick(QUALIFICATIONS), relation: 'Father', isPrimary: true, isEmergencyContact: true },
      { fullName: `${motherFirst} ${surname}`, mobile: uniqueMobile(), email: email(`${motherFirst}.${surname}`), occupation: pick(OCCUPATIONS), qualification: pick(QUALIFICATIONS), relation: 'Mother', isPrimary: false, isEmergencyContact: true },
    ];
  } else if (familyType === 'single-parent') {
    const relation = pick(RELATIONS_TWO_PARENT);
    const first = pick(relation === 'Father' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    guardians = [
      { fullName: `${first} ${surname}`, mobile: uniqueMobile(), email: email(`${first}.${surname}`), occupation: pick(OCCUPATIONS), qualification: pick(QUALIFICATIONS), relation, isPrimary: true, isEmergencyContact: true },
    ];
  } else {
    const relation = pick(GUARDIAN_ONLY_RELATIONS);
    const first = pick(Math.random() < 0.5 ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
    guardians = [
      { fullName: `${first} ${surname}`, mobile: uniqueMobile(), email: email(`${first}.${surname}`), occupation: pick(OCCUPATIONS), qualification: pick(QUALIFICATIONS), relation, isPrimary: true, isEmergencyContact: true },
    ];
  }

  return { surname, familyType, guardians, address: `${100 + Math.floor(Math.random() * 800)}, ${pick(['Sai Apartments', 'Green Valley CHS', 'Sunshine Residency', 'Om Sai Nagar', 'Vrindavan Society', 'Om Shanti Apartments'])}, ${pick(AREAS)}, Thane, Maharashtra`, area: pick(AREAS) };
}

function buildRoster() {
  // { grade, division } slots, in generation order.
  const slots = [];
  for (let grade = 1; grade <= 10; grade += 1) {
    const countPerDivision = grade === 3 ? 40 : (10 + Math.floor(Math.random() * 6)); // 10-15
    DIVISIONS.forEach((division) => {
      for (let i = 0; i < countPerDivision; i += 1) slots.push({ grade, division });
    });
  }
  return slots;
}

async function seed() {
  const existingCount = await db('students').count({ count: '*' }).first();
  if (Number(existingCount.count) > 0 && !process.env.FORCE_RESEED) {
    console.log(`[seedSchoolData] students table already has ${existingCount.count} rows — skipping. Set FORCE_RESEED=1 to override (does not delete existing data, just adds more).`);
    process.exit(0);
  }

  const houses = await db('houses').select('id');
  if (houses.length === 0) throw new Error('No houses found — run migrations first (npm run migrate or start the server once).');

  const slots = buildRoster();
  console.log(`[seedSchoolData] Generating ${slots.length} students across grades 1-10...`);

  const rollCounters = {}; // `${grade}-${division}` -> next roll number
  const nextRoll = (grade, division) => {
    const key = `${grade}-${division}`;
    rollCounters[key] = (rollCounters[key] || 0) + 1;
    return rollCounters[key];
  };

  // Pre-select ~14% of slot indices to be part of a sibling family (paired with
  // another random slot elsewhere in the roster — siblings are usually in
  // different grades). A subset of same-grade pairs become twins.
  const siblingPairs = [];
  const usedForSiblings = new Set();
  const siblingCandidateCount = Math.floor(slots.length * 0.14);
  for (let i = 0; i < siblingCandidateCount; i += 2) {
    let a = Math.floor(Math.random() * slots.length);
    let b = Math.floor(Math.random() * slots.length);
    let tries = 0;
    while ((usedForSiblings.has(a) || usedForSiblings.has(b) || a === b) && tries < 20) {
      a = Math.floor(Math.random() * slots.length);
      b = Math.floor(Math.random() * slots.length);
      tries += 1;
    }
    if (usedForSiblings.has(a) || usedForSiblings.has(b) || a === b) continue;
    usedForSiblings.add(a);
    usedForSiblings.add(b);
    const isTwin = slots[a].grade === slots[b].grade && Math.random() < 0.4;
    siblingPairs.push({ a, b, isTwin });
  }
  const slotToFamily = new Map(); // slotIndex -> family object
  const slotToTwinPartner = new Map();
  siblingPairs.forEach(({ a, b, isTwin }) => {
    const family = generateFamily();
    slotToFamily.set(a, family);
    slotToFamily.set(b, family);
    if (isTwin) {
      slotToTwinPartner.set(a, b);
      slotToTwinPartner.set(b, a);
    }
  });

  const currentYear = new Date().getFullYear();
  const insertedStudentIds = new Array(slots.length).fill(null);
  const insertedDobs = new Array(slots.length).fill(null);

  for (let i = 0; i < slots.length; i += 1) {
    const { grade, division } = slots[i];
    const gender = Math.random() < 0.5 ? 'Male' : 'Female';
    const family = slotToFamily.get(i) || generateFamily();
    const firstName = uniqueChildName(gender, family.surname);
    const rollNo = nextRoll(grade, division);
    const studentCode = `G${grade}-${division.toUpperCase()}-${pad(rollNo, 3)}`;

    // Age roughly matches grade (Grade 1 ~ age 6, up to Grade 10 ~ age 15); admission
    // year staggered so older grades look like they've been enrolled longer.
    const approxAge = grade + 5;
    const birthYear = currentYear - approxAge;
    const twinPartnerIdx = slotToTwinPartner.get(i);
    const dob = (twinPartnerIdx !== undefined && insertedDobs[twinPartnerIdx]) ? insertedDobs[twinPartnerIdx] : randomDateInYear(birthYear);
    insertedDobs[i] = dob;

    const admissionYear = Math.min(currentYear, birthYear + 5 + Math.floor(Math.random() * 2));
    const isMidYear = Math.random() < 0.06;
    const isTransfer = Math.random() < 0.05;
    const hasMedical = Math.random() < 0.08;
    const house = houses[Math.floor(Math.random() * houses.length)];

    const primaryGuardian = family.guardians.find((g) => g.isPrimary) || family.guardians[0];

    const now = new Date().toISOString();
    const [{ id: studentId }] = await db('students').insert({
      student_code: studentCode,
      first_name: firstName,
      last_name: family.surname,
      grade,
      division,
      roll_no: rollNo,
      gender,
      dob,
      parent_name: primaryGuardian.fullName,
      parent_mobile: primaryGuardian.mobile,
      parent_email: primaryGuardian.email,
      address: family.address,
      is_rte: Math.random() < 0.08,
      is_maharashtrian: Math.random() < 0.75,
      admission_year: admissionYear,
      status: 'Active',
      house_id: house.id,
      blood_group: hasMedical || Math.random() < 0.3 ? pick(BLOOD_GROUPS) : null,
      medical_conditions: hasMedical ? pick(MEDICAL_CONDITIONS) : null,
      medical_notes: hasMedical ? 'Class teacher and school nurse informed. Emergency contact briefed.' : null,
      previous_school_name: isTransfer ? pick(PREVIOUS_SCHOOLS) : null,
      previous_school_board: isTransfer ? pick(BOARDS) : null,
      previous_grade_completed: isTransfer && grade > 1 ? `Grade ${grade - 1}` : null,
      is_twin_of: (twinPartnerIdx !== undefined && insertedStudentIds[twinPartnerIdx]) ? insertedStudentIds[twinPartnerIdx] : null,
      created_at: now,
      updated_at: now,
    }).returning('id');
    insertedStudentIds[i] = studentId;

    // Twin linkage is mutual, but slots are processed in index order — whichever
    // twin comes first in the loop has no partner row yet at insert time (handled
    // via the `is_twin_of` ternary above, which correctly leaves it null then).
    // Once the second twin is inserted, back-fill the first one's `is_twin_of` so
    // both rows end up pointing at each other.
    if (twinPartnerIdx !== undefined && insertedStudentIds[twinPartnerIdx]) {
      await db('students').where({ id: insertedStudentIds[twinPartnerIdx] }).update({ is_twin_of: studentId });
    }

    // Guardians: find-or-create by mobile (siblings sharing a family naturally dedupe).
    for (const g of family.guardians) {
      let guardian = await db('guardians').where({ mobile: g.mobile }).first();
      let guardianId;
      if (guardian) {
        guardianId = guardian.id;
      } else {
        const [inserted] = await db('guardians').insert({
          full_name: g.fullName, mobile: g.mobile, email: g.email, occupation: g.occupation,
          qualification: g.qualification, address: family.address, created_at: now, updated_at: now,
        }).returning('id');
        guardianId = inserted.id;
      }
      await db('student_guardians').insert({
        student_id: studentId, guardian_id: guardianId, relation: g.relation,
        is_primary: g.isPrimary, is_emergency_contact: g.isEmergencyContact,
      }).catch(() => {}); // ignore rare unique-constraint clash if a family is reused across accidental duplicate slots
    }

    // Matching admissions row (status Confirmed, back-referencing the student) so
    // the admission->student link looks realistic in demo data too.
    const admissionCreatedAt = isMidYear ? randomDateInYear(admissionYear, 5, 10) : randomDateInYear(admissionYear, 0, 3);
    const [{ id: admissionId }] = await db('admissions').insert({
      enquiry_code: `ENQ-${admissionYear}-${pad(i + 1, 4)}`,
      child_name: `${firstName} ${family.surname}`,
      dob,
      current_school: isTransfer ? pick(PREVIOUS_SCHOOLS) : null,
      applying_for_grade: grade,
      enquiry_type: isTransfer ? 'Transfer' : 'New Admission',
      area: family.area,
      parent_name: primaryGuardian.fullName,
      parent_mobile: primaryGuardian.mobile,
      parent_email: primaryGuardian.email,
      address: family.address,
      blood_group: hasMedical ? pick(BLOOD_GROUPS) : null,
      medical_notes: hasMedical ? 'See student medical record.' : null,
      source: pick(['Website', 'Phone', 'Walk-in', 'Referral']),
      status: 'Confirmed',
      academic_year: '2025-26',
      is_draft: false,
      student_id: studentId,
      created_at: admissionCreatedAt,
      updated_at: admissionCreatedAt,
    }).returning('id');

    await db('students').where({ id: studentId }).update({ admission_id: admissionId });

    if ((i + 1) % 50 === 0) console.log(`[seedSchoolData] ${i + 1}/${slots.length} students created...`);
  }

  console.log(`[seedSchoolData] Done. ${slots.length} students, ${usedMobiles.size} unique guardian mobiles created.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seedSchoolData] Failed:', err);
  process.exit(1);
});
