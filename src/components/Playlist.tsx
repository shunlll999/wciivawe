import React, { useState, useCallback, useRef, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { TrackItem, SortKey, DeckId } from '../types';
import { readAudioDuration, isAudioFile, getFileExt, makeTrackId, formatDuration, formatSize } from '../utils';

const DECK_A_COLOR = '#c8f561';
const DECK_B_COLOR = '#61c8f5';

const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'name',     label: 'Name'     },
  { key: 'folder',   label: 'Folder'   },
  { key: 'duration', label: 'Duration' },
  { key: 'size',     label: 'Size'     },
];

export interface PlaylistProps {
  currentFileNameA:  string;
  currentFileNameB:  string;
  onSelect:          (file: File, preferDeck: DeckId) => void;
  onLoadToDeck:      (deckId: DeckId, file: File) => void;
  onTrackHighlight?: (file: File) => void;
}

export default function Playlist({
  currentFileNameA, currentFileNameB, onSelect, onLoadToDeck, onTrackHighlight,
}: PlaylistProps): ReactElement {
  const [tracks,      setTracks]      = useState<TrackItem[]>([]);
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState<SortKey>('name');
  const [sortAsc,     setSortAsc]     = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [loadProg,    setLoadProg]    = useState(0);
  const [folderName,  setFolderName]  = useState('');
  const [open,        setOpen]        = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [focusedIdx,  setFocusedIdx]  = useState(-1);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const listRef        = useRef<HTMLDivElement>(null);
  const rowRefs        = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Import folder ──────────────────────────────────────────────────────
  const handleFolderImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const rawFiles = Array.from(e.target.files ?? []).filter(isAudioFile);
    if (!rawFiles.length) return;
    setLoading(true); setLoadProg(0);

    const firstPath = (rawFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath ?? rawFiles[0]!.name;
    setFolderName(firstPath.split('/')[0] ?? '');

    const items: TrackItem[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const file    = rawFiles[i]!;
      const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
      const parts   = relPath.split('/');
      const folder  = parts.length > 2 ? parts.slice(1, -1).join('/') : '';
      const duration = await readAudioDuration(file);
      items.push({ id: makeTrackId(file, i), file, name: file.name.replace(/\.[^.]+$/, ''), ext: getFileExt(file.name), folder, duration, size: file.size, path: relPath });
      setLoadProg(Math.round(((i + 1) / rawFiles.length) * 100));
    }
    setTracks(items); setSelectedId(null); setFocusedIdx(-1); setLoading(false);
    if (e.target) e.target.value = '';
  }, []);

  // ── Sorted list ────────────────────────────────────────────────────────
  const sorted = useMemo<TrackItem[]>(() => {
    const q = search.trim().toLowerCase();
    const filtered = tracks.filter(t => !q || t.name.toLowerCase().includes(q) || t.folder.toLowerCase().includes(q));
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name')     cmp = a.name.localeCompare(b.name);
      if (sortBy === 'folder')   cmp = a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name);
      if (sortBy === 'duration') cmp = (a.duration ?? 0) - (b.duration ?? 0);
      if (sortBy === 'size')     cmp = a.size - b.size;
      return sortAsc ? cmp : -cmp;
    });
  }, [tracks, search, sortBy, sortAsc]);

  const folderGroups = useMemo<Array<[string, TrackItem[]]>>(() => {
    if (sortBy !== 'folder') return [];
    const map = new Map<string, TrackItem[]>();
    for (const t of sorted) {
      const k = t.folder || '(root)';
      const arr = map.get(k) ?? []; arr.push(t); map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [sorted, sortBy]);

  const selectedTrack = useMemo(() => sorted.find(t => t.id === selectedId) ?? null, [sorted, selectedId]);

  // ── Select + notify parent ────────────────────────────────────────────
  const selectTrack = useCallback((track: TrackItem, idx: number): void => {
    setSelectedId(track.id); setFocusedIdx(idx);
    onTrackHighlight?.(track.file);
  }, [onTrackHighlight]);

  const handleTrackClick = useCallback((track: TrackItem, idx: number): void => {
    selectTrack(track, idx);
    onSelect(track.file, 'A');
  }, [selectTrack, onSelect]);

  // ── Keyboard navigation ────────────────────────────────────────────────
  const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!sorted.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(focusedIdx + 1, sorted.length - 1);
      const t = sorted[next]; if (t) { setFocusedIdx(next); setSelectedId(t.id); onTrackHighlight?.(t.file); rowRefs.current.get(t.id)?.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(focusedIdx - 1, 0);
      const t = sorted[prev]; if (t) { setFocusedIdx(prev); setSelectedId(t.id); onTrackHighlight?.(t.file); rowRefs.current.get(t.id)?.scrollIntoView({ block:'nearest', behavior:'smooth' }); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const t = sorted[focusedIdx]; if (t) handleTrackClick(t, focusedIdx);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const t = sorted[0]; if (t) { setFocusedIdx(0); setSelectedId(t.id); onTrackHighlight?.(t.file); }
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = sorted.length - 1; const t = sorted[last]; if (t) { setFocusedIdx(last); setSelectedId(t.id); onTrackHighlight?.(t.file); }
    }
  }, [sorted, focusedIdx, handleTrackClick, onTrackHighlight]);

  // ── Drag ──────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, track: TrackItem): void => {
    (window as Window & { __draggedTrackFile?: File }).__draggedTrackFile = track.file;
    e.dataTransfer.effectAllowed = 'copy';
    const ghost = document.createElement('div');
    ghost.textContent = `🎵 ${track.name}`;
    ghost.style.cssText = 'position:fixed;top:-999px;background:#1a1a1e;color:#c8f561;font:11px monospace;padding:6px 12px;border-radius:6px;border:0.5px solid #c8f561;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost); }, 0);
  }, []);

  const handleDragEnd = useCallback((): void => {
    setTimeout(() => { delete (window as Window & { __draggedTrackFile?: File }).__draggedTrackFile; }, 200);
  }, []);

  const totalDur  = useMemo(() => tracks.reduce((s, t) => s + (t.duration ?? 0), 0), [tracks]);
  const totalSize = useMemo(() => tracks.reduce((s, t) => s + t.size, 0), [tracks]);

  const renderRow = (track: TrackItem, idx: number): ReactElement => (
    <TrackRow key={track.id}
      ref={(el: HTMLDivElement | null): void => { if (el) rowRefs.current.set(track.id, el); else rowRefs.current.delete(track.id); }}
      track={track} index={idx}
      inDeckA={track.file.name === currentFileNameA}
      inDeckB={track.file.name === currentFileNameB}
      isSelected={track.id === selectedId}
      isFocused={idx === focusedIdx}
      onClick={() => handleTrackClick(track, idx)}
      onLoadA={() => onLoadToDeck('A', track.file)}
      onLoadB={() => onLoadToDeck('B', track.file)}
      onDragStart={e => handleDragStart(e, track)}
      onDragEnd={handleDragEnd}
    />
  );

  return (
    <div style={{ borderTop:'0.5px solid var(--border)', background:'var(--bg)' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 20px', background:'var(--surface)', borderBottom: open ? '0.5px solid var(--border)' : 'none', cursor:'pointer', userSelect:'none' }}>
        <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--muted)', letterSpacing:'0.08em', textTransform:'uppercase' }}>PLAYLIST</span>
        {folderName && <span style={{ fontSize:10, color:'var(--accent)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📁 {folderName}</span>}
        {tracks.length > 0 && <span style={{ fontSize:10, color:'var(--muted)' }}>{tracks.length} tracks</span>}
        {selectedTrack && <span style={{ fontSize:9, color:'var(--accent2)', fontFamily:'var(--font-mono)', padding:'1px 7px', borderRadius:3, border:'0.5px solid var(--accent2)', background:'rgba(97,245,200,0.07)' }}>♪ {selectedTrack.name}</span>}
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--muted)' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div>
          {/* Toolbar */}
          <div style={{ display:'flex', gap:8, padding:'10px 20px', alignItems:'center', flexWrap:'wrap', borderBottom:'0.5px solid var(--border)', background:'var(--panel)' }}>
            <button onClick={() => folderInputRef.current?.click()} style={btnS(DECK_A_COLOR)}>📂 Import Folder</button>
            <input ref={folderInputRef} type="file"
              // @ts-expect-error — non-standard attribute
              webkitdirectory="true" directory="true" multiple
              style={{ display:'none' }} onChange={handleFolderImport} accept="audio/*"
            />
            <div style={{ fontSize:9, color:'var(--muted)', fontFamily:'var(--font-mono)', borderLeft:'0.5px solid var(--border)', paddingLeft:10, lineHeight:1.7 }}>
              <span style={{ color:'rgba(255,255,255,0.4)' }}>↑↓</span> navigate &nbsp;·&nbsp;
              <span style={{ color:'rgba(255,255,255,0.4)' }}>Enter</span> select &nbsp;·&nbsp;
              <span style={{ color:DECK_A_COLOR }}>SHIFT+←</span> load A &nbsp;·&nbsp;
              <span style={{ color:DECK_B_COLOR }}>SHIFT+→</span> load B
            </div>
          </div>

          {/* Search + Sort */}
          {tracks.length > 0 && (
            <div style={{ display:'flex', gap:8, padding:'8px 20px', alignItems:'center', borderBottom:'0.5px solid var(--border)', background:'var(--panel)', flexWrap:'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ flex:1, minWidth:120, background:'var(--surface)', border:'0.5px solid var(--border)', color:'var(--text)', borderRadius:4, padding:'4px 10px', fontSize:11, fontFamily:'var(--font-mono)', outline:'none' }}
                onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.blur(); listRef.current?.focus(); } }}
              />
              {SORT_OPTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => { if (sortBy === key) setSortAsc(a => !a); else { setSortBy(key); setSortAsc(true); } }}
                  style={{ ...btnS(sortBy === key ? 'var(--accent2)' : null), fontSize:9, padding:'3px 8px' }}>
                  {label}{sortBy === key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding:'12px 20px', background:'var(--panel)' }}>
              <div style={{ fontSize:10, color:'var(--muted)', marginBottom:6 }}>Loading… {loadProg}%</div>
              <div style={{ height:2, background:'var(--border)', borderRadius:1 }}>
                <div style={{ height:'100%', width:`${loadProg}%`, background:'var(--accent)', borderRadius:1, transition:'width 0.1s' }} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && tracks.length === 0 && (
            <div style={{ padding:'32px 20px', textAlign:'center', cursor:'pointer' }} onClick={() => folderInputRef.current?.click()}>
              <div style={{ fontSize:28, marginBottom:10 }}>📂</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Click <span style={{ color:'var(--accent)' }}>Import Folder</span> to load your music library</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:5 }}>MP3 · WAV · FLAC · OGG · AAC · M4A · Sub-folders included</div>
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:8 }}>
                <span style={{ color:DECK_A_COLOR }}>SHIFT+←</span> load to A · <span style={{ color:DECK_B_COLOR }}>SHIFT+→</span> load to B
              </div>
            </div>
          )}

          {/* Track list */}
          {!loading && sorted.length > 0 && (
            <div ref={listRef} tabIndex={0} role="listbox" onKeyDown={handleListKeyDown}
              style={{ maxHeight:340, overflowY:'auto', overflowX:'hidden', outline:'none' }}>
              {sortBy === 'folder'
                ? folderGroups.map(([folder, fTracks]) => (
                    <div key={folder}>
                      <div style={{ padding:'5px 20px 3px', fontSize:9, color:'var(--muted)', background:'rgba(255,255,255,0.02)', letterSpacing:'0.08em', textTransform:'uppercase', borderBottom:'0.5px solid var(--border)', position:'sticky', top:0, zIndex:1 }}>
                        📁 {folder}
                      </div>
                      {fTracks.map((t, i) => renderRow(t, i))}
                    </div>
                  ))
                : sorted.map((t, i) => renderRow(t, i))
              }
            </div>
          )}

          {!loading && tracks.length > 0 && sorted.length === 0 && (
            <div style={{ padding:'20px', textAlign:'center', fontSize:11, color:'var(--muted)' }}>No tracks match &ldquo;{search}&rdquo;</div>
          )}

          {/* Footer */}
          {!loading && tracks.length > 0 && (
            <div style={{ padding:'6px 20px', borderTop:'0.5px solid var(--border)', display:'flex', gap:16, background:'var(--panel)', flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:9, color:'var(--muted)' }}>{sorted.length} / {tracks.length} tracks</span>
              <span style={{ fontSize:9, color:'var(--muted)' }}>Total {formatDuration(totalDur)}</span>
              <span style={{ fontSize:9, color:'var(--muted)' }}>{formatSize(totalSize)}</span>
              <span style={{ fontSize:9, color:'var(--muted)', marginLeft:'auto' }}>↑↓ navigate · Enter select · Drag → Deck</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TrackRow ─────────────────────────────────────────────────────────────────

interface TrackRowProps {
  track: TrackItem; index: number;
  inDeckA: boolean; inDeckB: boolean;
  isSelected: boolean; isFocused: boolean;
  onClick(): void; onLoadA(): void; onLoadB(): void;
  onDragStart(e: React.DragEvent<HTMLDivElement>): void;
  onDragEnd(): void;
}

const TrackRow = React.forwardRef<HTMLDivElement, TrackRowProps>(function TrackRow(
  { track, index, inDeckA, inDeckB, isSelected, isFocused, onClick, onLoadA, onLoadB, onDragStart, onDragEnd }, ref,
) {
  const [hovered, setHovered] = useState(false);
  const rowColor = inDeckA ? DECK_A_COLOR : inDeckB ? DECK_B_COLOR : isSelected ? 'var(--accent2)' : isFocused ? 'rgba(255,255,255,0.7)' : null;
  const bg = inDeckA ? 'rgba(200,245,97,0.07)' : inDeckB ? 'rgba(97,200,245,0.07)' : isFocused ? 'rgba(255,255,255,0.06)' : isSelected ? 'rgba(97,245,200,0.05)' : hovered ? 'rgba(255,255,255,0.025)' : 'transparent';

  return (
    <div ref={ref} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 20px', borderBottom:'0.5px solid rgba(255,255,255,0.03)', borderLeft: isFocused ? `2px solid ${isSelected ? 'var(--accent2)' : 'rgba(255,255,255,0.3)'}` : '2px solid transparent', background:bg, cursor:'grab', transition:'background 0.08s', userSelect:'none' }}
    >
      <div style={{ width:28, flexShrink:0, textAlign:'center' }}>
        {inDeckA ? <span style={{ fontSize:9, fontWeight:700, color:DECK_A_COLOR, fontFamily:'var(--font-mono)' }}>A▶</span>
          : inDeckB ? <span style={{ fontSize:9, fontWeight:700, color:DECK_B_COLOR, fontFamily:'var(--font-mono)' }}>B▶</span>
          : <span style={{ fontSize:9, color: isFocused ? 'rgba(255,255,255,0.5)' : 'var(--muted)', fontFamily:'var(--font-mono)' }}>{index + 1}</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontFamily:'var(--font-mono)', color: rowColor ?? 'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight: (inDeckA||inDeckB||isSelected||isFocused) ? 700 : 400 }}>{track.name}</div>
        {track.folder && <div style={{ fontSize:9, color:'var(--muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>📁 {track.folder}</div>}
      </div>
      <span style={{ fontSize:8, padding:'1px 5px', borderRadius:3, border:'0.5px solid var(--border)', color:'var(--muted)', fontFamily:'var(--font-mono)', textTransform:'uppercase', flexShrink:0 }}>{track.ext}</span>
      <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)', flexShrink:0, width:36, textAlign:'right' }}>{formatDuration(track.duration)}</span>
      {(hovered || isFocused) && (
        <div style={{ display:'flex', gap:3, flexShrink:0 }}>
          <button onClick={e => { e.stopPropagation(); onLoadA(); }} title="Load Deck A"
            style={{ border:`0.5px solid ${DECK_A_COLOR}`, color:DECK_A_COLOR, fontSize:9, fontFamily:'var(--font-mono)', fontWeight:700, width:20, height:20, borderRadius:3, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background: inDeckA ? `${DECK_A_COLOR}22` : 'transparent' }}>A</button>
          <button onClick={e => { e.stopPropagation(); onLoadB(); }} title="Load Deck B"
            style={{ border:`0.5px solid ${DECK_B_COLOR}`, color:DECK_B_COLOR, fontSize:9, fontFamily:'var(--font-mono)', fontWeight:700, width:20, height:20, borderRadius:3, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background: inDeckB ? `${DECK_B_COLOR}22` : 'transparent' }}>B</button>
        </div>
      )}
      {hovered && <span style={{ fontSize:9, color:'var(--muted)', flexShrink:0 }}>⠿</span>}
    </div>
  );
});

function btnS(c: string | null): React.CSSProperties {
  return { background: c ? `${c}18` : 'transparent', border:`0.5px solid ${c ?? 'var(--border)'}`, color: c ?? 'var(--muted)', fontSize:10, fontFamily:'var(--font-mono)', padding:'5px 10px', borderRadius:4, cursor:'pointer', letterSpacing:'0.06em', whiteSpace:'nowrap', transition:'all 0.15s' };
}
