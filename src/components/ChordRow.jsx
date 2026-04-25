import React, { useState } from 'react';
import { getDiatonicChords } from '../musicTheory';

export default function ChordRow({ rootKey, scaleName }) {
  const [active, setActive] = useState(null);
  const chords = getDiatonicChords(rootKey, scaleName);

  return (
    <div style={{ padding: '8px 20px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {chords.map((chord, idx) => {
        const isActive = active === idx;
        return (
          <div
            key={idx}
            onClick={() => setActive(isActive ? null : idx)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              border: isActive ? '0.5px solid #6165f5' : '0.5px solid var(--border)',
              color: isActive ? '#a0a4ff' : 'var(--muted)',
              background: isActive ? 'rgba(97,101,245,0.12)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'rgba(97,101,245,0.5)';
                e.currentTarget.style.color = '#8a8eff';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted)';
              }
            }}
          >
            <span style={{ opacity: 0.6, fontSize: 9, marginRight: 4 }}>{chord.numeral}</span>
            {chord.root}
            <span style={{ opacity: 0.5, fontSize: 9, marginLeft: 2 }}>{chord.quality}</span>
          </div>
        );
      })}
    </div>
  );
}
