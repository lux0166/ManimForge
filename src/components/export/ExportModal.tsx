"use client";

import React, { useState } from "react";
import { Download, Film, Image as ImageIcon, FileCode, Check, X, Sparkles, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "mp4" | "gif" | "zip", quality: string) => Promise<void>;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<"mp4" | "gif" | "zip">("mp4");
  const [quality, setQuality] = useState("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat, quality);
      setExportedSuccess(true);
      setTimeout(() => {
        setExportedSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#121214] border border-[#27272a] p-6 text-white shadow-overlay space-y-5">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <Download className="size-5 text-white" />
            <h3 className="font-semibold text-sm">Export & Publish Master</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-[#71717a] hover:text-white hover:bg-[#18181b]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "mp4", label: "MP4 Video", icon: Film, desc: "H.264 Audio/Video" },
              { id: "gif", label: "Looping GIF", icon: ImageIcon, desc: "Notion & README" },
              { id: "zip", label: "Python ZIP", icon: FileCode, desc: "Source & Assets" },
            ].map((f) => {
              const Icon = f.icon;
              const isSel = selectedFormat === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormat(f.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center border transition-all",
                    isSel
                      ? "bg-[#18181b] border-white text-white shadow-sm"
                      : "bg-[#09090b] border-[#27272a] text-[#a1a1aa] hover:bg-[#18181b]"
                  )}
                >
                  <Icon className="size-5" />
                  <span className="font-semibold text-xs">{f.label}</span>
                  <span className="text-[10px] text-[#71717a]">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedFormat !== "zip" && (
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
              Quality & Resolution
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { q: "720p", l: "720p HD" },
                { q: "1080p", l: "1080p60 Master" },
                { q: "4k", l: "4K UHD" },
              ].map((item) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setQuality(item.q)}
                  className={cn(
                    "rounded-xl py-2 text-xs font-bold border transition-all",
                    quality === item.q
                      ? "bg-white text-black border-white"
                      : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:bg-[#27272a]"
                  )}
                >
                  {item.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-black transition-all hover:bg-[#e4e4e7] disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              <span>Rendering & Encoding...</span>
            </>
          ) : exportedSuccess ? (
            <>
              <Check className="size-4 text-[#22c55e]" />
              <span>Export Complete!</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4 fill-current" />
              <span>Export {selectedFormat.toUpperCase()}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
