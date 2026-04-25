import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DIVISIONS, GRADES, SCHOOL_STUDENT_DIRECTORY, STUDENTS_PER_DIVISION } from '../data/studentDirectory';

const ANNUAL_FEE = 90000;
const INSTALLMENT_AMOUNT = ANNUAL_FEE / 3;
const RTE_PER_DIVISION = Math.round(STUDENTS_PER_DIVISION * 0.25);

const installmentSchedule = [
  { id: 'april', label: 'April Instalment', dueDate: '2026-04-01' },
  { id: 'july', label: 'July Instalment', dueDate: '2026-07-01' },
  { id: 'november', label: 'November Instalment', dueDate: '2026-11-01' },
];

const paymentMethods = ['NEFT', 'UPI', 'Cash', 'Card'];
const condonenceReasons = [
  'Sibling concession requested',
  'Medical emergency payment deferment',
  'Temporary income disruption',
  'Late fee waiver requested',
];
const delayReasons = [
  'Cheque pickup scheduled next week',
  'Parent requested payment extension',
  'Transfer confirmation awaited from employer',
  'Accounts team awaiting revised waiver approval',
];

const seedFromId = (id) => {
  return id.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatDivision = (division) => `${division.charAt(0).toUpperCase()}${division.slice(1)}`;

const buildStudentFeeLedger = () => {
  return SCHOOL_STUDENT_DIRECTORY.map((student) => {
    const seed = seedFromId(student.id);
    const isRte = student.rollNo <= RTE_PER_DIVISION;
    const profileType = seed % 8;
    const paymentMethod = paymentMethods[seed % paymentMethods.length];

    const installments = installmentSchedule.map((installment, index) => {
      const defaultPaidDate = installment.id === 'april'
        ? '2026-03-29'
        : installment.id === 'july'
          ? '2026-06-28'
          : '2026-10-28';

      if (isRte) {
        return {
          ...installment,
          amount: 0,
          status: 'RTE Zero Fee',
          paymentDate: '-',
          paymentMethod: '-',
          note: 'Covered under Right to Education quota',
        };
      }

      if (profileType <= 2) {
        return {
          ...installment,
          amount: INSTALLMENT_AMOUNT,
          status: 'Paid',
          paymentDate: defaultPaidDate,
          paymentMethod,
          note: 'Paid within schedule',
        };
      }

      if (profileType === 3) {
        return {
          ...installment,
          amount: INSTALLMENT_AMOUNT,
          status: index < 2 ? 'Paid' : 'Delayed',
          paymentDate: index < 2 ? defaultPaidDate : '-',
          paymentMethod: index < 2 ? paymentMethod : '-',
          note: index < 2 ? 'Paid within schedule' : delayReasons[seed % delayReasons.length],
        };
      }

      if (profileType === 4) {
        return {
          ...installment,
          amount: INSTALLMENT_AMOUNT,
          status: index === 0 ? 'Paid' : 'Condonence Requested',
          paymentDate: index === 0 ? defaultPaidDate : '-',
          paymentMethod: index === 0 ? paymentMethod : '-',
          note: index === 0 ? 'Paid before due date' : condonenceReasons[seed % condonenceReasons.length],
        };
      }

      if (profileType === 5) {
        return {
          ...installment,
          amount: INSTALLMENT_AMOUNT,
          status: index === 0 ? 'Condonence Approved' : index === 1 ? 'Delayed' : 'Upcoming',
          paymentDate: '-',
          paymentMethod: '-',
          note: index === 0 ? 'Approved partial waiver for first instalment' : index === 1 ? delayReasons[(seed + 1) % delayReasons.length] : 'Due in November cycle',
        };
      }

      if (profileType === 6) {
        return {
          ...installment,
          amount: INSTALLMENT_AMOUNT,
          status: index < 2 ? 'Paid' : 'Upcoming',
          paymentDate: index < 2 ? defaultPaidDate : '-',
          paymentMethod: index < 2 ? paymentMethod : '-',
          note: index < 2 ? 'Paid within schedule' : 'Scheduled for November collection round',
        };
      }

      return {
        ...installment,
        amount: INSTALLMENT_AMOUNT,
        status: index === 0 ? 'Paid' : 'Delayed',
        paymentDate: index === 0 ? defaultPaidDate : '-',
        paymentMethod: index === 0 ? paymentMethod : '-',
        note: index === 0 ? 'Paid within schedule' : delayReasons[(seed + index) % delayReasons.length],
      };
    });

    const paidAmount = installments.reduce((total, installment) => {
      return total + (installment.status === 'Paid' ? installment.amount : 0);
    }, 0);
    const payableAmount = isRte ? 0 : ANNUAL_FEE;
    const pendingAmount = Math.max(payableAmount - paidAmount, 0);
    const overallStatus = isRte
      ? 'RTE Zero Fee'
      : pendingAmount === 0
        ? 'Fully Paid'
        : installments.some((installment) => installment.status.includes('Condonence'))
          ? 'Condonence Case'
          : installments.some((installment) => installment.status === 'Delayed')
            ? 'Delayed Payment'
            : 'Partially Paid';

    return {
      ...student,
      gradeLabel: `Grade ${student.grade}`,
      divisionLabel: `Division ${formatDivision(student.division)}`,
      isRte,
      payableAmount,
      paidAmount,
      pendingAmount,
      overallStatus,
      installments,
    };
  });
};

const Finance = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [selectedInstallment, setSelectedInstallment] = useState('april');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const feeLedger = useMemo(() => buildStudentFeeLedger(), []);

  const schoolSummary = useMemo(() => {
    const enrolledStudents = feeLedger.length;
    const rteStudents = feeLedger.filter((student) => student.isRte).length;
    const payableStudents = enrolledStudents - rteStudents;
    const expectedAmount = payableStudents * ANNUAL_FEE;
    const collectedAmount = feeLedger.reduce((sum, student) => sum + student.paidAmount, 0);
    const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
    return { enrolledStudents, rteStudents, payableStudents, expectedAmount, collectedAmount, pendingAmount };
  }, [feeLedger]);

  const installmentSummary = useMemo(() => {
    return installmentSchedule.map((installment) => {
      const records = feeLedger.map((student) => {
        return {
          student,
          installment: student.installments.find((item) => item.id === installment.id),
        };
      });
      const expected = records.reduce((sum, record) => sum + record.installment.amount, 0);
      const collected = records.reduce((sum, record) => sum + (record.installment.status === 'Paid' ? record.installment.amount : 0), 0);

      return {
        ...installment,
        expected,
        collected,
        fullyPaidCount: records.filter((record) => record.student.overallStatus === 'Fully Paid').length,
        delayedCount: records.filter((record) => record.installment.status === 'Delayed').length,
        condonenceCount: records.filter((record) => record.installment.status.includes('Condonence')).length,
        rteCount: records.filter((record) => record.student.isRte).length,
      };
    });
  }, [feeLedger]);

  const gradeSummary = useMemo(() => {
    return GRADES.map((grade) => {
      const label = `Grade ${grade}`;
      const students = feeLedger.filter((student) => student.grade === grade);
      const expectedAmount = students.reduce((sum, student) => sum + student.payableAmount, 0);
      const collectedAmount = students.reduce((sum, student) => sum + student.paidAmount, 0);
      const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
      const selectedRecords = students.map((student) => student.installments.find((item) => item.id === selectedInstallment));
      return {
        grade,
        label,
        students,
        expectedAmount,
        collectedAmount,
        pendingAmount,
        collectionPercent: expectedAmount > 0 ? Math.round((collectedAmount / expectedAmount) * 100) : 100,
        rteCount: students.filter((student) => student.isRte).length,
        fullyPaidCount: students.filter((student) => student.overallStatus === 'Fully Paid').length,
        delayedCount: selectedRecords.filter((record) => record.status === 'Delayed').length,
        condonenceCount: selectedRecords.filter((record) => record.status.includes('Condonence')).length,
        divisions: DIVISIONS.map((division) => {
          const divisionStudents = students.filter((student) => student.division === division);
          const divisionExpected = divisionStudents.reduce((sum, student) => sum + student.payableAmount, 0);
          const divisionCollected = divisionStudents.reduce((sum, student) => sum + student.paidAmount, 0);
          const divisionRecords = divisionStudents.map((student) => student.installments.find((item) => item.id === selectedInstallment));
          return {
            division,
            label: `Division ${formatDivision(division)}`,
            students: divisionStudents.length,
            expectedAmount: divisionExpected,
            collectedAmount: divisionCollected,
            collectionPercent: divisionExpected > 0 ? Math.round((divisionCollected / divisionExpected) * 100) : 100,
            rteCount: divisionStudents.filter((student) => student.isRte).length,
            delayedCount: divisionRecords.filter((record) => record.status === 'Delayed').length,
            condonenceCount: divisionRecords.filter((record) => record.status.includes('Condonence')).length,
            fullyPaidCount: divisionStudents.filter((student) => student.overallStatus === 'Fully Paid').length,
          };
        }),
      };
    });
  }, [feeLedger, selectedInstallment]);

  const filteredStudents = useMemo(() => {
    return feeLedger.filter((student) => {
      const installment = student.installments.find((item) => item.id === selectedInstallment);
      const gradeMatch = selectedGrade === 'all' ? true : String(student.grade) === selectedGrade;
      const divisionMatch = selectedDivision === 'all' ? true : student.division === selectedDivision;

      let categoryMatch = true;
      if (selectedCategory === 'fully-paid') categoryMatch = student.overallStatus === 'Fully Paid';
      if (selectedCategory === 'pending') categoryMatch = !student.isRte && student.pendingAmount > 0;
      if (selectedCategory === 'delayed') categoryMatch = installment.status === 'Delayed';
      if (selectedCategory === 'condonence') categoryMatch = installment.status.includes('Condonence');
      if (selectedCategory === 'rte') categoryMatch = student.isRte;

      return gradeMatch && divisionMatch && categoryMatch;
    });
  }, [feeLedger, selectedInstallment, selectedGrade, selectedDivision, selectedCategory]);

  const activeInstallmentSummary = installmentSummary.find((installment) => installment.id === selectedInstallment) || installmentSummary[0];

  const sectionStyle = {
    marginTop: '24px',
    padding: isMobile ? '16px' : '24px',
    borderRadius: '20px',
    background: '#ffffff',
    boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
  };

  const cardStyle = {
    padding: '18px 20px',
    borderRadius: '18px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  const filterButtonStyle = (active) => ({
    padding: '10px 14px',
    borderRadius: '999px',
    border: `1px solid ${active ? '#16a34a' : '#cbd5e1'}`,
    background: active ? '#dcfce7' : '#fff',
    color: active ? '#166534' : '#0f172a',
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1280px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Fee Collection Analytics</h2>
        <p style={{ color: '#475569', marginTop: '8px', maxWidth: '900px' }}>
          Three-instalment fee tracking across all grades and divisions. Drill down into fully paid students, delayed payment cases, condonence requests, and Right to Education zero-fee admissions.
        </p>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Enrolled Students</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{schoolSummary.enrolledStudents}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>All grades and all divisions.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>RTE Zero Fee</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{schoolSummary.rteStudents}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>About 25% of each division under Right to Education.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Expected Fee</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{formatCurrency(schoolSummary.expectedAmount)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>After excluding zero-fee RTE students.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Collected To Date</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{formatCurrency(schoolSummary.collectedAmount)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>{formatCurrency(schoolSummary.pendingAmount)} still pending.</p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Instalment Progress</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>April, July and November rounds with delay, condonence and fully paid visibility.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {installmentSchedule.map((installment) => (
              <button key={installment.id} type="button" style={filterButtonStyle(selectedInstallment === installment.id)} onClick={() => setSelectedInstallment(installment.id)}>
                {installment.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '18px' }}>
          {installmentSummary.map((installment) => {
            const percent = installment.expected > 0 ? Math.round((installment.collected / installment.expected) * 100) : 100;
            const active = installment.id === selectedInstallment;
            return (
              <button
                key={installment.id}
                type="button"
                onClick={() => setSelectedInstallment(installment.id)}
                style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: active ? '#16a34a' : '#e2e8f0', background: active ? '#f0fdf4' : '#f8fafc' }}
              >
                <h4 style={{ margin: 0 }}>{installment.label}</h4>
                <p style={{ margin: '8px 0 0', color: '#475569' }}>{percent}% collected</p>
                <div style={{ height: '10px', borderRadius: '999px', background: '#dcfce7', overflow: 'hidden', marginTop: '12px' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' }} />
                </div>
                <p style={{ margin: '12px 0 0', color: '#0f172a' }}><strong>{formatCurrency(installment.collected)}</strong> of {formatCurrency(installment.expected)}</p>
                <div style={{ marginTop: '10px', display: 'grid', gap: '4px', color: '#475569', fontSize: '0.84rem' }}>
                  <span>Delayed: {installment.delayedCount}</span>
                  <span>Condonence: {installment.condonenceCount}</span>
                  <span>Fully paid students: {installment.fullyPaidCount}</span>
                  <span>RTE zero fee: {installment.rteCount}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Grade-wise and Division-wise Collection</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Every grade and every division is included in the selected instalment round.</p>
          </div>
          <div style={{ ...cardStyle, minWidth: '240px', background: '#ecfdf5', borderColor: '#bbf7d0' }}>
            <div style={{ color: '#166534', fontWeight: 700 }}>Selected instalment</div>
            <div style={{ marginTop: '8px', fontSize: '1.2rem', fontWeight: 800 }}>{activeInstallmentSummary.label}</div>
            <div style={{ marginTop: '8px', color: '#166534' }}>Collected {formatCurrency(activeInstallmentSummary.collected)} of {formatCurrency(activeInstallmentSummary.expected)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '20px' }}>
          {gradeSummary.map((grade) => (
            <div key={grade.grade} style={{ ...cardStyle, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{grade.label}</h4>
                  <p style={{ margin: '8px 0 0', color: '#64748b' }}>{grade.students.length} students</p>
                </div>
                <button
                  type="button"
                  style={filterButtonStyle(selectedGrade === String(grade.grade))}
                  onClick={() => {
                    setSelectedGrade(selectedGrade === String(grade.grade) ? 'all' : String(grade.grade));
                    setSelectedDivision('all');
                  }}
                >
                  {selectedGrade === String(grade.grade) ? 'Selected' : 'Drill down'}
                </button>
              </div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '6px', color: '#334155', fontSize: '0.9rem' }}>
                <span>Collected: <strong>{formatCurrency(grade.collectedAmount)}</strong></span>
                <span>Pending: <strong>{formatCurrency(grade.pendingAmount)}</strong></span>
                <span>RTE zero fee: <strong>{grade.rteCount}</strong></span>
                <span>Fully paid: <strong>{grade.fullyPaidCount}</strong></span>
                <span>Delayed: <strong>{grade.delayedCount}</strong></span>
                <span>Condonence: <strong>{grade.condonenceCount}</strong></span>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', marginTop: '14px' }}>
                <div style={{ width: `${grade.collectionPercent}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)' }} />
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                {grade.divisions.map((division) => (
                  <button
                    key={division.division}
                    type="button"
                    onClick={() => {
                      setSelectedGrade(String(grade.grade));
                      setSelectedDivision(division.division);
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '14px',
                      border: `1px solid ${selectedGrade === String(grade.grade) && selectedDivision === division.division ? '#0ea5e9' : '#dbeafe'}`,
                      background: selectedGrade === String(grade.grade) && selectedDivision === division.division ? '#eff6ff' : '#f8fafc',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <strong>{division.label}</strong>
                      <span>{division.collectionPercent}%</span>
                    </div>
                    <div style={{ marginTop: '8px', display: 'grid', gap: '4px', color: '#475569', fontSize: '0.82rem' }}>
                      <span>Students: {division.students}</span>
                      <span>RTE: {division.rteCount}</span>
                      <span>Fully paid: {division.fullyPaidCount}</span>
                      <span>Delayed: {division.delayedCount}</span>
                      <span>Condonence: {division.condonenceCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Student Fee Drill-down</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Rows include fully paid details, condonence notes, delayed payment remarks, and student profile links.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All students' },
              { id: 'fully-paid', label: 'Fully paid' },
              { id: 'pending', label: 'Pending' },
              { id: 'delayed', label: 'Delayed' },
              { id: 'condonence', label: 'Condonence' },
              { id: 'rte', label: 'RTE zero fee' },
            ].map((option) => (
              <button key={option.id} type="button" style={filterButtonStyle(selectedCategory === option.id)} onClick={() => setSelectedCategory(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
          <select value={selectedGrade} onChange={(event) => {
            setSelectedGrade(event.target.value);
            setSelectedDivision('all');
          }} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <option value="all">All grades</option>
            {GRADES.map((grade) => <option key={grade} value={String(grade)}>Grade {grade}</option>)}
          </select>
          <select value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <option value="all">All divisions</option>
            {DIVISIONS.map((division) => <option key={division} value={division}>Division {formatDivision(division)}</option>)}
          </select>
        </div>

        {isMobile ? (
          <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
            {filteredStudents.slice(0, 60).map((student) => {
              const installment = student.installments.find((item) => item.id === selectedInstallment);
              return (
                <article key={student.id} style={{ ...cardStyle, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <Link to={`/sis/student/${student.id}`} style={{ color: '#0f172a', fontWeight: 800, textDecoration: 'none' }}>{student.name}</Link>
                      <p style={{ margin: '6px 0 0', color: '#475569' }}>Grade {student.grade} · Division {formatDivision(student.division)} · Roll {student.rollNo}</p>
                    </div>
                    <span style={{ color: student.isRte ? '#166534' : installment.status === 'Paid' ? '#166534' : installment.status === 'Delayed' ? '#b45309' : '#1d4ed8', fontWeight: 700 }}>{installment.status}</span>
                  </div>
                  <div style={{ marginTop: '10px', display: 'grid', gap: '4px', color: '#334155', fontSize: '0.9rem' }}>
                    <span>Current instalment: {formatCurrency(installment.amount)}</span>
                    <span>Paid till date: {formatCurrency(student.paidAmount)}</span>
                    <span>Pending: {formatCurrency(student.pendingAmount)}</span>
                    <span>Note: {installment.note}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Grade</th>
                  <th style={{ padding: '12px 16px' }}>Division</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>{activeInstallmentSummary.label}</th>
                  <th style={{ padding: '12px 16px' }}>Paid Till Date</th>
                  <th style={{ padding: '12px 16px' }}>Pending</th>
                  <th style={{ padding: '12px 16px' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const installment = student.installments.find((item) => item.id === selectedInstallment);
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}><Link to={`/sis/student/${student.id}`} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>{student.name}</Link></td>
                      <td style={{ padding: '14px 16px' }}>Grade {student.grade}</td>
                      <td style={{ padding: '14px 16px' }}>Division {formatDivision(student.division)}</td>
                      <td style={{ padding: '14px 16px' }}>{student.overallStatus}</td>
                      <td style={{ padding: '14px 16px' }}>{installment.status} · {formatCurrency(installment.amount)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatCurrency(student.paidAmount)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatCurrency(student.pendingAmount)}</td>
                      <td style={{ padding: '14px 16px' }}>{installment.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default Finance;
