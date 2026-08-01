import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/api/students/${id}`)
      .then((data) => {
        if (!cancelled) {
          setStudent(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load student profile.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  const profileStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  };

  const photoStyle = {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    marginBottom: '20px',
    border: '4px solid #e5e7eb',
  };

  const detailStyle = {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  };

  const fieldStyle = {
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb',
  };

  const grade = student ? student.grade : '';
  const division = student ? student.division : '';

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>Previous Menu</button>
          {grade && division && (
            <Link to={`/sis/grade/${grade}/${division}`} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>Back to Student List</Link>
          )}
          <Link to="/sis" style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', textDecoration: 'none', color: '#0f172a' }}>SIS Home</Link>
        </div>
        <h2>Student Profile</h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading...</p>
        ) : error ? (
          <p style={{ color: '#dc2626' }}>{error}</p>
        ) : student ? (
          <div style={profileStyle}>
            <img
              src={student.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student._id}`}
              alt={`${student.firstName} ${student.lastName}`}
              style={photoStyle}
            />
            <h3>{student.firstName} {student.lastName}</h3>
            <p style={{ color: '#64748b', margin: '4px 0 0' }}>{student.studentCode}</p>

            <div style={detailStyle}>
              <div style={fieldStyle}>
                <strong>Roll Number:</strong> {student.rollNo}
              </div>
              <div style={fieldStyle}>
                <strong>Grade:</strong> Grade {student.grade} {student.division.charAt(0).toUpperCase() + student.division.slice(1)}
              </div>
              <div style={fieldStyle}>
                <strong>Gender:</strong> {student.gender || '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Date of Birth:</strong> {student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Admission Year:</strong> {student.admissionYear || '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Status:</strong> {student.status}
              </div>
              <div style={fieldStyle}>
                <strong>RTE:</strong> {student.isRte ? 'Yes' : 'No'}
              </div>
              <div style={fieldStyle}>
                <strong>Maharashtrian:</strong> {student.isMaharashtrian ? 'Yes' : 'No'}
              </div>
              <div style={fieldStyle}>
                <strong>Address:</strong> {student.address || '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Parent Name:</strong> {student.parentName || '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Parent Contact:</strong> {student.parentMobile || '—'}
              </div>
              <div style={fieldStyle}>
                <strong>Parent Email:</strong> {student.parentEmail || '—'}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>Student not found.</p>
        )}
      </section>
    </main>
  );
};

export default StudentProfile;
