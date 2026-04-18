import React from 'react';
import { Link } from 'react-router-dom';

const Inventory = () => {
  const items = [
    { id: 1, name: 'Books', quantity: 500, status: 'In Stock' },
    { id: 2, name: 'Chairs', quantity: 100, status: 'Low Stock' },
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
        <h2>Inventory</h2>
        <p style={{ color: '#4b5563' }}>
          Manage school inventory and supplies.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
          {items.map((item) => (
            <Link key={item.id} to={`/inventory/${item.id}`} style={cardStyle}>
              <h3>{item.name}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>Status: {item.status}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Inventory;