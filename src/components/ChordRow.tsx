import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { getDiatonicChords } from '../musicTheory';
import type { RootKeyIndex, ScaleName } from '../types';

interface ChordRowProps { rootKey: RootKeyIndex; scaleName: ScaleName; }

export default function ChordRow({ rootKey, scaleName }: ChordRowProps): ReactElement {
  const [active, setActive] = useState<number | null>(null);
  const chords = getDiatonicChords(rootKey, scaleName);
  return (
    <div style={{ padding:'8px 20px 14px', display:'flex', gap:6, flexWrap:'wrap' }}>
      {chords.map((chord, idx) => {
        const isAct = active === idx;
        return (
          <div key={idx} onClick={() => setActive(isAct ? null : idx)}
            style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontFamily:'var(--font-mono)', border: isAct ? '0.5px solid #6165f5' : '0.5px solid var(--border)', color: isAct ? '#a0a4ff' : 'var(--muted)', background: isAct ? 'rgba(97,101,245,0.12)' : 'transparent', cursor:'pointer', transition:'all 0.15s', userSelect:'none' }}>
            <span style={{ opacity:0.6, fontSize:9, marginRight:4 }}>{chord.numeral}</span>
            {chord.root}
            <span style={{ opacity:0.5, fontSize:9, marginLeft:2 }}>{chord.quality}</span>
          </div>
        );
      })}
    </div>
  );
}
