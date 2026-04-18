import React, { useEffect, useMemo, useState } from 'react';

const teachingSubjects = [
  'Mathematics', 'English', 'Hindi', 'Science', 'EVS', 'Social Studies',
  'Computer Science', 'Art', 'Music', 'Physical Education',
];

const firstNames = [
  'Aarav', 'Ishaan', 'Vihaan', 'Aditya', 'Krish', 'Arjun', 'Kabir', 'Rohan', 'Dev', 'Nikhil',
  'Anaya', 'Diya', 'Mira', 'Riya', 'Saanvi', 'Aditi', 'Kavya', 'Pooja', 'Ira', 'Tara',
];

const lastNames = [
  'Sharma', 'Patel', 'Kulkarni', 'Iyer', 'Reddy', 'Naik', 'Joshi', 'Kapoor', 'Saxena', 'Mehta',
  'Bose', 'Mishra', 'Singh', 'Chavan', 'Deshmukh', 'Gupta', 'Verma', 'Nair', 'Jain', 'Pillai',
];

const nonTeachingRoles = [
  'Principal',
  'Vice Principal',
  'Admin Officer',
  'Accountant',
  'Librarian',
  'Counselor',
  'Nurse',
  'Lab Assistant',
  'Transport Coordinator',
  'IT Support Executive',
];

const makeEmail = (name, code) => {
  return `${name.toLowerCase().replace(/\s+/g, '.')}+${code.toLowerCase()}@smtschool.edu.in`;
};

const HR = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 920);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 920);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getAcademicYearLabel = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    return `${startYear}-${String(endYear).slice(-2)}`;
  };

  const academicYear = useMemo(() => getAcademicYearLabel(new Date()), []);

  const teachingStaff = useMemo(() => {
    return Array.from({ length: 50 }, (_, index) => {
      const id = index + 1;
      const code = `TCH${String(id).padStart(3, '0')}`;
      const fullName = `${index % 2 === 0 ? 'Mr.' : 'Ms.'} ${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`;
      const currentSchoolExperienceYears = 2 + (index % 8);
      const priorExperienceYears = 1 + (index % 11);
      const joiningYear = 2026 - currentSchoolExperienceYears;
      const classesTakenTotal = 2200 + index * 37;
      const classesTakenYTD = 110 + ((index * 9) % 180);
      const subject = teachingSubjects[index % teachingSubjects.length];

      return {
        id: code,
        name: fullName,
        category: 'Teaching',
        role: `${subject} Teacher`,
        department: 'Academics',
        qualification: index % 3 === 0 ? 'M.Ed, B.Ed' : index % 3 === 1 ? 'M.A, B.Ed' : 'M.Sc, B.Ed',
        priorExperienceYears,
        currentSchoolExperienceYears,
        classesTakenTotal,
        classesTakenYTD,
        joiningDate: `15-06-${joiningYear}`,
        phone: `+91 98${String(10000000 + index * 137).slice(-8)}`,
        email: makeEmail(fullName.replace('Mr. ', '').replace('Ms. ', ''), code),
        status: index % 9 === 0 ? 'On Leave' : 'Active',
      };
    });
  }, []);

  const nonTeachingStaff = useMemo(() => {
    return nonTeachingRoles.map((role, index) => {
      const id = index + 1;
      const code = `NTS${String(id).padStart(3, '0')}`;
      const fullName = `${index % 2 === 0 ? 'Mr.' : 'Ms.'} ${firstNames[(index + 6) % firstNames.length]} ${lastNames[(index + 11) % lastNames.length]}`;
      const currentSchoolExperienceYears = 3 + (index % 7);
      const priorExperienceYears = 2 + (index % 10);
      const joiningYear = 2026 - currentSchoolExperienceYears;

      return {
        id: code,
        name: fullName,
        category: 'Non-Teaching',
        role,
        department: role.includes('Principal') || role.includes('Admin') ? 'Administration' : role.includes('Accountant') ? 'Finance' : role.includes('IT') ? 'Technology' : 'Operations',
        qualification: role.includes('Principal') ? 'M.Ed, M.A (Education)' : role.includes('Accountant') ? 'B.Com, M.Com' : role.includes('IT') ? 'B.Tech (Computer Science)' : 'Graduate Diploma',
        priorExperienceYears,
        currentSchoolExperienceYears,
        classesTakenTotal: '-',
        classesTakenYTD: '-',
        joiningDate: `10-04-${joiningYear}`,
        phone: `+91 99${String(20000000 + index * 211).slice(-8)}`,
        email: makeEmail(fullName.replace('Mr. ', '').replace('Ms. ', ''), code),
        status: index === 3 ? 'On Leave' : 'Active',
      };
    });
  }, []);

  const staffMasterList = useMemo(() => [...teachingStaff, ...nonTeachingStaff], [teachingStaff, nonTeachingStaff]);

  const stats = useMemo(() => {
    const activeCount = staffMasterList.filter((member) => member.status === 'Active').length;
    return {
      total: staffMasterList.length,
      teaching: teachingStaff.length,
      nonTeaching: nonTeachingStaff.length,
      active: activeCount,
    };
  }, [staffMasterList, teachingStaff, nonTeachingStaff]);

  const cardStyle = {
    padding: '18px',
    border: '1px solid #dbeafe',
    borderRadius: '14px',
    background: '#ffffff',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.06)',
  };

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto', background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ marginBottom: '8px', color: '#0f172a' }}>Human Resources (HR) Master List</h2>
        <p style={{ color: '#475569', marginTop: 0 }}>
          Teaching and non-teaching profile records with qualifications, experience, and workload metrics. Academic Year {academicYear} (April to March).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginTop: '18px' }}>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Total Staff</p>
            <h3 style={{ margin: '8px 0 0', color: '#1d4ed8' }}>{stats.total}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Teaching Staff</p>
            <h3 style={{ margin: '8px 0 0', color: '#16a34a' }}>{stats.teaching}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Non-Teaching Staff</p>
            <h3 style={{ margin: '8px 0 0', color: '#ea580c' }}>{stats.nonTeaching}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Currently Active</p>
            <h3 style={{ margin: '8px 0 0', color: '#0f766e' }}>{stats.active}</h3>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '12px', color: '#0f172a' }}>Staff Profiles</h3>
        {isMobile ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {staffMasterList.map((person) => (
              <article key={person.id} style={{ ...cardStyle, borderColor: person.category === 'Teaching' ? '#86efac' : '#fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                  <strong style={{ color: '#0f172a' }}>{person.name}</strong>
                  <span style={{ fontSize: '0.78rem', background: person.category === 'Teaching' ? '#dcfce7' : '#ffedd5', color: '#334155', padding: '3px 8px', borderRadius: '999px' }}>{person.id}</span>
                </div>
                <p style={{ margin: '6px 0 0', color: '#334155' }}>{person.role} ({person.category})</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Qualification: {person.qualification}</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Experience: {person.priorExperienceYears} yrs prior, {person.currentSchoolExperienceYears} yrs in current school</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Classes: {person.classesTakenTotal} total, {person.classesTakenYTD} this year</p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>Department: {person.department} | Status: {person.status}</p>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #dbeafe', borderRadius: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1500px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', color: '#fff' }}>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Emp Code</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Department</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Qualification</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Prior Exp (Yrs)</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Current School Exp (Yrs)</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Classes Taken So Far</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Classes This Year</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Joining Date</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Phone</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '11px 10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffMasterList.map((person, index) => (
                  <tr key={person.id} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px' }}>{person.id}</td>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{person.name}</td>
                    <td style={{ padding: '10px' }}>{person.category}</td>
                    <td style={{ padding: '10px' }}>{person.role}</td>
                    <td style={{ padding: '10px' }}>{person.department}</td>
                    <td style={{ padding: '10px' }}>{person.qualification}</td>
                    <td style={{ padding: '10px' }}>{person.priorExperienceYears}</td>
                    <td style={{ padding: '10px' }}>{person.currentSchoolExperienceYears}</td>
                    <td style={{ padding: '10px' }}>{person.classesTakenTotal}</td>
                    <td style={{ padding: '10px' }}>{person.classesTakenYTD}</td>
                    <td style={{ padding: '10px' }}>{person.joiningDate}</td>
                    <td style={{ padding: '10px' }}>{person.phone}</td>
                    <td style={{ padding: '10px' }}>{person.email}</td>
                    <td style={{ padding: '10px', color: person.status === 'Active' ? '#15803d' : '#b45309', fontWeight: 600 }}>{person.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default HR;
