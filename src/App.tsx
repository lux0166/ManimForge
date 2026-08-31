"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Terminal } from "lucide-react";
import { StudioLayout } from "@/components/layout/StudioLayout";
import { AppSidebar, type SidebarProjectItem } from "@/components/sidebar/AppSidebar";
import { ChatPanel, type ChatMessage } from "@/components/chat/ChatPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { CodeEditorPanel } from "@/components/editor/CodeEditorPanel";
import type { PromptModel } from "@/components/agents/prompt-input";
import {
  fetchEnvironment,
  fetchAvailableAgents,
  fetchProjects,
  createProject,
  saveProjectCode,
  loadProjectCode,
  renderManimScene,
  onRenderProgress,
  type AgentCliInfo,
} from "@/lib/tauri-bridge";

const INITIAL_MANIM_CODE = `# Neural Network: Forward Pass & Backprop
import manim as m
import numpy as np

# Tokens & Parameters
THEME = "Catppuccin Mocha"
TITLE_TEXT = "Neural Network: Forward Pass & Backprop"
INPUT_1_VAL = 0.8
INPUT_2_VAL = 0.5
INIT_W1 = 0.4
INIT_W2 = 0.7
TARGET_VAL = 1.0
STROKE_WIDTH = 2.5

# Color Palette
COLOR_INPUT = "#89b4fa"
COLOR_WEIGHT = "#f9e2af"
COLOR_OUTPUT = "#a6e3a1"
COLOR_TARGET = "#f38ba8"
COLOR_TEXT = "#cdd6f4"

class NeuralNetworkLearning(m.Scene):
    def construct(self):
        # Background
        self.camera.background_color = "#11111b"

        # Title
        title = m.Text(TITLE_TEXT, font_size=28, color=COLOR_TEXT)
        title.to_edge(m.UP, buff=0.6)
        self.play(m.Write(title), run_time=1)

        # Input Nodes
        node_x1 = m.Circle(radius=0.4, color=COLOR_INPUT, fill_opacity=0.2).shift(m.LEFT * 3 + m.UP * 1.2)
        node_x2 = m.Circle(radius=0.4, color=COLOR_INPUT, fill_opacity=0.2).shift(m.LEFT * 3 + m.DOWN * 1.2)
        label_x1 = m.MathTex(r"x_1 = 0.8", font_size=24, color=COLOR_TEXT).next_to(node_x1, m.LEFT)
        label_x2 = m.MathTex(r"x_2 = 0.5", font_size=24, color=COLOR_TEXT).next_to(node_x2, m.LEFT)

        # Output Node
        node_y = m.Circle(radius=0.45, color=COLOR_OUTPUT, fill_opacity=0.2).shift(m.RIGHT * 2)
        label_y_name = m.Text("Output", font_size=18, color=COLOR_TEXT).next_to(node_y, m.UP)
        label_y_val = m.MathTex(r"\hat{y} = 0.67", font_size=22, color=COLOR_OUTPUT).move_to(node_y)

        # Connections (Weights)
        line_1 = m.Line(node_x1.get_right(), node_y.get_left(), color=COLOR_WEIGHT, stroke_width=STROKE_WIDTH)
        line_2 = m.Line(node_x2.get_right(), node_y.get_left(), color=COLOR_WEIGHT, stroke_width=STROKE_WIDTH)
        w1_label = m.MathTex(r"w_1 = 0.4", font_size=18, color=COLOR_WEIGHT).next_to(line_1.get_center(), m.UP * 0.5)
        w2_label = m.MathTex(r"w_2 = 0.7", font_size=18, color=COLOR_WEIGHT).next_to(line_2.get_center(), m.DOWN * 0.5)

        # Animations
        self.play(
            m.Create(node_x1), m.Create(node_x2),
            m.Write(label_x1), m.Write(label_x2),
            run_time=1.2
        )
        self.play(
            m.Create(line_1), m.Create(line_2),
            m.Write(w1_label), m.Write(w2_label),
            run_time=1.2
        )
        self.play(
            m.Create(node_y), m.Write(label_y_name), m.Write(label_y_val),
            run_time=1.2
        )
        self.wait(2)
`;

export default function App() {
  const [projects, setProjects] = useState<SidebarProjectItem[]>([
    { id: "proj_1", label: "Neural Network Learning" },
    { id: "proj_2", label: "Fourier Epicycles" },
    { id: "proj_3", label: "Matrix Eigenvectors" },
  ]);
  const [selectedId, setSelectedId] = useState<string>("proj_1");
  const [code, setCode] = useState<string>(INITIAL_MANIM_CODE);
  const [renderStatus, setRenderStatus] = useState<"idle" | "preparing" | "rendering" | "ready" | "error">("ready");
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderLog, setRenderLog] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("agy");
  const [availableAgents, setAvailableAgents] = useState<AgentCliInfo[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "user",
      content: "Show a tiny neural network making one prediction and then learning from its error.",
      timestamp: "11:52 AM",
    },
    {
      id: "msg-2",
      sender: "assistant",
      content: "I have created a scene illustrating a simple 2-input, 1-output neural network performing a forward pass, calculating error against a target output, and updating its weights via backpropagation to reduce error.\\n\\nI styled this video with editable parameters in the Variables tab.",
      timestamp: "11:52 AM",
      activities: [
        { id: "act-1", type: "trace", kind: "thinking", label: "Thinking", detail: "Formulating neural network geometry" },
        { id: "act-2", type: "tool", action: "write", target: "scene.py" },
        { id: "act-3", type: "trace", kind: "run", label: "Compiled with Manim Community v0.21", detail: "manim -qh scene.py NeuralNetworkLearning" },
      ],
    },
  ]);

  useEffect(() => {
    async function loadData() {
      const [env, agents, projList] = await Promise.all([
        fetchEnvironment(),
        fetchAvailableAgents(),
        fetchProjects(),
      ]);

      setAvailableAgents(agents);

      if (projList.length > 0) {
        setProjects(projList.map((p) => ({ id: p.id, label: p.name, prompt: p.prompt ?? undefined })));
        setSelectedId(projList[0].id);
      }
    }

    loadData();
  }, []);

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
          if (p.output_path) setVideoUrl(p.output_path);
        }
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleReRender = useCallback(async () => {
    setRenderStatus("rendering");
    setRenderProgress(15);
    setRenderError(null);
    setRenderLog("Compiling scene.py with Manim Community v0.21...");

    try {
      await saveProjectCode(selectedId, code);
      const url = await renderManimScene(selectedId, "scene.py", "qh");
      setVideoUrl(url);
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

  const handleSendMessage = (prompt: string, model?: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setRenderStatus("preparing");

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        content: `Updated scene for: "${prompt}".\n\nConfigured parameter tokens and compiled scene smoothly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        activities: [
          { id: `act-${Date.now()}-1`, type: "trace", kind: "thinking", label: "Agent reasoning", detail: prompt },
          { id: `act-${Date.now()}-2`, type: "tool", action: "edit", target: "scene.py" },
          { id: `act-${Date.now()}-3`, type: "trace", kind: "run", label: "Rendered Scene", detail: "manim -qh scene.py" },
        ],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
      setRenderStatus("ready");
      handleReRender();
    }, 1200);
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
          onSelect={(res) => setSelectedId(res.id)}
          onNewVideo={() => {
            const newId = `proj_${Date.now()}`;
            setProjects((prev) => [{ id: newId, label: `Video ${prev.length + 1}` }, ...prev]);
            setSelectedId(newId);
          }}
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
