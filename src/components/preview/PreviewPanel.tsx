"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Video,
  Terminal,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/motion/tabs";
import { ExportModal } from "@/components/export/ExportModal";
import { ShaderBackground } from "@/components/motion/shader-background";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";

export interface PreviewPanelProps {
  videoUrl?: string | null;
  status: "idle" | "preparing" | "rendering" | "ready" | "error";
  progress?: number;
  renderLog?: string;
  onReRender?: () => void;
  onExportMaster?: (format: "mp4" | "gif" | "zip", quality: string) => Promise<void>;
  className?: string;
}

export function PreviewPanel({
  videoUrl,
  status = "idle",
  progress = 0,
  renderLog,
  onReRender,
  onExportMaster,
  className,
}: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-black overflow-hidden transition-all border-b border-[#27272a] text-white",
        fullscreen ? "fixed inset-0 z-50 bg-black" : "relative",
        className
      )}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        {/* Exact h-11 Header (44px) */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#27272a] px-3.5 bg-[#09090b]">
          <TabsList className="h-7 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
            <TabsTrigger value="preview" className="text-xs px-2.5 py-0.5 gap-1 rounded-md text-[#a1a1aa] data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:font-semibold">
              <Video className="size-3" />
              <span>Preview</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs px-2.5 py-0.5 gap-1 rounded-md text-[#a1a1aa] data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:font-semibold">
              <Terminal className="size-3" />
              <span>Logs</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5">
            {status === "rendering" && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] text-white font-medium border border-white/20">
                <Loader variant="spinner" size={12} className="text-white" />
                <span>{progress > 0 ? `${progress}%` : "Rendering"}</span>
              </span>
            )}
            {status === "ready" && (
              <AnimatedBadge status="success" size="sm" className="bg-[#18181b] text-white border border-[#27272a] text-[10.5px]">
                <span>1080p Draft</span>
              </AnimatedBadge>
            )}

            {onReRender && (
              <button
                type="button"
                onClick={onReRender}
                className="flex size-6 items-center justify-center rounded-md text-[#a1a1aa] hover:bg-[#18181b] hover:text-white transition-colors border border-[#27272a]"
                title="Re-render Scene (Ctrl+S)"
              >
                <RotateCcw className="size-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1 rounded-md bg-white text-black px-2 py-0.5 text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-sm active:scale-95"
              title="Export & Publish Modal"
            >
              <Download className="size-3" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="flex size-6 items-center justify-center rounded-md text-[#a1a1aa] hover:bg-[#18181b] hover:text-white transition-colors border border-[#27272a]"
            >
              {fullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
            </button>
          </div>
        </div>

        {/* Tab 1: Video Canvas */}
        <TabsContent value="preview" className="relative flex flex-1 flex-col items-center justify-center p-3 overflow-hidden m-0 bg-black">
          {status === "preparing" || status === "rendering" ? (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-sm text-center p-5 rounded-xl bg-[#121214] border border-[#27272a] z-10 shadow-2xl">
              <div className="flex items-center gap-2">
                <Loader variant="dots" size={14} />
                <span className="text-[10.5px] font-semibold uppercase tracking-widest text-white">
                  COMPILING MANIM SCENE
                </span>
              </div>
              <div className="space-y-2 text-left text-xs text-white">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Python 3.14 runtime ready</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Manim Community v0.21 verified</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Loader variant="spinner" size={12} className="text-white" />
                  <span>Rendering frames with FFmpeg...</span>
                </div>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="relative flex size-full items-center justify-center z-10">
              <video
                ref={videoRef}
                src={videoUrl}
                loop={isLooping}
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl cursor-pointer border border-[#27272a]"
              />
            </div>
          ) : (
            <div className="relative size-full flex flex-col items-center justify-center text-center text-[#71717a]">
              {/* Subtle Math Dot Grid Shader Background */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <ShaderBackground variant="dot-grid" />
              </div>
              <div className="relative z-10 flex flex-col items-center space-y-2">
                <Sparkles className="size-6 text-white" />
                <p className="text-xs text-[#a1a1aa]">Type a prompt or edit code to generate Manim preview</p>
              </div>
            </div>
          )}

          {/* Video Control Bar */}
          {videoUrl && (
            <div className="flex w-full shrink-0 items-center justify-between gap-3 pt-2 text-xs text-white z-10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex size-7 items-center justify-center rounded-lg bg-[#18181b] text-white hover:bg-[#27272a] transition-colors border border-[#27272a]"
                >
                  {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 fill-current text-white" />}
                </button>
                <span className="font-mono text-[10.5px] text-[#a1a1aa] tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 rounded-lg appearance-none bg-[#27272a] cursor-pointer accent-white"
              />

              <div className="flex items-center gap-1.5">
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSpeed(s)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors",
                      playbackSpeed === s ? "bg-white text-black font-bold" : "text-[#71717a] hover:text-white bg-[#18181b] border border-[#27272a]"
                    )}
                  >
                    {s}x
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex size-6 items-center justify-center rounded text-[#a1a1aa] hover:text-white bg-[#18181b] border border-[#27272a]"
                >
                  {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Render Logs */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto p-3 font-mono text-[10.5px] text-[#a1a1aa] bg-black m-0">
          <pre className="whitespace-pre-wrap leading-relaxed">{renderLog || "No logs available. Trigger a render to view output."}</pre>
        </TabsContent>
      </Tabs>

      {/* Export Hub Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={async (fmt, q) => {
          if (onExportMaster) {
            await onExportMaster(fmt, q);
          } else {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }}
      />
    </div>
  );
}
