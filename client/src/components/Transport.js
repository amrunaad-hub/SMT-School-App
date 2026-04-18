import React from 'react';
import { Link } from 'react-router-dom';

const Transport = () => {
  const transports = [
    { id: 1, route: 'Route A', vehicle: 'Bus 1', status: 'On Time' },
    { id: 2, route: 'Route B', vehicle: 'Bus 2', status: 'Delayed' },
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
        <h2>Transport</h2>
        <p style={{ color: '#4b5563' }}>
          Manage school transport and routes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {transports.map((transport) => (
            <Link key={transport.id} to={`/transport/${transport.id}`} style={cardStyle}>
              <h3>{transport.route}</h3>
              <p>Vehicle: {transport.vehicle}</p>
              <p>Status: {transport.status}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Transport;