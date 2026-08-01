import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DIVISIONS, GRADES } from '../data/studentDirectory';
import { api } from '../api';

const ANNUAL_FEE = 90000;
const installmentSchedule = [
  { id: 'april', label: 'April Instalment', dueDate: '2026-04-01' },
  { id: 'july', label: 'July Instalment', dueDate: '2026-07-01' },
  { id: 'november', label: 'November Instalment', dueDate: '2026-11-01' },
];

const formatCurrency = (value) => `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
const formatDivision = (d) => `${d.charAt(0).toUpperCase()}${d.slice(1)}`;

// Normalise a fee record from the API to the shape Finance expects
const normaliseFeeRecord = (feeDoc) => {
  const student = feeDoc.student || {};
  const firstName = student.firstName || '';
  const lastName = student.lastName || '';
  const name = `${firstName} ${lastName}`.trim();
  const grade = student.grade || 0;
  const division = student.division || '';
  const rollNo = student.rollNo || 0;
  const isRte = feeDoc.isRte || student.isRte || false;

  const installments = (feeDoc.installments || []).map((inst) => ({
    id: inst.installmentId,
    label: inst.label || inst.installmentId,
    dueDate: inst.dueDate,
    amount: inst.amount || 0,
    status: inst.status || 'Upcoming',
    paymentDate: inst.paymentDate || '-',
    paymentMethod: inst.paymentMethod || '-',
    note: inst.note || '',
  }));

  const paidAmount = installments.reduce((s, i) => s + (i.status === 'Paid' ? i.amount : 0), 0);
  const pendingAmount = isRte ? 0 : Math.max(ANNUAL_FEE - paidAmount, 0);

  let overallStatus;
  if (isRte) { overallStatus = 'RTE Zero Fee'; }
  else if (pendingAmount === 0) { overallStatus = 'Fully Paid'; }
  else {
    const aprilInst = installments.find((i) => i.id === 'april');
    if (aprilInst && aprilInst.status.toLowerCase().includes('condonence')) overallStatus = 'Condonence Case';
    else if (aprilInst && aprilInst.status === 'Delayed') overallStatus = 'Delayed Payment';
    else overallStatus = 'On Track';
  }

  return {
    _id: feeDoc._id,
    studentId: student._id,
    id: student._id || feeDoc._id,
    name,
    firstName,
    lastName,
    grade,
    division,
    rollNo,
    gradeLabel: `Grade ${grade}`,
    divisionLabel: `Division ${formatDivision(division)}`,
    isRte,
    payableAmount: isRte ? 0 : ANNUAL_FEE,
    paidAmount,
    pendingAmount,
    overallStatus,
    installments,
  };
};

const Finance = () => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [selectedInstallment, setSelectedInstallment] = useState('april');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [remindersSent, setRemindersSent] = useState(new Set());
  const [remindersLoading, setRemindersLoading] = useState(new Set());
  const [feeLedger, setFeeLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const [feesData, summaryData] = await Promise.all([
        api.get('/api/fees', { limit: 1500, academicYear: '2025-26' }),
        api.get('/api/fees/summary', { academicYear: '2025-26' }),
      ]);
      const raw = feesData.fees || [];
      setFeeLedger(raw.map(normaliseFeeRecord));
      setSummary(summaryData);
    } catch (err) {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const schoolSummary = useMemo(() => {
    if (summary) {
      return {
        enrolledStudents: summary.totalStudents || feeLedger.length,
        rteStudents: summary.rteStudents || feeLedger.filter((s) => s.isRte).length,
        payableStudents: (summary.totalStudents || feeLedger.length) - (summary.rteStudents || 0),
        expectedAmount: ((summary.totalStudents || feeLedger.length) - (summary.rteStudents || 0)) * ANNUAL_FEE,
        collectedAmount: summary.totalPaid || feeLedger.reduce((s, st) => s + st.paidAmount, 0),
        pendingAmount: summary.totalPending || feeLedger.reduce((s, st) => s + st.pendingAmount, 0),
      };
    }
    const enrolledStudents = feeLedger.length;
    const rteStudents = feeLedger.filter((s) => s.isRte).length;
    const payableStudents = enrolledStudents - rteStudents;
    const expectedAmount = payableStudents * ANNUAL_FEE;
    const collectedAmount = feeLedger.reduce((s, st) => s + st.paidAmount, 0);
    const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
    return { enrolledStudents, rteStudents, payableStudents, expectedAmount, collectedAmount, pendingAmount };
  }, [feeLedger, summary]);

  const installmentSummary = useMemo(() => {
    return installmentSchedule.map((inst) => {
      const records = feeLedger.map((student) => ({
        student,
        installment: student.installments.find((i) => i.id === inst.id) || { amount: 0, status: 'Upcoming' },
      }));
      const expected = records.reduce((s, r) => s + r.installment.amount, 0);
      const collected = records.reduce((s, r) => s + (r.installment.status === 'Paid' ? r.installment.amount : 0), 0);
      return {
        ...inst,
        expected,
        collected,
        paidCount: records.filter((r) => r.installment.status === 'Paid').length,
        delayedCount: records.filter((r) => r.installment.status === 'Delayed').length,
        condonenceCount: records.filter((r) => r.installment.status.toLowerCase().includes('condonence')).length,
        upcomingCount: records.filter((r) => r.installment.status === 'Upcoming').length,
        rteCount: records.filter((r) => r.student.isRte).length,
      };
    });
  }, [feeLedger]);

  const gradeSummary = useMemo(() => {
    return GRADES.map((grade) => {
      const students = feeLedger.filter((s) => s.grade === grade);
      const expectedAmount = students.reduce((s, st) => s + st.payableAmount, 0);
      const collectedAmount = students.reduce((s, st) => s + st.paidAmount, 0);
      const pendingAmount = Math.max(expectedAmount - collectedAmount, 0);
      const selectedRecords = students.map((st) => st.installments.find((i) => i.id === selectedInstallment) || { status: 'Upcoming' });
      return {
        grade,
        label: `Grade ${grade}`,
        students,
        expectedAmount,
        collectedAmount,
        pendingAmount,
        collectionPercent: expectedAmount > 0 ? Math.round((collectedAmount / expectedAmount) * 100) : 100,
        rteCount: students.filter((s) => s.isRte).length,
        delayedCount: selectedRecords.filter((r) => r.status === 'Delayed').length,
        condonenceCount: selectedRecords.filter((r) => r.status.toLowerCase().includes('condonence')).length,
        paidCount: selectedRecords.filter((r) => r.status === 'Paid').length,
        divisions: DIVISIONS.map((division) => {
          const divStudents = students.filter((s) => s.division === division);
          const divExpected = divStudents.reduce((s, st) => s + st.payableAmount, 0);
          const divCollected = divStudents.reduce((s, st) => s + st.paidAmount, 0);
          const divRecords = divStudents.map((st) => st.installments.find((i) => i.id === selectedInstallment) || { status: 'Upcoming' });
          return {
            division,
            label: `Division ${formatDivision(division)}`,
            students: divStudents.length,
            expectedAmount: divExpected,
            collectedAmount: divCollected,
            collectionPercent: divExpected > 0 ? Math.round((divCollected / divExpected) * 100) : 100,
            rteCount: divStudents.filter((s) => s.isRte).length,
            delayedCount: divRecords.filter((r) => r.status === 'Delayed').length,
            condonenceCount: divRecords.filter((r) => r.status.toLowerCase().includes('condonence')).length,
            paidCount: divRecords.filter((r) => r.status === 'Paid').length,
          };
        }),
      };
    });
  }, [feeLedger, selectedInstallment]);

  const filteredStudents = useMemo(() => {
    return feeLedger.filter((student) => {
      const inst = student.installments.find((i) => i.id === selectedInstallment) || { status: 'Upcoming' };
      const gradeMatch = selectedGrade === 'all' || String(student.grade) === selectedGrade;
      const divisionMatch = selectedDivision === 'all' || student.division === selectedDivision;
      let categoryMatch = true;
      if (selectedCategory === 'fully-paid') categoryMatch = student.overallStatus === 'Fully Paid';
      if (selectedCategory === 'on-track') categoryMatch = student.overallStatus === 'On Track';
      if (selectedCategory === 'delayed') categoryMatch = inst.status === 'Delayed';
      if (selectedCategory === 'condonence') categoryMatch = inst.status.toLowerCase().includes('condonence');
      if (selectedCategory === 'rte') categoryMatch = student.isRte;
      if (selectedCategory === 'upcoming') categoryMatch = inst.status === 'Upcoming';
      return gradeMatch && divisionMatch && categoryMatch;
    });
  }, [feeLedger, selectedInstallment, selectedGrade, selectedDivision, selectedCategory]);

  const activeInstallmentSummary = installmentSummary.find((i) => i.id === selectedInstallment) || installmentSummary[0] || {};

  const sendReminder = (studentId) => {
    setRemindersLoading((prev) => new Set([...prev, studentId]));
    setTimeout(() => {
      setRemindersLoading((prev) => { const s = new Set(prev); s.delete(studentId); return s; });
      setRemindersSent((prev) => new Set([...prev, studentId]));
    }, 1200);
  };

  const handleRecordPayment = async (studentId, installmentId) => {
    try {
      await api.put(`/api/fees/student/${studentId}/pay`, {
        installmentId,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'Cash',
      });
      fetchFees();
    } catch (err) {
      alert('Failed to record payment: ' + err.message);
    }
  };

  const showReminderBtn = (inst) =>
    selectedInstallment === 'april' && (inst.status === 'Delayed' || inst.status.toLowerCase().includes('condonence'));

  const sectionStyle = { marginTop: '24px', padding: isMobile ? '16px' : '24px', borderRadius: '20px', background: '#ffffff', boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)' };
  const cardStyle = { padding: '18px 20px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0' };
  const filterButtonStyle = (active) => ({ padding: '10px 14px', borderRadius: '999px', border: `1px solid ${active ? '#16a34a' : '#cbd5e1'}`, background: active ? '#dcfce7' : '#fff', color: active ? '#166534' : '#0f172a', fontWeight: 700, cursor: 'pointer' });
  const statusColor = (status) => {
    if (status === 'Paid') return '#166534';
    if (status === 'Delayed') return '#b45309';
    if (status.toLowerCase().includes('condonence')) return '#1d4ed8';
    if (status === 'Upcoming') return '#64748b';
    return '#0f172a';
  };

  if (loading) {
    return (
      <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1280px', margin: '0 auto', color: '#0f172a' }}>
        <h2>Fee Collection Analytics</h2>
        <p style={{ color: '#64748b' }}>Loading fee data...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: isMobile ? '16px' : '28px', maxWidth: '1280px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Fee Collection Analytics</h2>
        <p style={{ color: '#475569', marginTop: '8px', maxWidth: '900px' }}>
          Three-instalment fee tracking. April (due), July (upcoming), November (upcoming). Academic year 2025-26. Current month: <strong>May 2026</strong>.
        </p>
      </section>

      {/* Summary cards */}
      <section style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Enrolled Students</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{schoolSummary.enrolledStudents.toLocaleString('en-IN')}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>All grades and all divisions.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>RTE Zero Fee</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{schoolSummary.rteStudents.toLocaleString('en-IN')}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>25% of each division under Right to Education.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Annual Fee Expected</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{formatCurrency(schoolSummary.expectedAmount)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Excluding RTE students. Rs.90,000/year per student.</p>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 10px' }}>Collected To Date</h3>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{formatCurrency(schoolSummary.collectedAmount)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>{formatCurrency(schoolSummary.pendingAmount)} pending across all instalments.</p>
          </div>
        </div>
      </section>

      {/* Installment progress */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Instalment Progress</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>April collected, July and November mostly upcoming as of May 2026.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {installmentSchedule.map((inst) => (
              <button key={inst.id} type="button" style={filterButtonStyle(selectedInstallment === inst.id)} onClick={() => setSelectedInstallment(inst.id)}>
                {inst.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '18px' }}>
          {installmentSummary.map((inst) => {
            const percent = inst.expected > 0 ? Math.round((inst.collected / inst.expected) * 100) : 0;
            const active = inst.id === selectedInstallment;
            return (
              <button key={inst.id} type="button" onClick={() => setSelectedInstallment(inst.id)} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', borderColor: active ? '#16a34a' : '#e2e8f0', background: active ? '#f0fdf4' : '#f8fafc' }}>
                <h4 style={{ margin: 0 }}>{inst.label}</h4>
                <p style={{ margin: '8px 0 0', color: '#475569' }}>{percent}% collected</p>
                <div style={{ height: '10px', borderRadius: '999px', background: '#dcfce7', overflow: 'hidden', marginTop: '10px' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' }} />
                </div>
                <p style={{ margin: '10px 0 0', color: '#0f172a' }}><strong>{formatCurrency(inst.collected)}</strong> of {formatCurrency(inst.expected)}</p>
                <div style={{ marginTop: '10px', display: 'grid', gap: '4px', color: '#475569', fontSize: '0.84rem' }}>
                  <span>Paid: <strong>{inst.paidCount.toLocaleString('en-IN')}</strong></span>
                  <span>Delayed: <strong style={{ color: inst.delayedCount > 0 ? '#b45309' : 'inherit' }}>{inst.delayedCount.toLocaleString('en-IN')}</strong></span>
                  <span>Condonence: <strong>{inst.condonenceCount.toLocaleString('en-IN')}</strong></span>
                  {inst.upcomingCount > 0 && <span>Upcoming: <strong>{inst.upcomingCount.toLocaleString('en-IN')}</strong></span>}
                  <span style={{ color: '#166534' }}>RTE (zero fee): <strong>{inst.rteCount.toLocaleString('en-IN')}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grade-wise collection */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Grade-wise and Division-wise Collection</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Showing {(activeInstallmentSummary || {}).label} stats per grade.</p>
          </div>
          <div style={{ ...cardStyle, minWidth: '240px', background: '#ecfdf5', borderColor: '#bbf7d0' }}>
            <div style={{ color: '#166534', fontWeight: 700 }}>Selected instalment</div>
            <div style={{ marginTop: '8px', fontSize: '1.15rem', fontWeight: 800 }}>{(activeInstallmentSummary || {}).label}</div>
            <div style={{ marginTop: '6px', color: '#166534', fontSize: '0.9rem' }}>Collected {formatCurrency((activeInstallmentSummary || {}).collected)} of {formatCurrency((activeInstallmentSummary || {}).expected)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '20px' }}>
          {gradeSummary.map((grade) => (
            <div key={grade.grade} style={{ ...cardStyle, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{grade.label}</h4>
                  <p style={{ margin: '6px 0 0', color: '#64748b' }}>{grade.students.length} students</p>
                </div>
                <button type="button" style={filterButtonStyle(selectedGrade === String(grade.grade))} onClick={() => { setSelectedGrade(selectedGrade === String(grade.grade) ? 'all' : String(grade.grade)); setSelectedDivision('all'); }}>
                  {selectedGrade === String(grade.grade) ? 'Selected' : 'Drill down'}
                </button>
              </div>
              <div style={{ marginTop: '14px', display: 'grid', gap: '6px', color: '#334155', fontSize: '0.9rem' }}>
                <span>Collected: <strong>{formatCurrency(grade.collectedAmount)}</strong></span>
                <span>Pending: <strong>{formatCurrency(grade.pendingAmount)}</strong></span>
                <span>RTE zero fee: <strong>{grade.rteCount}</strong></span>
                <span>Paid ({(activeInstallmentSummary || {}).label}): <strong>{grade.paidCount}</strong></span>
                <span>Delayed: <strong style={{ color: grade.delayedCount > 0 ? '#b45309' : 'inherit' }}>{grade.delayedCount}</strong></span>
                <span>Condonence: <strong>{grade.condonenceCount}</strong></span>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', marginTop: '14px' }}>
                <div style={{ width: `${grade.collectionPercent}%`, height: '100%', background: 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)' }} />
              </div>
              <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                {grade.divisions.map((division) => (
                  <button key={division.division} type="button" onClick={() => { setSelectedGrade(String(grade.grade)); setSelectedDivision(division.division); }} style={{ padding: '12px', borderRadius: '14px', border: `1px solid ${selectedGrade === String(grade.grade) && selectedDivision === division.division ? '#0ea5e9' : '#dbeafe'}`, background: selectedGrade === String(grade.grade) && selectedDivision === division.division ? '#eff6ff' : '#f8fafc', textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <strong>{division.label}</strong>
                      <span>{division.collectionPercent}%</span>
                    </div>
                    <div style={{ marginTop: '8px', display: 'grid', gap: '4px', color: '#475569', fontSize: '0.82rem' }}>
                      <span>Students: {division.students} RTE: {division.rteCount}</span>
                      <span>Paid: {division.paidCount} Delayed: {division.delayedCount} Condonence: {division.condonenceCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Student fee drill-down */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0 }}>Student Fee Drill-down</h3>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
              {selectedInstallment === 'april' && <span style={{ color: '#166534', fontWeight: 600 }}>Send Reminder available for Delayed students in April instalment.</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'on-track', label: 'On Track' },
              { id: 'fully-paid', label: 'Fully Paid' },
              { id: 'delayed', label: 'Delayed' },
              { id: 'condonence', label: 'Condonence' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'rte', label: 'RTE' },
            ].map((opt) => (
              <button key={opt.id} type="button" style={filterButtonStyle(selectedCategory === opt.id)} onClick={() => setSelectedCategory(opt.id)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px' }}>
          <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setSelectedDivision('all'); }} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <option value="all">All grades</option>
            {GRADES.map((g) => <option key={g} value={String(g)}>Grade {g}</option>)}
          </select>
          <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <option value="all">All divisions</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>Division {formatDivision(d)}</option>)}
          </select>
        </div>

        {isMobile ? (
          <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
            {filteredStudents.slice(0, 60).map((student) => {
              const inst = student.installments.find((i) => i.id === selectedInstallment) || { status: 'Upcoming', amount: 0, note: '' };
              const canRemind = showReminderBtn(inst);
              const sent = remindersSent.has(student.id);
              const loadingRemind = remindersLoading.has(student.id);
              return (
                <article key={student._id || student.id} style={{ ...cardStyle, background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <Link to={`/sis/student/${student.studentId || student.id}`} style={{ color: '#0f172a', fontWeight: 800, textDecoration: 'none' }}>{student.name}</Link>
                      <p style={{ margin: '6px 0 0', color: '#475569' }}>Grade {student.grade} {formatDivision(student.division)} Roll {student.rollNo}</p>
                    </div>
                    <span style={{ color: statusColor(inst.status), fontWeight: 700, fontSize: '0.9rem' }}>{inst.status}</span>
                  </div>
                  <div style={{ marginTop: '10px', display: 'grid', gap: '4px', color: '#334155', fontSize: '0.9rem' }}>
                    <span>Instalment: {formatCurrency(inst.amount)}</span>
                    <span>Paid to date: {formatCurrency(student.paidAmount)}</span>
                    <span>Pending: {formatCurrency(student.pendingAmount)}</span>
                    <span>Note: {inst.note}</span>
                  </div>
                  {canRemind && (
                    <button type="button" disabled={sent || loadingRemind} onClick={() => sendReminder(student.id)} style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '10px', border: 'none', background: sent ? '#dcfce7' : loadingRemind ? '#f3f4f6' : '#25d366', color: sent ? '#166534' : loadingRemind ? '#64748b' : '#fff', fontWeight: 700, cursor: sent || loadingRemind ? 'default' : 'pointer', fontSize: '0.84rem' }}>
                      {sent ? 'Reminder Sent' : loadingRemind ? 'Sending...' : 'WhatsApp Reminder'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: selectedInstallment === 'april' ? '1200px' : '1100px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px' }}>Student</th>
                  <th style={{ padding: '12px 16px' }}>Grade</th>
                  <th style={{ padding: '12px 16px' }}>Division</th>
                  <th style={{ padding: '12px 16px' }}>Overall Status</th>
                  <th style={{ padding: '12px 16px' }}>{(activeInstallmentSummary || {}).label}</th>
                  <th style={{ padding: '12px 16px' }}>Paid Till Date</th>
                  <th style={{ padding: '12px 16px' }}>Pending</th>
                  <th style={{ padding: '12px 16px' }}>Remarks</th>
                  {selectedInstallment === 'april' && <th style={{ padding: '12px 16px' }}>Send Reminder</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const inst = student.installments.find((i) => i.id === selectedInstallment) || { status: 'Upcoming', amount: 0, note: '' };
                  const canRemind = showReminderBtn(inst);
                  const sent = remindersSent.has(student.id);
                  const loadingRemind = remindersLoading.has(student.id);
                  return (
                    <tr key={student._id || student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}><Link to={`/sis/student/${student.studentId || student.id}`} style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>{student.name}</Link></td>
                      <td style={{ padding: '14px 16px' }}>Grade {student.grade}</td>
                      <td style={{ padding: '14px 16px' }}>{formatDivision(student.division)}</td>
                      <td style={{ padding: '14px 16px' }}>{student.overallStatus}</td>
                      <td style={{ padding: '14px 16px', color: statusColor(inst.status), fontWeight: 700 }}>{inst.status} {formatCurrency(inst.amount)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatCurrency(student.paidAmount)}</td>
                      <td style={{ padding: '14px 16px' }}>{formatCurrency(student.pendingAmount)}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.88rem' }}>{inst.note}</td>
                      {selectedInstallment === 'april' && (
                        <td style={{ padding: '14px 16px' }}>
                          {canRemind ? (
                            <button type="button" disabled={sent || loadingRemind} onClick={() => sendReminder(student.id)} style={{ padding: '7px 13px', borderRadius: '8px', border: 'none', background: sent ? '#dcfce7' : loadingRemind ? '#f3f4f6' : '#25d366', color: sent ? '#166534' : loadingRemind ? '#64748b' : '#fff', fontWeight: 700, cursor: sent || loadingRemind ? 'default' : 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              {sent ? 'Sent' : loadingRemind ? 'Sending...' : 'Remind'}
                            </button>
                          ) : <span style={{ color: '#cbd5e1' }}>--</span>}
                        </td>
                      )}
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
