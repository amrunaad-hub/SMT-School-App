import React from 'react';

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search',
  maxWidth = '520px',
  containerStyle = {},
  inputStyle = {},
}) => {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth, ...containerStyle }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#64748b',
          fontSize: '0.9rem',
          pointerEvents: 'none',
        }}
      >
        🔎
      </span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 38px 10px 34px',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          fontSize: '0.95rem',
          outline: 'none',
          background: '#fff',
          color: '#0f172a',
          ...inputStyle,
        }}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange({ target: { value: '' } })}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.9rem',
            lineHeight: 1,
            padding: '4px',
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};

export default SearchBar;
