// MIDIPanel — legacy component, kept for compatibility
// New architecture uses MIDIStatusBar instead
import React from 'react';
import type { ReactElement } from 'react';
import type { MidiHandle, HotCuePoint } from '../types';

interface MIDIPanelProps extends MidiHandle {
  hotCuePoints: HotCuePoint[];
  onHotCueSet:  (idx: number, clear?: boolean) => void;
  onHotCueJump: (idx: number) => void;
}

export default function MIDIPanel(_props: MIDIPanelProps): ReactElement {
  return <></>;
}
