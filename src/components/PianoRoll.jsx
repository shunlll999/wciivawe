import React from 'react';
import { SCALES, NOTE_NAMES } from '../musicTheory';

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEY_MAP = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

export default function PianoRoll({ rootKey, scaleName }) {
  const scaleSet = new Set((SCALES[scaleName] || SCALES.major).map((i) => (rootKey + i) % 12));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        height: 60,
        position: 'relative',
        paddingBottom: 4,
      }}
    >
      {WHITE_KEYS.map((noteIdx) => {
        const absoluteNote = noteIdx;
        const isInScale = scaleSet.has(absoluteNote);
        const isRoot = absoluteNote === rootKey % 12;
        const blackNoteIdx = BLACK_KEY_MAP[noteIdx];
        const hasBlack = blackNoteIdx !== undefined;

        return (
          <div key={noteIdx} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* White key */}
            <div
              title={NOTE_NAMES[absoluteNote]}
              style={{
                width: 26,
                height: 56,
                background: isRoot
                  ? 'var(--accent)'
                  : isInScale
                  ? 'rgba(200,245,97,0.35)'
                  : '#ddd8cc',
                border: '0.5px solid #aaa8a0',
                borderRadius: '0 0 3px 3px',
                cursor: 'pointer',
                position: 'relative',
                marginRight: 1,
                transition: 'background 0.15s',
              }}
            >
              {isRoot && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--bg)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {NOTE_NAMES[absoluteNote]}
                </span>
              )}
              {!isRoot && isInScale && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    opacity: 0.8,
                  }}
                />
              )}
            </div>

            {/* Black key */}
            {hasBlack && (
              <div
                title={NOTE_NAMES[blackNoteIdx]}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: -8,
                  width: 16,
                  height: 34,
                  background: scaleSet.has(blackNoteIdx % 12)
                    ? 'rgba(100,120,20,0.9)'
                    : '#1a1a18',
                  border: '0.5px solid #444',
                  borderRadius: '0 0 2px 2px',
                  zIndex: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 3,
                }}
              >
                {scaleSet.has(blackNoteIdx % 12) && (
                  <div
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      opacity: 0.9,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
