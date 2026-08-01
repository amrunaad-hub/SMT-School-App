import React, { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_STYLE = {
  'In Stock': { bg: '#dcfce7', color: '#166534' },
  'Low Stock': { bg: '#fef3c7', color: '#92400e' },
  'Out of Stock': { bg: '#fee2e2', color: '#991b1b' },
};

const CATEGORY_COLORS = {
  Stationery: '#0ea5e9',
  Furniture: '#8b5cf6',
  Electronics: '#f59e0b',
  Sports: '#10b981',
  'Lab Equipment': '#06b6d4',
  'Cleaning Supplies': '#64748b',
  Books: '#ef4444',
  Other: '#94a3b8',
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const params = {};
    if (filterCategory) params.category = filterCategory;
    if (filterStatus) params.status = filterStatus;

    setLoading(true);
    api.get('/api/inventory', params)
      .then((data) => {
        setItems(data.items || []);
        setLowStockCount(data.lowStockCount || 0);
        setOutOfStockCount(data.outOfStockCount || 0);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterCategory, filterStatus]);

  const categories = ['Stationery', 'Furniture', 'Electronics', 'Sports', 'Lab Equipment', 'Cleaning Supplies', 'Books', 'Other'];

  const cardStyle = {
    padding: '18px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    background: '#fff',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    color: 'inherit',
  };

  return (
    <main style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      <section>
        <h2 style={{ color: '#0f172a', marginBottom: '6px' }}>Inventory</h2>
        <p style={{ color: '#4b5563', marginTop: 0 }}>
          Manage school inventory and supplies.
        </p>

        {/* Summary stats */}
        {!loading && !error && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px', marginBottom: '4px' }}>
            <div style={{ padding: '10px 18px', borderRadius: '10px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700, fontSize: '0.88rem' }}>
              ⚠ Low Stock: {lowStockCount}
            </div>
            <div style={{ padding: '10px 18px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', fontWeight: 700, fontSize: '0.88rem' }}>
              ✕ Out of Stock: {outOfStockCount}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', marginTop: '16px' }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.88rem' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '0.88rem' }}
          >
            <option value="">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading inventory...</div>
        )}

        {error && (
          <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#991b1b' }}>
            Failed to load inventory: {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No inventory items found.</div>
        )}

        {!loading && !error && items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {items.map((item) => {
              const statusStyle = STATUS_STYLE[item.status] || STATUS_STYLE['In Stock'];
              const catColor = CATEGORY_COLORS[item.category] || '#64748b';
              return (
                <div key={item._id} style={{ ...cardStyle, borderLeft: `4px solid ${catColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: '700' }}>{item.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.itemCode}</span>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {item.status}
                    </span>
                  </div>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', background: `${catColor}18`, color: catColor, fontSize: '0.72rem', fontWeight: 700, marginBottom: '10px' }}>
                    {item.category}
                  </span>
                  <div style={{ display: 'grid', gap: '4px', fontSize: '0.82rem', color: '#475569' }}>
                    <span>Qty: <strong style={{ color: '#0f172a' }}>{item.quantityInStock} {item.unit}</strong></span>
                    <span>Reorder at: {item.reorderLevel} {item.unit}</span>
                    {item.unitPrice && <span>Unit Price: ₹{item.unitPrice.toLocaleString('en-IN')}</span>}
                    {item.location && <span>Location: {item.location}</span>}
                    {item.supplier && <span>Supplier: {item.supplier}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Inventory;
