import React from 'react';

// Compact iPhone bezel. Just the shell — caller paints status bar, nav,
// and home indicator with their own content positioned at top: 54px.
export function IOSDevice({ children, width = 402, height = 874 }) {
  return (
    <div style={{
      width, height, borderRadius: 48, overflow: 'hidden',
      position: 'relative', background: '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
    }}>
      {/* Dynamic Island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }} />
      {/* Time */}
      <div style={{
        position: 'absolute', top: 16, left: 28, zIndex: 51,
        fontFamily: '-apple-system, "SF Pro", system-ui',
        fontWeight: 590, fontSize: 17, color: '#0F0F0E',
      }}>9:41</div>
      {/* Children fill the screen */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        width: 139, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.25)', zIndex: 60,
      }} />
    </div>
  );
}
