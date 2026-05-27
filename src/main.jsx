import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import OsApp from './os/OsApp.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OsApp />
  </React.StrictMode>
);
