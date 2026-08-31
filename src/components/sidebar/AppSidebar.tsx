"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Plus,
  Sparkles,
  Video,
  Search,
  MoreVertical,
  Pin,
  PinOff,
  Edit2,
  Copy,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarProjectItem {
  id: string;
  label: string;
  isPinned?: boolean;
  prompt?: string;
}

export interface AppSidebarProps {
  items: SidebarProjectItem[];
  selectedId: string;
  onSelect: (item: SidebarProjectItem) => void;
  onNewVideo: () => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onDuplicate?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  className?: string;
}

export function AppSidebar({
  items,
  selectedId,
  onSelect,
  onNewVideo,
  onDelete,
  onRename,
  onDuplicate,
  onTogglePin,
  className,
}: AppSidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuTarget, setMenuTarget] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuTarget(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuTarget(null);
        setEditingId(null);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuTarget({ id, x: e.clientX, y: e.clientY });
  };

  const handleStartRename = (item: SidebarProjectItem) => {
    setEditingId(item.id);
    setEditName(item.label);
    setMenuTarget(null);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRename?.(id, editName.trim());
    }
    setEditingId(null);
  };

  // Sort: Pinned items first, then others
  const filteredItems = items
    .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const activeMenuProject = items.find((i) => i.id === menuTarget?.id);

  return (
    <aside className={cn("flex h-full w-[240px] shrink-0 flex-col bg-[#09090b] border-r border-[#27272a] text-white select-none relative", className)}>
      {/* Exact h-11 Header (44px) matching Chat & Preview columns */}
      <div className="flex h-11 shrink-0 items-center justify-between px-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-white" />
          <span className="font-semibold text-xs text-white tracking-tight">ManimForge</span>
        </div>
        <span className="text-[10px] font-mono text-[#71717a]">v0.21</span>
      </div>

      {/* New Video Button */}
      <div className="p-2 border-b border-[#27272a]/60 space-y-1.5">
        <button
          type="button"
          onClick={onNewVideo}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white py-1.5 px-3 text-xs font-semibold text-black transition-all hover:bg-[#e4e4e7] active:scale-[0.98] shadow-sm cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>New Video</span>
        </button>

        {/* Quick Search */}
        {items.length > 4 && (
          <div className="relative flex items-center">
            <Search className="absolute left-2 size-3 text-[#71717a]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-md bg-[#18181b] border border-[#27272a] pl-7 pr-2 py-1 text-[11px] text-white placeholder:text-[#71717a] outline-none focus:border-[#52525b]"
            />
          </div>
        )}
      </div>

      {/* Projects List */}
      <div className="relative flex-1 overflow-y-auto px-1.5 space-y-0.5 py-1.5">
        {filteredItems.map((item) => {
          const isActive = item.id === selectedId;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
              className={cn(
                "group relative flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors cursor-pointer",
                isActive
                  ? "bg-[#18181b] text-white font-medium border border-[#27272a]"
                  : "text-[#a1a1aa] hover:bg-white/5 hover:text-white"
              )}
              onClick={() => {
                if (!isEditing) onSelect(item);
              }}
            >
              {item.isPinned ? (
                <Pin className="size-3 shrink-0 text-amber-400 rotate-45" />
              ) : (
                <Video className={cn("size-3.5 shrink-0", isActive ? "text-white" : "text-[#71717a]")} />
              )}

              {isEditing ? (
                <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full bg-[#121214] text-white px-1.5 py-0.5 rounded border border-white/30 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(item.id)}
                    className="p-1 hover:text-emerald-400 cursor-pointer"
                  >
                    <Check className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 hover:text-red-400 cursor-pointer"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="truncate flex-1 font-sans text-xs">{item.label}</span>
                  
                  {/* Action 3-dots Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setMenuTarget({ id: item.id, x: rect.right + 4, y: rect.top });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#27272a] rounded text-[#71717a] hover:text-white transition-opacity cursor-pointer"
                    title="Options"
                  >
                    <MoreVertical className="size-3" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Dark HUD Context Menu */}
      {menuTarget && activeMenuProject && (
        <div
          ref={menuRef}
          style={{
            top: Math.min(menuTarget.y, window.innerHeight - 180),
            left: Math.min(menuTarget.x, window.innerWidth - 180),
          }}
          className="fixed z-50 w-44 rounded-lg bg-[#121214] border border-[#27272a] p-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pin / Unpin */}
          <button
            type="button"
            onClick={() => {
              onTogglePin?.(activeMenuProject.id);
              setMenuTarget(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-white hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            {activeMenuProject.isPinned ? (
              <>
                <PinOff className="size-3.5 text-amber-400" />
                <span>Bỏ ghim</span>
              </>
            ) : (
              <>
                <Pin className="size-3.5 text-amber-400" />
                <span>Ghim lên đầu</span>
              </>
            )}
          </button>

          {/* Rename */}
          <button
            type="button"
            onClick={() => handleStartRename(activeMenuProject)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-white hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            <Edit2 className="size-3.5 text-[#a1a1aa]" />
            <span>Đổi tên</span>
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={() => {
              onDuplicate?.(activeMenuProject.id);
              setMenuTarget(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-white hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            <Copy className="size-3.5 text-[#a1a1aa]" />
            <span>Nhân bản</span>
          </button>

          <div className="my-1 border-t border-[#27272a]" />

          {/* Delete */}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Bạn có chắc muốn xóa "${activeMenuProject.label}"?`)) {
                onDelete?.(activeMenuProject.id);
              }
              setMenuTarget(null);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="size-3.5 text-red-400" />
            <span>Xóa video</span>
          </button>
        </div>
      )}
    </aside>
  );
}
