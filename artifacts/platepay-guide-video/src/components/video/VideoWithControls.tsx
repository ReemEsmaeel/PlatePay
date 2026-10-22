import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Repeat, Volume2, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const PROGRESS_TICK_MS = 60;

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  hook: { title: 'One plate', filePath: 'src/components/video/scenes/PlateHook.tsx' },
  merchant: { title: 'Merchant upload', filePath: 'src/components/video/scenes/MerchantUpload.tsx' },
  request: { title: 'Driver review', filePath: 'src/components/video/scenes/DriverRequest.tsx' },
  approval: { title: 'Driver approval', filePath: 'src/components/video/scenes/DriverApproval.tsx' },
  history: { title: 'Shared history', filePath: 'src/components/video/scenes/SharedHistory.tsx' },
};

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details?.filePath) return;
  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: { sceneIndex: index, sceneCount: sceneKeys.length, sceneTitle: details.title || key, filePath: details.filePath, lineNumber: 1 },
  }, '*');
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const {
    sceneKeys, activeIndex, locked, paused, mountKey, tick,
    durations, activeDuration, activeStartTime, totalDuration,
    onSceneChange, jumpTo, toggleLock, togglePause,
  } = useSceneControls(SCENE_DURATIONS);
  const [muted, setMuted] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);
  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed(value => {
      if (!value) { setHovering(false); setTapPinned(false); }
      return !value;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [collapsed, tapPinned]);

  useEffect(() => {
    if (!paused) return;
    const frozen = document.getAnimations().filter(animation => animation.playState === 'running');
    frozen.forEach(animation => animation.pause());
    return () => frozen.forEach(animation => animation.play());
  }, [paused]);

  if (!isIframed) return <VideoTemplate/>;

  const visible = !collapsed || hovering || tapPinned;
  return (
    <div className="video-root">
      <VideoTemplate key={mountKey} durations={durations} loop paused={paused} muted={muted} onSceneChange={onSceneChange}/>
      <div
        ref={sensorRef}
        className="video-controls-sensor"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="video-controls-spacer" aria-hidden="true"/>
        <div className={`video-controls ${visible ? '' : 'is-hidden'}`} aria-hidden={!visible}>
          <button className="control-button" onClick={togglePause} title={paused ? 'Play' : 'Pause'} aria-label={paused ? 'Play' : 'Pause'}>{paused ? <Play size={28}/> : <Pause size={28}/>}</button>
          <button className="control-button" onClick={toggleLock} title={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'} aria-pressed={locked}><Repeat size={28}/></button>
          <button className="control-button" onClick={() => setMuted(value => !value)} title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute audio' : 'Mute audio'} aria-pressed={muted}>{muted ? <VolumeX size={28}/> : <Volume2 size={28}/>}</button>
          <div className="control-divider" aria-hidden="true"/>
          <PlaybackStatus
            sceneKeys={sceneKeys}
            activeIndex={activeIndex}
            activeDuration={activeDuration}
            activeStartTime={activeStartTime}
            totalDuration={totalDuration}
            tick={tick}
            paused={paused}
            onJumpTo={handleJumpTo}
          />
          <button className="control-button" onClick={handleToggleCollapsed} title={collapsed ? 'Show controls' : 'Hide controls'} aria-label={collapsed ? 'Show controls' : 'Hide controls'} aria-expanded={!collapsed}>{collapsed ? <ChevronUp size={36}/> : <ChevronDown size={36}/>}</button>
        </div>
      </div>
    </div>
  );
}

function PlaybackStatus({
  sceneKeys, activeIndex, activeDuration, activeStartTime, totalDuration, tick, paused, onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);
  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const id = window.setInterval(() => setElapsed(elapsedBaseRef.current + performance.now() - startedAt), PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(id);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [tick, paused]);
  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));
  return (
    <>
      <div className="playback-segments">
        {sceneKeys.map((key, index) => <button key={key} onClick={() => onJumpTo(index)} aria-label={`Jump to scene ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined}>
          <span className="playback-fill" style={{ width: `${index < activeIndex ? 100 : index === activeIndex ? progress * 100 : 0}%` }}/>
        </button>)}
      </div>
      <div className="control-counter">{activeIndex + 1}/{sceneKeys.length}</div>
      <div className="control-time" role="timer" aria-label={`Playback time ${formatTime(totalElapsed)} of ${formatTime(totalDuration)}`}>{formatTime(totalElapsed)} / {formatTime(totalDuration)}</div>
    </>
  );
}

function formatTime(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
