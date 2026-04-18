import React from 'react';
import { Link } from 'react-router-dom';

const Communication = () => {
  const messages = [
    { id: 1, title: 'Parent Meeting', sender: 'Admin', date: '2023-04-17' },
    { id: 2, title: 'Exam Schedule', sender: 'Teacher', date: '2023-04-16' },
  ];

  const cardStyle = {
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2>Communication</h2>
        <p style={{ color: '#4b5563' }}>
          Manage announcements, messages, and notifications.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {messages.map((message) => (
            <Link key={message.id} to={`/communication/${message.id}`} style={cardStyle}>
              <h3>{message.title}</h3>
              <p>Sender: {message.sender}</p>
              <p>Date: {message.date}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Communication;