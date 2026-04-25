# 🎵 WCII Visualizer — React App

Audio player with waveform display and music theory bar grid.

## Features

- **Waveform Display** — Static overview + live real-time waveform while playing
- **Bar / Measure Grid** — Auto-divided by BPM & time signature, with beat subdivisions
- **Music Theory Panel** — Key, Scale, BPM (auto-detected), Time Signature
- **Piano Roll** — Shows notes in the current scale, highlights root key
- **Diatonic Chords** — Chord progression for current key + scale
- Supports **Major, Minor, Dorian, Pentatonic, Blues** scales
- Time signatures: **4/4, 3/4, 6/8, 5/4, 7/8, 2/4**
- BPM auto-detection from audio file
- Loop + Metronome flash

## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Drop an audio file (MP3, WAV, OGG, FLAC) into the upload area
2. Press Play — waveform and bar grid animate in real-time
3. **Click** on theory values to change them:
   - **Key** — cycles through all 12 keys
   - **Time Sig** — cycles through available time signatures
   - **BPM** — prompts for manual input
   - **Scale** — dropdown selector
4. Toggle **LOOP** and **METRO** (metronome flash)

## Project Structure

```
src/
├── App.jsx                    # Main application
├── musicTheory.js             # Music theory constants & helpers
├── components/
│   ├── WaveformCanvas.jsx     # Canvas waveform renderer
│   ├── BarGrid.jsx            # Canvas bar/measure grid
│   ├── PianoRoll.jsx          # Piano keyboard with scale highlights
│   ├── TheoryPanel.jsx        # BPM / Key / Scale / Time Sig UI
│   └── ChordRow.jsx           # Diatonic chord pills
```
