import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// Auto-updates the installed PWA in the background when a new deploy ships —
// no "please refresh" prompt needed for this size of app.
registerSW({ immediate: true });
