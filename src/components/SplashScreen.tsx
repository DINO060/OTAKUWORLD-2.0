import React from 'react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: '#0c0c14' }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}
        >
          <span style={{ fontSize: '36px' }}>⛩️</span>
        </div>

        <div className="text-center">
          <p style={{ fontSize: '22px', fontWeight: 800, color: '#e8e8ed', letterSpacing: '-0.5px' }}>
            OtakuWorld
          </p>
          <p style={{ fontSize: '13px', color: '#8888a0', marginTop: '4px' }}>
            Chargement…
          </p>
        </div>

        {/* Spinner */}
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6c5ce7', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  );
}
