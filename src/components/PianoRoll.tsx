import React from 'react';
import type { ReactElement } from 'react';
import { SCALES, NOTE_NAMES } from '../musicTheory';
import type { RootKeyIndex, ScaleName } from '../types';

interface PianoRollProps { rootKey: RootKeyIndex; scaleName: ScaleName; }

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11] as const;
const BLACK_KEY_MAP: Partial<Record<number, number>> = { 0:1, 2:3, 5:6, 7:8, 9:10 };

export default function PianoRoll({ rootKey, scaleName }: PianoRollProps): ReactElement {
  const scaleSet = new Set((SCALES[scaleName]).map((i: number) => (rootKey + i) % 12));

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, height:60, position:'relative', paddingBottom:4 }}>
      {WHITE_KEYS.map(noteIdx => {
        const isInScale = scaleSet.has(noteIdx);
        const isRoot    = noteIdx === rootKey % 12;
        const blackIdx  = BLACK_KEY_MAP[noteIdx];

        return (
          <div key={noteIdx} style={{ position:'relative', display:'flex', flexDirection:'column' }}>
            <div title={NOTE_NAMES[noteIdx]} style={{ width:26, height:56, background: isRoot ? 'var(--accent)' : isInScale ? 'rgba(200,245,97,0.35)' : '#ddd8cc', border:'0.5px solid #aaa8a0', borderRadius:'0 0 3px 3px', cursor:'pointer', position:'relative', marginRight:1, transition:'background 0.15s' }}>
              {isRoot && <span style={{ position:'absolute', bottom:4, left:'50%', transform:'translateX(-50%)', fontSize:8, fontFamily:'var(--font-mono)', color:'var(--bg)', fontWeight:700 }}>{NOTE_NAMES[noteIdx]}</span>}
              {!isRoot && isInScale && <div style={{ position:'absolute', bottom:6, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'var(--accent)', opacity:0.8 }} />}
            </div>
            {blackIdx !== undefined && (
              <div title={NOTE_NAMES[blackIdx]} style={{ position:'absolute', top:0, right:-8, width:16, height:34, background: scaleSet.has(blackIdx % 12) ? 'rgba(100,120,20,0.9)' : '#1a1a18', border:'0.5px solid #444', borderRadius:'0 0 2px 2px', zIndex:2, cursor:'pointer', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:3 }}>
                {scaleSet.has(blackIdx % 12) && <div style={{ width:3, height:3, borderRadius:'50%', background:'var(--accent)', opacity:0.9 }} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
