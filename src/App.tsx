"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { StudioLayout } from "@/components/layout/StudioLayout";
import { AppSidebar, type SidebarProjectItem } from "@/components/sidebar/AppSidebar";
import { ChatPanel, type ChatMessage } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { CodeEditorPanel } from "@/components/editor/CodeEditorPanel";
import {
  fetchEnvironment,
  fetchAvailableAgents,
  fetchProjects,
  createProject,
  saveProjectCode,
  loadProjectCode,
  saveProjectChat,
  loadProjectChat,
  renderManimScene,
  executeAgentPrompt,
  exportMasterVideo,
  deleteProject,
  renameProject,
  duplicateProject,
  type AgentCliInfo,
  type AiChatResult,
} from "@/lib/tauri-bridge";

const INITIAL_WELCOME_MSG: ChatMessage = {
  id: "msg-welcome",
  sender: "assistant",
  content: "✨ **Welcome to ManimForge Studio**\n\nType any prompt in the composer below (e.g. *\"Vẽ đồ thị hàm sin và cos giao nhau\"* or *\"Mô phỏng chuỗi Fourier\"* or *\"Mạng nơ-ron học lan truyền\"* ) to generate, edit, and compile mathematical animations in real time with Manim Community v0.21.",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function App() {
  const [projects, setProjects] = useState<SidebarProjectItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  // Default to empty code for clean slate
  const [code, setCode] = useState<string>("");
  const [renderStatus, setRenderStatus] = useState<"idle" | "preparing" | "rendering" | "ready" | "error">("idle");
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderLog, setRenderLog] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("agy");
  const [availableAgents, setAvailableAgents] = useState<AgentCliInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MSG]);

  const streamingTimerRef = useRef<number | null>(null);

  // Smooth progressive code typewriter stream
  const streamCodeIntoEditor = useCallback((targetCode: string, onFinish?: () => void) => {
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }

    let currentIndex = 0;
    const totalLength = targetCode.length;
    // Typing speed tuned for smooth visual feel (~1.2s total)
    const step = Math.max(2, Math.floor(totalLength / 45));

    streamingTimerRef.current = window.setInterval(() => {
      currentIndex += step;
      if (currentIndex >= totalLength) {
        if (streamingTimerRef.current) {
          clearInterval(streamingTimerRef.current);
          streamingTimerRef.current = null;
        }
        setCode(targetCode);
        onFinish?.();
      } else {
        setCode(targetCode.slice(0, currentIndex));
      }
    }, 25);
  }, []);

  // Clean up streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
      }
    };
  }, []);

  // Load initial backend environment & projects
  useEffect(() => {
    async function loadData() {
      try {
        const [env, agents, projList] = await Promise.all([
          fetchEnvironment(),
          fetchAvailableAgents(),
          fetchProjects(),
        ]);

        setAvailableAgents(agents);

        if (projList.length > 0) {
          setProjects(projList.map((p) => ({ id: p.id, label: p.name, prompt: p.prompt ?? undefined })));
          const firstProj = projList[0];
          setSelectedId(firstProj.id);
          
          const loadedCode = await loadProjectCode(firstProj.id);
          if (loadedCode && loadedCode.trim().length > 0) {
            setCode(loadedCode);
          } else {
            setCode("");
          }

          // Load chat
          const chatRaw = await loadProjectChat(firstProj.id);
          try {
            const parsed = JSON.parse(chatRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
            }
          } catch {}
        }
      } catch (err) {
        console.warn("Backend load error:", err);
      }
    }

    loadData();
  }, []);

  // Switch project handler
  const handleSelectProject = async (proj: SidebarProjectItem) => {
    setSelectedId(proj.id);
    setRenderStatus("idle");
    setRenderError(null);
    setVideoUrl(null);

    // Load code
    const loadedCode = await loadProjectCode(proj.id);
    if (loadedCode && loadedCode.trim().length > 0) {
      setCode(loadedCode);
    } else {
      setCode("");
    }

    // Load chat
    const chatRaw = await loadProjectChat(proj.id);
    try {
      const parsed = JSON.parse(chatRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      } else {
        setMessages([
          {
            id: `msg-${Date.now()}`,
            sender: "assistant",
            content: `📂 Switched to **${proj.label}**.\n\nReady to animate or edit code.`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setMessages([INITIAL_WELCOME_MSG]);
    }
  };

  // Create new video project handler - COMPLETELY BLANK SLATE
  const handleNewVideo = async () => {
    const videoNumber = projects.length + 1;
    const name = `Video ${videoNumber}`;
    
    // Stop any ongoing stream
    if (streamingTimerRef.current) {
      clearInterval(streamingTimerRef.current);
      streamingTimerRef.current = null;
    }

    // Reset all UI states to 100% EMPTY
    setCode("");
    setVideoUrl(null);
    setRenderStatus("idle");
    setRenderProgress(0);
    setRenderError(null);
    setRenderLog("");

    const newWelcome: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "assistant",
      content: `🎬 **${name}** created!\n\nDescribe the mathematical scene or animation you want to create below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([newWelcome]);

    try {
      const newMeta = await createProject(name, "Catppuccin Mocha", "");
      setProjects((prev) => [{ id: newMeta.id, label: newMeta.name }, ...prev]);
      setSelectedId(newMeta.id);
      saveProjectChat(newMeta.id, JSON.stringify([newWelcome]));
      saveProjectCode(newMeta.id, "");
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleReRender = useCallback(async () => {
    if (!code.trim()) return;

    setRenderStatus("rendering");
    setRenderProgress(30);
    setRenderError(null);
    setRenderLog("Compiling scene.py with Manim Community v0.21...");

    try {
      await saveProjectCode(selectedId, code);
      const url = await renderManimScene(selectedId, code, "ql");
      if (url) {
        setVideoUrl(url);
      }
      setRenderProgress(100);
      setRenderStatus("ready");
      setRenderLog("Render complete");
    } catch (err: any) {
      setRenderLog(String(err));
      setRenderError(String(err));
      setRenderStatus("error");
    }
  }, [selectedId, code]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleReRender();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleReRender]);

  const handleSendMessage = async (prompt: string, model?: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const assistantMsgId = `msg-${Date.now() + 1}`;
    const streamingAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: "assistant",
      content: "Đang suy nghĩ...",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMsgs = [...messages, userMsg, streamingAssistantMsg];
    setMessages(updatedMsgs);
    setIsGenerating(true);

    try {
      const result: AiChatResult = await executeAgentPrompt(model || selectedModel, prompt, selectedId, code);
      
      const isCodeUpdate = Boolean((result as any).is_code_update && result.code);

      if (isCodeUpdate && result.code) {
        const generatedCode = result.code;
        const generatedVideoUrl = result.video_url;

        // Progressive typewriter stream into Monaco Code Editor
        streamCodeIntoEditor(generatedCode, () => {
          saveProjectCode(selectedId, generatedCode);
          if (generatedVideoUrl) {
            setVideoUrl(generatedVideoUrl);
          }
          setRenderStatus("ready");
          setRenderProgress(100);
          setRenderLog("Scene ready");
        });
      } else {
        setRenderStatus("idle");
        setRenderProgress(0);
        setRenderLog("");
      }

      const finalMsgs: ChatMessage[] = updatedMsgs.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: result.explanation || `Đã phản hồi câu hỏi của bạn.`,
              isStreaming: false,
            }
          : m
      );

      setMessages(finalMsgs);
      saveProjectChat(selectedId, JSON.stringify(finalMsgs));
      setIsGenerating(false);
    } catch (err: any) {
      setIsGenerating(false);
      setRenderStatus("error");
      setRenderError(String(err));
      const errorMsgs = updatedMsgs.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: `Error: ${String(err)}`,
              isStreaming: false,
            }
          : m
      );
      setMessages(errorMsgs);
      saveProjectChat(selectedId, JSON.stringify(errorMsgs));
    }
  };

  const handleAutoFixError = (errorText: string) => {
    setRenderError(null);
    handleSendMessage(`Sửa lỗi biên dịch Manim sau trong code scene.py:\n\`\`\`\n${errorText}\n\`\`\``);
  };

  // Project Sidebar Actions: Delete, Rename, Duplicate, Pin
  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    if (selectedId === id) {
      if (updated.length > 0) {
        handleSelectProject(updated[0]);
      } else {
        handleNewVideo();
      }
    }
  };

  const handleRenameProject = async (id: string, newName: string) => {
    await renameProject(id, newName);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label: newName } : p))
    );
  };

  const handleDuplicateProject = async (id: string) => {
    const newId = await duplicateProject(id);
    if (newId) {
      const projList = await fetchProjects();
      setProjects(projList.map((p) => ({ id: p.id, label: p.name })));
      const dup = projList.find((p) => p.id === newId);
      if (dup) {
        handleSelectProject({ id: dup.id, label: dup.name });
      }
    }
  };

  const handleTogglePin = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isPinned: !p.isPinned } : p))
    );
  };

  return (
    <StudioLayout
      sidebarSlot={
        <AppSidebar
          items={projects}
          selectedId={selectedId}
          onSelect={handleSelectProject}
          onNewVideo={handleNewVideo}
          onDelete={handleDeleteProject}
          onRename={handleRenameProject}
          onDuplicate={handleDuplicateProject}
          onTogglePin={handleTogglePin}
        />
      }
      chatSlot={
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onStopGenerating={() => setIsGenerating(false)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableAgents={availableAgents}
          renderError={renderError}
          onAutoFixError={handleAutoFixError}
        />
      }
      previewSlot={
        <PreviewPanel
          videoUrl={videoUrl}
          status={renderStatus}
          progress={renderProgress}
          renderLog={renderLog}
          onReRender={handleReRender}
          onExportMaster={async (fmt, q) => {
            setRenderLog(`Exporting high-resolution ${q} ${fmt.toUpperCase()} video...`);
            const res = await exportMasterVideo(selectedId, q, code);
            if (res.success && res.video_url) {
              const a = document.createElement("a");
              a.href = res.video_url;
              a.download = res.filename || `manimforge_${q}.mp4`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            } else {
              setRenderError(res.message || "Export failed. Check scene code for errors.");
              setRenderStatus("error");
            }
          }}
        />
      }
      editorSlot={
        <CodeEditorPanel
          code={code}
          onChange={(val) => {
            setCode(val);
            saveProjectCode(selectedId, val);
          }}
          onRun={handleReRender}
          activeThemeName="Catppuccin Mocha"
        />
      }
    />
  );
}
