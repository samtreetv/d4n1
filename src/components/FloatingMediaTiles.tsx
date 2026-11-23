import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Monitor, Video, X } from 'lucide-react';
import { CallChatMessage, CallRoomSnapshot } from '../engine/callRoomEngine';

interface MediaStreamTileItem {
  id: string;
  label: string;
  kind: 'cam' | 'screen';
  colorHex: string;
  stream: MediaStream;
  muted?: boolean;
}

type AspectPreset = '4:3' | '1:1' | '3:4' | '16:9';

const ASPECT_CYCLE: AspectPreset[] = ['4:3', '16:9', '1:1', '3:4'];
const ASPECT_DIMS: Record<AspectPreset, { w: number; h: number }> = {
  '4:3': { w: 280, h: 210 },
  '16:9': { w: 320, h: 180 },
  '1:1': { w: 230, h: 230 },
  '3:4': { w: 205, h: 274 },
};

const DraggableMediaTile: React.FC<{
  item: MediaStreamTileItem;
  initialOffset: number;
  onDismiss: (id: string) => void;
}> = ({ item, initialOffset, onDismiss }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [pos, setPos] = useState(() => ({
    x: 24 + initialOffset * 34,
    y: 96 + initialOffset * 28,
  }));
  const [aspectIdx, setAspectIdx] = useState(item.kind === 'screen' ? 1 : 0);
  const [minimized, setMinimized] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, sheenX: 50, sheenY: 50 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== item.stream) {
      el.srcObject = item.stream;
    }
    void el.play().catch(() => {});
  }, [item.stream, minimized]);

  const aspect = ASPECT_CYCLE[aspectIdx];
  const dims = ASPECT_DIMS[aspect];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({
        x: Math.max(12, Math.min(window.innerWidth - 96, dragRef.current.origX + dx)),
        y: Math.max(12, Math.min(window.innerHeight - 96, dragRef.current.origY + dy)),
      });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    setTilt({
      rx: -ny * 10,
      ry: nx * 12,
      sheenX: (nx + 0.5) * 100,
      sheenY: (ny + 0.5) * 100,
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handlePointerLeave = () => {
    if (!dragRef.current) {
      setTilt({ rx: 0, ry: 0, sheenX: 50, sheenY: 50 });
    }
  };

  if (minimized) {
    return (
      <div
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed top-0 left-0 z-40 pointer-events-auto cursor-grab active:cursor-grabbing"
      >
        <button
          type="button"
          onClick={() => setMinimized(false)}
          title={`Restore ${item.label}`}
          style={{
            borderColor: item.colorHex,
            boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 18px ${item.colorHex}55`,
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#121614]/88 backdrop-blur-md border text-xs font-medium text-[#faf6ec] whitespace-nowrap cursor-pointer"
        >
          {item.kind === 'screen' ? (
            <Monitor className="w-3.5 h-3.5 shrink-0" style={{ color: item.colorHex }} />
          ) : (
            <Video className="w-3.5 h-3.5 shrink-0" style={{ color: item.colorHex }} />
          )}
          <span>{item.label}</span>
          <Maximize2 className="w-3 h-3 opacity-70 shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0) perspective(720px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
        width: `${dims.w}px`,
        height: `${dims.h}px`,
        borderColor: `${item.colorHex}78`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="fixed top-0 left-0 z-40 pointer-events-auto rounded-2xl overflow-hidden bg-[#0e1210]/92 border shadow-[0_22px_54px_rgba(0,0,0,0.58)] cursor-grab active:cursor-grabbing transition-[width,height] duration-200 select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={item.muted ?? true}
        className="w-full h-full object-cover"
      />

      {/* Pointer-reactive glass sheen */}
      <div
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle at ${tilt.sheenX}% ${tilt.sheenY}%, rgba(255,255,255,0.18), transparent 58%)`,
        }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Measured contrast scrim & controls */}
      <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/82 via-black/45 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: item.colorHex }}
          />
          <span className="text-xs font-medium text-[#faf6ec] truncate">{item.label}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setAspectIdx((idx) => (idx + 1) % ASPECT_CYCLE.length)}
            title="Switch aspect ratio"
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/85 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            {aspect}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Minimize tile"
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            title="Hide tile"
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface FloatingMediaTilesProps {
  callState: CallRoomSnapshot;
  onStopLocalCam: () => void;
  onStopLocalScreen: () => void;
}

export const FloatingMediaTiles: React.FC<FloatingMediaTilesProps> = ({
  callState,
  onStopLocalCam,
  onStopLocalScreen,
}) => {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [recentWhispers, setRecentWhispers] = useState<CallChatMessage[]>([]);

  // Show ephemeral overhead whispers for recent chat messages (last 7 seconds)
  useEffect(() => {
    const refresh = () => {
      const cutoff = Date.now() - 7500;
      setRecentWhispers(callState.messages.filter((m) => m.timestamp >= cutoff).slice(-3));
    };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [callState.messages]);

  const tiles: MediaStreamTileItem[] = [];
  if (callState.localCamStream) {
    tiles.push({
      id: 'local-cam',
      label: `${callState.myName || 'You'} · Camera`,
      kind: 'cam',
      colorHex: callState.myColorHex,
      stream: callState.localCamStream,
      muted: true,
    });
  }
  if (callState.localScreenStream) {
    tiles.push({
      id: 'local-screen',
      label: `${callState.myName || 'You'} · Screen`,
      kind: 'screen',
      colorHex: callState.myColorHex,
      stream: callState.localScreenStream,
      muted: true,
    });
  }

  for (const peer of callState.peers) {
    if (peer.camStream) {
      tiles.push({
        id: `peer-cam-${peer.id}`,
        label: `${peer.name} · Camera`,
        kind: 'cam',
        colorHex: peer.colorHex,
        stream: peer.camStream,
        muted: true,
      });
    }
    if (peer.screenStream) {
      tiles.push({
        id: `peer-screen-${peer.id}`,
        label: `${peer.name} · Screen`,
        kind: 'screen',
        colorHex: peer.colorHex,
        stream: peer.screenStream,
        muted: true,
      });
    }
  }

  const visibleTiles = tiles.filter((t) => !hiddenIds.includes(t.id));

  const handleDismiss = (id: string) => {
    if (id === 'local-cam') {
      onStopLocalCam();
    } else if (id === 'local-screen') {
      onStopLocalScreen();
    } else {
      setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {visibleTiles.map((item, idx) => (
        <DraggableMediaTile
          key={item.id}
          item={item}
          initialOffset={idx}
          onDismiss={handleDismiss}
        />
      ))}

      {/* Subtle Overhead Chat Whispers (only when live room messages arrive) */}
      {callState.mode === 'room' && recentWhispers.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none max-w-md px-4">
          {recentWhispers.map((msg) => (
            <div
              key={msg.id}
              className="px-3.5 py-1.5 rounded-xl bg-[#0e1210]/74 backdrop-blur-md border border-white/12 text-xs text-[#faf6ec] shadow-lg flex items-center gap-2"
            >
              <span
                className="font-semibold shrink-0"
                style={{ color: msg.colorHex }}
              >
                {msg.senderName}
              </span>
              <span className="opacity-92">{msg.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
