"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

const SERVER_URL = "http://127.0.0.1:8765";

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

export interface AiChatResult {
  success: boolean;
  code: string;
  explanation: string;
  video_url: string;
  message?: string;
}

export async function fetchEnvironment(): Promise<EnvironmentStatus> {
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

export async function fetchAvailableAgents(): Promise<AgentCliInfo[]> {
  try {
    const res = await fetch(`${SERVER_URL}/api/agents`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn("fetchAvailableAgents error:", e);
  }
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

export async function fetchProjects(): Promise<ProjectMetadata[]> {
  try {
    const res = await fetch(`${SERVER_URL}/api/projects`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {
    console.warn("fetchProjects fallback:", e);
  }
  const fallbackId = `proj_${Date.now()}`;
  return [{ id: fallbackId, name: "Video 1", created_at: new Date().toISOString(), active_theme: "Catppuccin Mocha" }];
}

export async function exportMasterVideo(projectId: string, quality: string, code: string): Promise<{ success: boolean; video_url?: string; filename?: string; message?: string }> {
  try {
    const res = await fetch(`${SERVER_URL}/api/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, quality, code }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: String(err) };
  }
}

export async function createProject(name: string, theme: string, initialCode: string): Promise<ProjectMetadata> {
  const id = `proj_${Date.now()}`;
  await saveProjectCode(id, initialCode);
  return {
    id,
    name,
    created_at: new Date().toISOString(),
    active_theme: theme,
    prompt: null,
    last_rendered_video: null,
  };
}

export async function saveProjectCode(projectId: string, code: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/save_code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, code }),
    });
  } catch (e) {
    console.warn("save_code error:", e);
  }
}

export async function loadProjectCode(projectId: string): Promise<string> {
  try {
    const res = await fetch(`${SERVER_URL}/api/load_code?project_id=${projectId}`);
    const data = await res.json();
    return data.code || "";
  } catch (e) {
    console.warn("load_code error:", e);
    return "";
  }
}

export async function saveProjectChat(projectId: string, chatJson: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/api/save_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, chat: JSON.parse(chatJson) }),
    });
  } catch (e) {
    console.warn("save_chat error:", e);
  }
}

export async function loadProjectChat(projectId: string): Promise<string> {
  try {
    const res = await fetch(`${SERVER_URL}/api/load_chat?project_id=${projectId}`);
    const data = await res.json();
    return JSON.stringify(data);
  } catch {
    return "[]";
  }
}

export async function fetchProjectVideo(projectId: string): Promise<string | null> {
  return null;
}

export async function fetchSceneParameters(code: string): Promise<SceneParameter[]> {
  const params: SceneParameter[] = [];
  const re = /([A-Z0-9_]+)\s*=\s*([0-9.]+)\s*#\s*@param(?:\s+min=([0-9.]+))?(?:\s+max=([0-9.]+))?(?:\s+step=([0-9.]+))?(?:\s+label="([^"]+)")?/g;
  let match;
  while ((match = re.exec(code)) !== null) {
    const name = match[1];
    const value = parseFloat(match[2]);
    const min = match[3] ? parseFloat(match[3]) : 0;
    const max = match[4] ? parseFloat(match[4]) : 10;
    const step = match[5] ? parseFloat(match[5]) : 0.1;
    const label = match[6] || name;
    params.push({ name, value, min, max, step, label });
  }
  return params;
}

export async function renderManimScene(
  projectId: string,
  code: string,
  quality: string = "ql"
): Promise<string> {
  try {
    const res = await fetch(`${SERVER_URL}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, code, quality }),
    });
    const data = await res.json();
    if (data.video_url) {
      return data.video_url;
    }
    throw new Error(data.message || "Failed to render");
  } catch (e) {
    console.warn("renderManimScene error:", e);
    throw e;
  }
}

export async function executeAgentPrompt(
  agentId: string,
  prompt: string,
  projectId: string,
  currentCode: string = ""
): Promise<AiChatResult> {
  try {
    const res = await fetch(`${SERVER_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: agentId,
        project_id: projectId,
        current_code: currentCode,
      }),
    });
    const data: AiChatResult = await res.json();
    return data;
  } catch (err) {
    console.error("executeAgentPrompt error:", err);
    throw err;
  }
}

export async function onRenderProgress(callback: (progress: RenderProgress) => void): Promise<UnlistenFn> {
  return () => {};
}

export async function onAgentStream(callback: (chunk: AgentStreamChunk) => void): Promise<UnlistenFn> {
  return () => {};
}

export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/delete_project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const data = await res.json();
    return data.status === "deleted";
  } catch (e) {
    console.warn("deleteProject error:", e);
    return false;
  }
}

export async function renameProject(projectId: string, newName: string): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/rename_project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, new_name: newName }),
    });
    const data = await res.json();
    return data.status === "renamed";
  } catch (e) {
    console.warn("renameProject error:", e);
    return false;
  }
}

export async function duplicateProject(projectId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_URL}/api/duplicate_project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    const data = await res.json();
    return data.new_project_id || null;
  } catch (e) {
    console.warn("duplicateProject error:", e);
    return null;
  }
}

export async function mergeScenesMaster(projectId: string, code: string): Promise<{ success: boolean; video_url?: string; message?: string }> {
  try {
    const res = await fetch(`${SERVER_URL}/api/merge_scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, code }),
    });
    return await res.json();
  } catch (e) {
    console.warn("mergeScenes error:", e);
    return { success: false, message: String(e) };
  }
}
