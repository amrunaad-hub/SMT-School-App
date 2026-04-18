import React, { useEffect, useMemo, useState } from 'react';
import SearchBar from './SearchBar';
import { ALL_STAFF, DIVISION_SUBJECT_TEACHER_CODES, NON_TEACHING_STAFF, SUBJECTS_G1_G4, TEACHING_FACULTY } from '../data/facultyScheduler';

const HR = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 920);
  const [staffQuery, setStaffQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedPayBand, setSelectedPayBand] = useState('all');

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

  const filteredStaff = useMemo(() => {
    const query = staffQuery.trim().toLowerCase();
    if (!query) return ALL_STAFF;

    return ALL_STAFF.filter((member) => {
      return member.name.toLowerCase().includes(query)
        || member.code.toLowerCase().includes(query)
        || member.role.toLowerCase().includes(query)
        || member.department.toLowerCase().includes(query)
        || member.category.toLowerCase().includes(query)
        || member.assignedSubjects?.join(', ').toLowerCase().includes(query);
    });
  }, [staffQuery]);

  const stats = useMemo(() => {
    const teachingMaharashtrian = TEACHING_FACULTY.filter((staff) => staff.isMaharashtrian).length;
    const teachingBrahminWithinMaharashtrian = TEACHING_FACULTY.filter((staff) => staff.isMaharashtrian && staff.isBrahmin).length;
    const maharashtrianShare = Math.round((teachingMaharashtrian / TEACHING_FACULTY.length) * 100);
    const brahminShareWithinMaharashtrian = Math.round((teachingBrahminWithinMaharashtrian / teachingMaharashtrian) * 100);

    return {
      total: ALL_STAFF.length,
      teaching: TEACHING_FACULTY.length,
      nonTeaching: NON_TEACHING_STAFF.length,
      active: ALL_STAFF.filter((staff) => staff.status === 'Active').length,
      maharashtrianShare,
      brahminShareWithinMaharashtrian,
    };
  }, []);

  const teacherDivisionAssignments = useMemo(() => {
    const map = {};
    Object.entries(DIVISION_SUBJECT_TEACHER_CODES).forEach(([division, subjectMap]) => {
      Object.entries(subjectMap).forEach(([subject, teacherCode]) => {
        if (!map[teacherCode]) {
          map[teacherCode] = {
            divisions: new Set(),
            subjects: new Set(),
          };
        }
        map[teacherCode].divisions.add(division);
        map[teacherCode].subjects.add(subject);
      });
    });
    return map;
  }, []);

  const getPayBand = (monthlyGross) => {
    if (monthlyGross >= 65000) return '65k+';
    if (monthlyGross >= 55000) return '55k-64k';
    return 'below-55k';
  };

  const filteredTeachingAnalytics = useMemo(() => {
    return TEACHING_FACULTY.filter((teacher) => {
      const assignment = teacherDivisionAssignments[teacher.code] || { divisions: new Set(), subjects: new Set() };

      const subjectMatch = selectedSubject === 'all'
        ? true
        : assignment.subjects.has(selectedSubject) || teacher.assignedSubjects?.includes(selectedSubject);

      const divisionMatch = selectedDivision === 'all'
        ? true
        : assignment.divisions.has(selectedDivision);

      const payBandMatch = selectedPayBand === 'all'
        ? true
        : getPayBand(teacher.compensation.monthlyGross) === selectedPayBand;

      return subjectMatch && divisionMatch && payBandMatch;
    });
  }, [selectedSubject, selectedDivision, selectedPayBand, teacherDivisionAssignments]);

  const analyticsSummary = useMemo(() => {
    if (filteredTeachingAnalytics.length === 0) {
      return {
        avgMonthlyGross: 0,
        avgAnnualCtc: 0,
        avgClassesYtd: 0,
      };
    }

    const totals = filteredTeachingAnalytics.reduce((acc, teacher) => {
      acc.monthly += teacher.compensation.monthlyGross;
      acc.annual += teacher.compensation.annualCtc;
      acc.classesYtd += teacher.classesTakenYtd;
      return acc;
    }, { monthly: 0, annual: 0, classesYtd: 0 });

    return {
      avgMonthlyGross: Math.round(totals.monthly / filteredTeachingAnalytics.length),
      avgAnnualCtc: Math.round(totals.annual / filteredTeachingAnalytics.length),
      avgClassesYtd: Math.round(totals.classesYtd / filteredTeachingAnalytics.length),
    };
  }, [filteredTeachingAnalytics]);

  const summaryCardStyle = {
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #bfdbfe',
    background: '#ffffff',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
  };

  return (
    <main style={{ padding: isMobile ? '16px' : '24px', maxWidth: '1400px', margin: '0 auto', background: 'linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%)', minHeight: 'calc(100vh - 100px)' }}>
      <section>
        <h2 style={{ marginBottom: '8px', color: '#0f172a' }}>Human Resources (HR) Master Faculty Grid</h2>
        <p style={{ color: '#475569', marginTop: 0 }}>
          Unified staff roster with compensation details and faculty mapping used across timetable modules. Academic Year {academicYear} (April to March).
        </p>
        <p style={{ color: '#475569', marginTop: '6px', marginBottom: '14px', fontSize: '0.93rem' }}>
          Grade 1-4 subject basket: {SUBJECTS_G1_G4.join(', ')}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Total Staff</p>
            <strong style={{ fontSize: '1.2rem', color: '#1d4ed8' }}>{stats.total}</strong>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Teaching</p>
            <strong style={{ fontSize: '1.2rem', color: '#16a34a' }}>{stats.teaching}</strong>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Non-Teaching</p>
            <strong style={{ fontSize: '1.2rem', color: '#ea580c' }}>{stats.nonTeaching}</strong>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Active</p>
            <strong style={{ fontSize: '1.2rem', color: '#0f766e' }}>{stats.active}</strong>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Maharashtrian (Teaching)</p>
            <strong style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{stats.maharashtrianShare}%</strong>
          </div>
          <div style={summaryCardStyle}>
            <p style={{ margin: 0, color: '#64748b' }}>Brahmin Within Maharashtrian</p>
            <strong style={{ fontSize: '1.2rem', color: '#0ea5e9' }}>{stats.brahminShareWithinMaharashtrian}%</strong>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '14px', padding: '14px', border: '1px solid #bfdbfe', borderRadius: '14px', background: '#ffffff' }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#0f172a' }}>Faculty Workload & Compensation Analytics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(180px, 1fr))', gap: '10px' }}>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Subjects</option>
              {SUBJECTS_G1_G4.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Divisions</option>
              <option value="alpha">Alpha</option>
              <option value="beta">Beta</option>
              <option value="gamma">Gamma</option>
            </select>
            <select value={selectedPayBand} onChange={(e) => setSelectedPayBand(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <option value="all">All Pay Bands</option>
              <option value="below-55k">Below Rs. 55,000</option>
              <option value="55k-64k">Rs. 55,000 - Rs. 64,999</option>
              <option value="65k+">Rs. 65,000 and above</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Matched Faculty</p>
              <strong>{filteredTeachingAnalytics.length}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Monthly Gross</p>
              <strong>Rs. {analyticsSummary.avgMonthlyGross.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Annual CTC</p>
              <strong>Rs. {analyticsSummary.avgAnnualCtc.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Avg Classes YTD</p>
              <strong>{analyticsSummary.avgClassesYtd}</strong>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: '12px', color: '#0f172a' }}>Staff Profiles</h3>
        <SearchBar
          value={staffQuery}
          onChange={(e) => setStaffQuery(e.target.value)}
          placeholder="Search by name, faculty code, role, subject, department or category"
          maxWidth="680px"
          containerStyle={{ marginBottom: '12px' }}
          inputStyle={{ border: '1px solid #bfdbfe' }}
        />
        <p style={{ color: '#64748b', marginTop: 0, marginBottom: '12px' }}>Showing {filteredStaff.length} of {ALL_STAFF.length} staff members.</p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(1, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px' }}>
          {filteredStaff.map((person) => (
            <article
              key={person.code}
              style={{
                border: `1px solid ${person.category === 'Teaching' ? '#86efac' : '#fed7aa'}`,
                borderRadius: '16px',
                background: '#fff',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.07)',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img
                  src={person.photo}
                  alt={`${person.name} avatar`}
                  style={{ width: '74px', height: '74px', borderRadius: '12px', border: '1px solid #dbeafe', background: '#f8fafc' }}
                />
                <div>
                  <h4 style={{ margin: 0, color: '#0f172a' }}>{person.name}</h4>
                  <p style={{ margin: '4px 0 0', color: '#334155', fontSize: '0.9rem' }}>{person.role}</p>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>{person.code} • {person.category}</p>
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '6px', fontSize: '0.83rem', color: '#475569' }}>
                <span><strong>Department:</strong> {person.department}</span>
                <span><strong>Status:</strong> {person.status}</span>
                <span><strong>Qualification:</strong> {person.qualification}</span>
                <span><strong>Prior Exp:</strong> {person.experienceYearsPrior} yrs</span>
                <span><strong>Current School:</strong> {person.experienceYearsCurrentSchool} yrs</span>
                <span><strong>Joining:</strong> {person.joiningDate}</span>
                <span><strong>Phone:</strong> {person.phone}</span>
                <span><strong>Email:</strong> {person.email}</span>
                <span><strong>Classes Total:</strong> {person.classesTakenTotal}</span>
                <span><strong>Classes YTD:</strong> {person.classesTakenYtd}</span>
              </div>

              {person.assignedSubjects ? (
                <p style={{ marginTop: '8px', marginBottom: 0, color: '#475569', fontSize: '0.85rem' }}>
                  <strong>Assigned Subjects:</strong> {person.assignedSubjects.join(', ')}
                </p>
              ) : null}

              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p style={{ margin: 0, color: '#1f2937', fontSize: '0.85rem' }}>
                  <strong>Compensation:</strong> Base Rs. {person.compensation.basePay.toLocaleString('en-IN')} + HRA Rs. {person.compensation.hra.toLocaleString('en-IN')} + Academic Allowance Rs. {person.compensation.academicAllowance.toLocaleString('en-IN')}
                </p>
                <p style={{ margin: '6px 0 0', color: '#1f2937', fontSize: '0.85rem' }}>
                  <strong>Monthly Gross:</strong> Rs. {person.compensation.monthlyGross.toLocaleString('en-IN')} | <strong>Bonus:</strong> Rs. {person.compensation.performanceBonus.toLocaleString('en-IN')} | <strong>Annual CTC:</strong> Rs. {person.compensation.annualCtc.toLocaleString('en-IN')}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default HR;
