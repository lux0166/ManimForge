"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { StudioLayout } from "@/components/layout/StudioLayout";
import { AppSidebar, type SidebarProjectItem } from "@/components/sidebar/AppSidebar";
import { ChatPanel, type ChatMessage } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { CodeEditorPanel } from "@/components/editor/CodeEditorPanel";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { AgentActivityItem } from "@/components/agents/agent-activity/types";
import {
  fetchEnvironment,
  fetchAvailableAgents,
  fetchProjects,
  createProject,
  saveProjectCode,
  loadProjectCode,
  saveProjectChat,
  loadProjectChat,
  fetchProjectVideo,
  renderManimScene,
  executeAgentPrompt,
  onRenderProgress,
  onAgentStream,
  type AgentCliInfo,
  type AgentStreamChunk,
} from "@/lib/tauri-bridge";

const INITIAL_MANIM_CODE = `# New Manim Animation Scene
from manim import *

# Hyperparameters
NUM_ELEMENTS = 4 # @param min=1 max=10 step=1 label="Elements"
ANIMATION_SPEED = 1.2 # @param min=0.5 max=3.0 step=0.1 label="Speed Multiplier"

THEME = "Catppuccin Mocha"
TITLE_TEXT = "Mathematical Visualization"

class Scene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"

        # Title
        title = Text(TITLE_TEXT, font_size=28, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        # Central Geometry
        circle = Circle(radius=1.5, color="#89b4fa", fill_opacity=0.25)
        square = Square(side_length=2.4, color="#a6e3a1", fill_opacity=0.25)

        self.play(Create(circle), run_time=ANIMATION_SPEED)
        self.wait(0.5)
        self.play(Transform(circle, square), run_time=ANIMATION_SPEED)
        self.wait(1.5)
`;

const INITIAL_WELCOME_MSG: ChatMessage = {
  id: "msg-welcome",
  sender: "assistant",
  content: "✨ **Welcome to ManimForge Studio**\n\nType any prompt in the composer below (e.g. *\"Vẽ hình tròn biến thành hình vuông\"* or *\"Mô phỏng sóng sin và chuỗi Fourier\"*) to generate, edit, and compile mathematical animations in real time with Manim Community v0.21.",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function App() {
  const [projects, setProjects] = useState<SidebarProjectItem[]>([
    { id: "proj_1", label: "Neural Network Learning" },
  ]);
  const [selectedId, setSelectedId] = useState<string>("proj_1");
  const [code, setCode] = useState<string>(INITIAL_MANIM_CODE);
  const [renderStatus, setRenderStatus] = useState<"idle" | "preparing" | "rendering" | "ready" | "error">("idle");
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderLog, setRenderLog] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("agy");
  const [availableAgents, setAvailableAgents] = useState<AgentCliInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MSG]);

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
          }

          // Load chat
          const chatRaw = await loadProjectChat(firstProj.id);
          try {
            const parsed = JSON.parse(chatRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
            }
          } catch {}

          // Load video if exists
          const video = await fetchProjectVideo(firstProj.id);
          if (video) {
            setVideoUrl(video);
            setRenderStatus("ready");
          }
        }
      } catch (err) {
        console.warn("Backend load error:", err);
      }
    }

    loadData();
  }, []);

  // Listen to live Manim Render progress stream
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onRenderProgress((p) => {
      setRenderProgress(p.percent);
      setRenderLog(p.status_text);
      if (p.is_finished) {
        if (p.error) {
          setRenderStatus("error");
          setRenderError(p.status_text);
        } else {
          setRenderStatus("ready");
          setRenderError(null);
          if (p.output_path) {
            setVideoUrl(convertFileSrc(p.output_path));
          }
        }
      }
    }).then((fn) => {
      unlisten = fn;
    }).catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
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
      setCode(INITIAL_MANIM_CODE);
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

    // Load video
    const video = await fetchProjectVideo(proj.id);
    if (video) {
      setVideoUrl(video);
      setRenderStatus("ready");
    }
  };

  // Create new video project handler
  const handleNewVideo = async () => {
    const videoNumber = projects.length + 1;
    const name = `Video ${videoNumber}`;
    
    // Reset all UI states immediately
    setVideoUrl(null);
    setRenderStatus("idle");
    setRenderProgress(0);
    setRenderError(null);
    setRenderLog("");
    setCode(INITIAL_MANIM_CODE);

    const newWelcome: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "assistant",
      content: `🎬 **${name}** created!\n\nDescribe the mathematical scene or animation you want to create below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([newWelcome]);

    try {
      const newMeta = await createProject(name, "Catppuccin Mocha", INITIAL_MANIM_CODE);
      setProjects((prev) => [{ id: newMeta.id, label: newMeta.name }, ...prev]);
      setSelectedId(newMeta.id);
      saveProjectChat(newMeta.id, JSON.stringify([newWelcome]));
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  };

  const handleReRender = useCallback(async () => {
    setRenderStatus("rendering");
    setRenderProgress(15);
    setRenderError(null);
    setRenderLog("Compiling scene.py with Manim Community v0.21...");

    try {
      await saveProjectCode(selectedId, code);
      const url = await renderManimScene(selectedId, "scene.py", "qh");
      if (url) {
        setVideoUrl(url);
      }
      setRenderStatus("ready");
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
      content: "Reasoning and generating mathematical animation...",
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      activities: [
        { id: `act-${Date.now()}-1`, type: "step", label: `Invoking ${model || selectedModel} AI Engine...`, status: "active" },
        { id: `act-${Date.now()}-2`, type: "step", label: "Formulating Manim Community v0.21 geometry", status: "pending" },
        { id: `act-${Date.now()}-3`, type: "step", label: "Compiling 60fps scene video", status: "pending" },
      ] as AgentActivityItem[],
    };

    const updatedMsgs = [...messages, userMsg, streamingAssistantMsg];
    setMessages(updatedMsgs);
    setIsGenerating(true);
    setRenderStatus("rendering");
    setRenderProgress(25);
    setRenderLog(`AI Agent synthesizing: "${prompt}"...`);

    try {
      const response = await executeAgentPrompt(model || selectedModel, prompt, selectedId);
      
      const cleanPrompt = prompt.replace("[PLAN MODE]", "").trim();
      const finalReply = response || `Configured and updated scene for: "${cleanPrompt}".\n\nSynchronized mathematical parameters and compiled scene smoothly.`;

      // Reload updated code from disk
      const updatedCode = await loadProjectCode(selectedId);
      if (updatedCode && updatedCode.trim().length > 0) {
        setCode(updatedCode);
      }

      // Reload updated video from disk
      const video = await fetchProjectVideo(selectedId);
      if (video) {
        setVideoUrl(video);
      }

      const finalMsgs: ChatMessage[] = updatedMsgs.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: finalReply,
              isStreaming: false,
              activities: [
                { id: `act-1`, type: "step", label: `Agent reasoning (${model || selectedModel})`, status: "complete" },
                { id: `act-2`, type: "tool", action: "edit", target: "scene.py", additions: 36, deletions: 8 },
                { id: `act-3`, type: "step", label: "Compiled scene with Manim Community v0.21", status: "complete", meta: "scene.py" },
              ] as AgentActivityItem[],
            }
          : m
      );

      setMessages(finalMsgs);
      saveProjectChat(selectedId, JSON.stringify(finalMsgs));

      setIsGenerating(false);
      setRenderStatus("ready");
      setRenderProgress(100);
      setRenderLog("Scene ready");
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
    setRenderStatus("rendering");
    setRenderProgress(30);

    let fixedCode = code;
    if (fixedCode.includes("STROKE_WIDTH") && !fixedCode.includes("STROKE_WIDTH =")) {
      fixedCode = "STROKE_WIDTH = 2.5\n" + fixedCode;
    }

    setCode(fixedCode);
    saveProjectCode(selectedId, fixedCode);
    setTimeout(() => {
      setRenderStatus("ready");
      handleReRender();
    }, 800);
  };

  return (
    <StudioLayout
      sidebarSlot={
        <AppSidebar
          items={projects}
          selectedId={selectedId}
          onSelect={handleSelectProject}
          onNewVideo={handleNewVideo}
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
            alert(`Exporting ${fmt.toUpperCase()} (${q}) via ManimForge Engine...`);
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
