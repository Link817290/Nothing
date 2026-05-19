import React from 'react';
import { MobileSettings } from '../components/mobile.jsx';

// Mobile screens are rendered inside the iPhone frame already (in their
// component definition). We just centre on the page so devs can pull them
// up at intended size.
export default function MobileSettingsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0eee9' }}>
      <MobileSettings />
    </div>
  );
}
