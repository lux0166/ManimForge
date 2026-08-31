"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { convertFileSrc } from "@tauri-apps/api/core";

export interface EnvironmentStatus {
  python_available: boolean;
  python_version: string | null;
  manim_available: boolean;
  manim_version: string | null;
  ffmpeg_available: boolean;
  ffmpeg_version: string | null;
  latex_available: boolean;
}

export interface AgentCliInfo {
  id: string;
  name: string;
  command: string;
  installed: boolean;
  path: string | null;
  description: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  created_at: string;
  active_theme: string;
  prompt?: string | null;
  last_rendered_video?: string | null;
}

export interface RenderProgress {
  percent: number;
  status_text: string;
  is_finished: boolean;
  error?: string | null;
  output_path?: string | null;
}

export interface AgentStreamChunk {
  chunk_type: "thought" | "text" | "tool" | "done" | "error";
  content: string;
  tool_meta?: {
    action: string;
    target: string;
    additions?: number;
    deletions?: number;
  };
}

export interface SceneParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
}

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as any).__TAURI_INTERNALS__);
};

export async function fetchEnvironment(): Promise<EnvironmentStatus> {
  if (!isTauriEnvironment()) {
    return {
      python_available: true,
      python_version: "Python 3.14.0",
      manim_available: true,
      manim_version: "Manim Community v0.21.0",
      ffmpeg_available: true,
      ffmpeg_version: "ffmpeg version 8.1.1",
      latex_available: true,
    };
  }
  return await invoke<EnvironmentStatus>("get_environment_info");
}

export async function fetchAvailableAgents(): Promise<AgentCliInfo[]> {
  if (!isTauriEnvironment()) {
    return [
      { id: "agy", name: "Antigravity CLI", command: "agy", installed: true, path: "agy", description: "DeepMind Autonomous Coding Agent" },
      { id: "opencode", name: "OpenCode CLI", command: "opencode", installed: true, path: "opencode", description: "Open-source terminal coding agent" },
      { id: "cline", name: "Cline CLI", command: "cline", installed: true, path: "cline", description: "Autonomous CLI developer" },
      { id: "claude", name: "Claude Code CLI", command: "claude", installed: false, path: null, description: "Anthropic Claude terminal assistant" },
      { id: "cursor", name: "Cursor CLI", command: "cursor", installed: false, path: null, description: "Cursor terminal agent" },
      { id: "codex", name: "Codex CLI", command: "codex", installed: false, path: null, description: "OpenAI Codex command line agent" },
      { id: "ollama", name: "Ollama CLI", command: "ollama", installed: false, path: null, description: "Local offline LLM runner" },
    ];
  }
  return await invoke<AgentCliInfo[]>("get_available_agents");
}

export async function fetchProjects(): Promise<ProjectMetadata[]> {
  if (!isTauriEnvironment()) {
    return [
      { id: "proj_1", name: "Neural Network Learning", created_at: new Date().toISOString(), active_theme: "Catppuccin Mocha" },
    ];
  }
  return await invoke<ProjectMetadata[]>("list_projects");
}

export async function createProject(name: string, theme: string, initialCode: string): Promise<ProjectMetadata> {
  if (!isTauriEnvironment()) {
    return {
      id: `proj_${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      active_theme: theme,
      prompt: null,
      last_rendered_video: null,
    };
  }
  return await invoke<ProjectMetadata>("create_project", { name, theme, initialCode });
}

export async function saveProjectCode(projectId: string, code: string): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke("save_code", { projectId, code });
  }
}

export async function loadProjectCode(projectId: string): Promise<string> {
  if (!isTauriEnvironment()) {
    return "";
  }
  return await invoke<string>("load_code", { projectId });
}

export async function saveProjectChat(projectId: string, chatJson: string): Promise<void> {
  if (isTauriEnvironment()) {
    await invoke("save_chat", { projectId, chatJson });
  }
}

export async function loadProjectChat(projectId: string): Promise<string> {
  if (!isTauriEnvironment()) {
    return "[]";
  }
  return await invoke<string>("load_chat", { projectId });
}

export async function fetchProjectVideo(projectId: string): Promise<string | null> {
  if (!isTauriEnvironment()) {
    return null;
  }
  const rawPath = await invoke<string | null>("get_project_video", { projectId });
  if (rawPath) {
    return convertFileSrc(rawPath);
  }
  return null;
}

export async function fetchSceneParameters(code: string): Promise<SceneParameter[]> {
  if (!isTauriEnvironment()) {
    return [
      { name: "NUM_LAYERS", value: 4, min: 2, max: 8, step: 1, label: "Layers" },
      { name: "LEARNING_RATE", value: 0.05, min: 0.01, max: 0.5, step: 0.01, label: "Learning Rate" },
      { name: "ANIMATION_SPEED", value: 1.0, min: 0.5, max: 3.0, step: 0.5, label: "Speed Multiplier" },
    ];
  }
  return await invoke<SceneParameter[]>("get_scene_parameters", { code });
}

export async function renderManimScene(
  projectId: string,
  sceneFile: string = "scene.py",
  quality: "ql" | "qm" | "qh" | "qk" = "ql"
): Promise<string> {
  if (!isTauriEnvironment()) {
    return "";
  }
  const fullPath = await invoke<string>("render_manim", { projectId, sceneFile, quality });
  return convertFileSrc(fullPath);
}

export async function executeAgentPrompt(
  agentId: string,
  prompt: string,
  projectId: string
): Promise<string> {
  if (!isTauriEnvironment()) {
    return `Configured scene for: "${prompt}". Verified math coordinates.`;
  }
  return await invoke<string>("execute_agent_prompt", { agentId, prompt, projectId });
}

export async function onRenderProgress(callback: (progress: RenderProgress) => void): Promise<UnlistenFn> {
  if (!isTauriEnvironment()) {
    return () => {};
  }
  return await listen<RenderProgress>("manim://progress", (event) => {
    callback(event.payload);
  });
}

export async function onAgentStream(callback: (chunk: AgentStreamChunk) => void): Promise<UnlistenFn> {
  if (!isTauriEnvironment()) {
    return () => {};
  }
  return await listen<AgentStreamChunk>("agent://stream", (event) => {
    callback(event.payload);
  });
}
