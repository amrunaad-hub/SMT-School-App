// Theme tokens below were extracted by scanning every inline style in
// client/src/components/*.jsx (grep for hex colors, px spacing, rem font
// sizes) rather than invented — they're the app's actual existing visual
// identity, just given names. Most already coincide with Tailwind's own
// default palette/spacing scale (e.g. the header gradient's #1e40af/#1e3a8a
// are exactly blue-800/blue-900, and nearly every padding value here is
// already a multiple of Tailwind's 4px spacing unit) — extended here mainly
// for the few values that don't have a stock Tailwind name, plus semantic
// aliases (colors.primary etc.) so new code doesn't need to know "the brand
// blue happens to equal Tailwind's blue-800".
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Header gradient endpoints (135deg, primary -> primaryDark) —
        // #1e40af/#1e3a8a, used 68/25 times respectively across components.
        primary: '#1e40af',
        primaryDark: '#1e3a8a',
        // App shell background (VitePWA manifest background_color, and the
        // most common light neutral background across cards/pages).
        background: '#f3f4f6',
        // Status colors — by far the most-used shade of each hue across the
        // app's badges/buttons/alerts (counts from the full component scan).
        danger: '#dc2626',      // 68 uses — delete/logout/error states
        success: '#16a34a',     // 27 uses — confirmed/active/present states
        warning: '#f59e0b',     // 16 uses — pending/attention states
        // Neutral text/border scale — these are exactly Tailwind's slate-*
        // palette already (#64748b=slate-500 etc.), named here anyway since
        // components reference them as raw hex, not slate-* classes, today.
        ink: '#0f172a',         // primary text — 82 uses
        muted: '#64748b',       // secondary text — 189 uses, the single most
        subtle: '#94a3b8',      // tertiary/placeholder text — 49 uses
        border: '#e2e8f0',      // default border/divider — 82 uses
      },
      borderRadius: {
        // 10px sits between Tailwind's default lg (8px) and xl (12px) but is
        // the second most-used radius in the app (88 occurrences) — kept as
        // its own token rather than nudging every card to lg or xl.
        card: '10px',
      },
      fontFamily: {
        // Matches src/index.css `body` exactly — Tailwind's own default
        // sans stack is close but not identical (starts with ui-sans-serif),
        // so this preserves the precise existing stack rather than
        // introducing a subtle font substitution.
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
};
