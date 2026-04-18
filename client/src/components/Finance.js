import React from 'react';

const Finance = () => {
  const formatCurrency = (value) => `₹${value.toLocaleString('en-IN')}`;

  const gradeCollection = [
    {
      grade: 'Grade 7',
      totalStudents: 120,
      collectedAmount: 10350000,
      pendingAmount: 1740000,
      collectedPercent: 86,
      divisions: [
        { division: 'A', students: 40, collectedAmount: 3450000, collectedPercent: 97 },
        { division: 'B', students: 40, collectedAmount: 3000000, collectedPercent: 83 },
        { division: 'C', students: 40, collectedAmount: 2900000, collectedPercent: 81 },
      ],
    },
    {
      grade: 'Grade 8',
      totalStudents: 110,
      collectedAmount: 9350000,
      pendingAmount: 1550000,
      collectedPercent: 86,
      divisions: [
        { division: 'A', students: 36, collectedAmount: 2920000, collectedPercent: 90 },
        { division: 'B', students: 37, collectedAmount: 3050000, collectedPercent: 88 },
        { division: 'C', students: 37, collectedAmount: 3380000, collectedPercent: 92 },
      ],
    },
    {
      grade: 'Grade 9',
      totalStudents: 100,
      collectedAmount: 7200000,
      pendingAmount: 1800000,
      collectedPercent: 80,
      divisions: [
        { division: 'A', students: 34, collectedAmount: 2450000, collectedPercent: 86 },
        { division: 'B', students: 33, collectedAmount: 2350000, collectedPercent: 82 },
        { division: 'C', students: 33, collectedAmount: 2400000, collectedPercent: 84 },
      ],
    },
  ];

  const paymentMethods = [
    { method: 'NEFT', amount: 10800000, percent: 44, color: '#2563eb' },
    { method: 'Cash', amount: 6750000, percent: 28, color: '#f59e0b' },
    { method: 'UPI', amount: 6900000, percent: 28, color: '#10b981' },
  ];

  const concessionRequests = [
    { student: 'Nisha Gupta', grade: 'Grade 7', amount: 18000, reason: 'Sibling concession', status: 'Under review' },
    { student: 'Karan Mehta', grade: 'Grade 8', amount: 27000, reason: 'Late fee request', status: 'Approved' },
    { student: 'Simran Kaur', grade: 'Grade 9', amount: 36000, reason: 'Medical concession', status: 'Pending' },
    { student: 'Arjun Rao', grade: 'Grade 7', amount: 15000, reason: 'Late payment waiver', status: 'Requested' },
  ];

  const installmentSummary = [
    { label: '1 April', expected: 9900000, collected: 8800000 },
    { label: '1 July', expected: 9900000, collected: 7600000 },
    { label: '1 November', expected: 9900000, collected: 6600000 },
  ];

  const sectionStyle = {
    marginTop: '28px',
    padding: '24px',
    borderRadius: '20px',
    background: '#ffffff',
    boxShadow: '0 14px 40px rgba(15, 23, 42, 0.08)',
  };

  const cardStyle = {
    padding: '18px 22px',
    borderRadius: '18px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  };

  return (
    <main style={{ padding: '28px', maxWidth: '1240px', margin: '0 auto', color: '#0f172a' }}>
      <section>
        <h2>Fee Management Dashboards</h2>
        <p style={{ color: '#475569', marginTop: '8px' }}>
          Dummy fee analytics for grade-wise collection, payment methods, instalment progress, and concession / late fee requests.
        </p>
      </section>

      <section style={{ ...sectionStyle, marginTop: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ ...cardStyle, flex: '1 1 220px' }}>
            <h3 style={{ marginBottom: '10px' }}>Annual Fee</h3>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>₹90,000 / student</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Collected in 3 instalments: 1 Apr, 1 Jul, 1 Nov.</p>
          </div>
          <div style={{ ...cardStyle, flex: '1 1 220px' }}>
            <h3 style={{ marginBottom: '10px' }}>Total Expected</h3>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{formatCurrency(29700000)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Based on 330 enrolled students.</p>
          </div>
          <div style={{ ...cardStyle, flex: '1 1 220px' }}>
            <h3 style={{ marginBottom: '10px' }}>Collected To Date</h3>
            <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{formatCurrency(26800000)}</p>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>About 90% collection rate across the school.</p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '18px' }}>Grade-wise Fee Collection Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {gradeCollection.map((grade) => (
            <div key={grade.grade} style={{ padding: '20px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: 0 }}>{grade.grade}</h4>
              <p style={{ margin: '8px 0 12px', color: '#64748b' }}>
                {grade.totalStudents} students · {grade.collectedPercent}% collected
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <strong>{formatCurrency(grade.collectedAmount)}</strong>
                  <div style={{ color: '#475569' }}>Collected</div>
                </div>
                <div>
                  <strong>{formatCurrency(grade.pendingAmount)}</strong>
                  <div style={{ color: '#475569' }}>Pending</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {grade.divisions.map((division) => (
                  <div key={division.division}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#334155' }}>
                      <span>Division {division.division}</span>
                      <span>{division.collectedPercent}%</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden', marginTop: '6px' }}>
                      <div style={{ width: `${division.collectedPercent}%`, height: '100%', background: '#2563eb' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '18px' }}>Payment Method Collection Mix</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px' }}>
          <div style={{ padding: '20px', borderRadius: '18px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            {paymentMethods.map((item) => (
              <div key={item.method} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: 600 }}>
                  <span>{item.method}</span>
                  <span>{item.percent}%</span>
                </div>
                <div style={{ height: '14px', width: '100%', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${item.percent}%`, height: '100%', background: item.color }} />
                </div>
                <div style={{ marginTop: '8px', color: '#475569' }}>{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', borderRadius: '18px', background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '165px', height: '165px', borderRadius: '50%', background: '#f8fafc', position: 'relative', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{paymentMethods.reduce((sum, item) => sum + item.percent, 0)}%</span>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: '#475569', marginTop: '14px' }}>All payment methods collected to date</p>
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '18px' }}>Instalment Progress</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {installmentSummary.map((installment) => {
            const percent = Math.round((installment.collected / installment.expected) * 100);
            return (
              <div key={installment.label} style={{ ...cardStyle, padding: '18px' }}>
                <h4 style={{ margin: 0 }}>{installment.label}</h4>
                <p style={{ margin: '8px 0 14px', color: '#475569' }}>{percent}% collected</p>
                <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: '#0ea5e9' }} />
                </div>
                <p style={{ margin: '14px 0 0', color: '#0f172a' }}><strong>{formatCurrency(installment.collected)}</strong> of {formatCurrency(installment.expected)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={{ marginBottom: '18px' }}>Concession / Late Payment Requests</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Student</th>
                <th style={{ padding: '12px 16px' }}>Grade</th>
                <th style={{ padding: '12px 16px' }}>Amount</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {concessionRequests.map((request) => (
                <tr key={request.student} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px' }}>{request.student}</td>
                  <td style={{ padding: '14px 16px' }}>{request.grade}</td>
                  <td style={{ padding: '14px 16px' }}>{formatCurrency(request.amount)}</td>
                  <td style={{ padding: '14px 16px' }}>{request.reason}</td>
                  <td style={{ padding: '14px 16px', color: request.status === 'Approved' ? '#166534' : request.status === 'Under review' ? '#92400e' : '#1d4ed8' }}>
                    {request.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default Finance;
