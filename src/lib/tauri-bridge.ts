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
      { id: "agy", name: "Antigravity CLI", command: "agy", installed: true, path: "C:\\Users\\Tran Huy\\AppData\\Local\\agy\\bin\\agy.EXE", description: "DeepMind Autonomous Coding Agent" },
      { id: "opencode", name: "OpenCode CLI", command: "opencode", installed: true, path: "C:\\Users\\Tran Huy\\AppData\\Roaming\\npm\\opencode.EXE", description: "Open-source terminal coding agent" },
      { id: "cline", name: "Cline CLI", command: "cline", installed: true, path: "C:\\Users\\Tran Huy\\AppData\\Roaming\\npm\\cline.CMD", description: "Autonomous CLI developer" },
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
      { id: "proj_1", name: "Video 2", created_at: new Date().toISOString(), active_theme: "Catppuccin Mocha", prompt: "Show a tiny neural network making one prediction and then learning from its error." },
      { id: "proj_2", name: "Video 1", created_at: new Date().toISOString(), active_theme: "Catppuccin Mocha", prompt: "Fourier Transform decomposition" },
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

export async function renderManimScene(
  projectId: string,
  sceneFile: string = "scene.py",
  quality: "ql" | "qm" | "qh" | "qk" = "ql"
): Promise<string> {
  if (!isTauriEnvironment()) {
    return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }
  const fullPath = await invoke<string>("render_manim", { projectId, sceneFile, quality });
  return convertFileSrc(fullPath);
}

export async function onRenderProgress(callback: (progress: RenderProgress) => void): Promise<UnlistenFn> {
  if (!isTauriEnvironment()) {
    return () => {};
  }
  return await listen<RenderProgress>("manim://progress", (event) => {
    callback(event.payload);
  });
}
