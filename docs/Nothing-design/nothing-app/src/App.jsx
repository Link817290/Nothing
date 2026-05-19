import React from 'react';
import { Outlet } from 'react-router-dom';

// App is a transparent shell — each page paints its own chrome.
// Sidebars live inside the pages that have them.
export default function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Outlet />
    </div>
  );
}
