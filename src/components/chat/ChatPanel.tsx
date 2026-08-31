"use client";

import React, { useState, useMemo } from "react";
import {
  Bot,
  Copy,
  Check,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { MessageScroller } from "@/components/agents/message-scroller";
import { ThinkingState } from "@/components/agents/ThinkingState";
import type { AgentActivityItem } from "@/components/agents/agent-activity/types";
import type { AgentCliInfo } from "@/lib/tauri-bridge";
import { ProximitySidebar, type ProximitySection } from "@/components/navigation/ProximitySidebar";
import { PromptBar } from "./PromptBar";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  activities?: AgentActivityItem[];
  timestamp: string;
  isStreaming?: boolean;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string, model?: string) => void;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  availableAgents?: AgentCliInfo[];
  renderError?: string | null;
  onAutoFixError?: (errorText: string) => void;
  className?: string;
}

const DEFAULT_CLI_AGENTS: AgentCliInfo[] = [
  { id: "agy", name: "Antigravity CLI", command: "agy", installed: true, path: "agy", description: "DeepMind Autonomous Coding Agent" },
  { id: "opencode", name: "OpenCode CLI", command: "opencode", installed: true, path: "opencode", description: "Open-source terminal coding agent" },
  { id: "cline", name: "Cline CLI", command: "cline", installed: true, path: "cline", description: "Autonomous CLI developer" },
  { id: "claude", name: "Claude Code CLI", command: "claude", installed: false, path: null, description: "Anthropic Claude terminal assistant" },
  { id: "cursor", name: "Cursor CLI", command: "cursor", installed: false, path: null, description: "Cursor terminal agent" },
  { id: "codex", name: "Codex CLI", command: "codex", installed: false, path: null, description: "OpenAI Codex command line agent" },
  { id: "ollama", name: "Ollama CLI", command: "ollama", installed: false, path: null, description: "Local offline LLM runner" },
];

export function ChatPanel({
  messages,
  onSendMessage,
  isGenerating = false,
  onStopGenerating,
  selectedModel = "agy",
  onModelChange,
  availableAgents = DEFAULT_CLI_AGENTS,
  renderError,
  onAutoFixError,
  className,
}: ChatPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const agentsList = availableAgents && availableAgents.length > 0 ? availableAgents : DEFAULT_CLI_AGENTS;
  const activeAgent = agentsList.find((a) => a.id === selectedModel) || agentsList[0];

  const chatSections: ProximitySection[] = useMemo(() => {
    return messages.map((m, idx) => ({
      id: m.id,
      label: m.sender === "user" ? `Prompt: ${m.content.slice(0, 35)}...` : `Turn ${idx + 1}: Agent Solution`,
      kind: m.sender === "user" ? "title" : "section",
    }));
  }, [messages]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div className={cn("relative flex h-full w-full max-w-full flex-col bg-black border-r border-[#27272a] overflow-hidden text-white", className)}>
      {/* Exact h-11 Header (44px) */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#27272a] px-3.5 bg-[#09090b] z-20">
        <div className="flex items-center gap-2">
          <Bot className="size-3.5 text-white" />
          <span className="text-xs font-semibold text-white">CLI Agent Assistant</span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#a1a1aa] bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a]">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: activeAgent.installed ? "#34d399" : "#71717a" }} />
          <span>{activeAgent.command}</span>
        </div>
      </div>

      {/* Main Conversation Stream with Proximity Timeline */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <MessageScroller
          followOutput={true}
          smooth={true}
          className="h-full w-full overflow-hidden"
          viewportClassName="p-4 pr-10 space-y-6 max-w-3xl mx-auto overflow-x-hidden overflow-y-auto"
        >
          {messages.map((msg) => (
            <div key={msg.id} id={msg.id} className="w-full min-w-0 scroll-mt-6 overflow-hidden">
              {msg.sender === "user" ? (
                <div className="flex justify-end mb-2 min-w-0">
                  <div className="max-w-[85%] rounded-2xl bg-[#18181b] border border-[#27272a] px-4 py-2.5 text-xs text-white leading-relaxed shadow-sm break-all [overflow-wrap:anywhere] overflow-hidden">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pl-1 max-w-[95%] min-w-0">
                  {msg.activities && msg.activities.length > 0 && (
                    <div className="rounded-xl bg-[#121214] border border-[#27272a] p-3 shadow-sm min-w-0 overflow-hidden">
                      <ThinkingState
                        variant="Steps"
                        items={msg.activities}
                        isStreaming={msg.isStreaming}
                        duration={2.4}
                        defaultOpen={true}
                      />
                    </div>
                  )}

                  <div className="text-xs leading-relaxed text-white whitespace-pre-wrap font-sans pl-0.5 break-all [overflow-wrap:anywhere] overflow-hidden">
                    {msg.content}
                  </div>

                  <div className="flex items-center gap-2 pt-1 pl-0.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#71717a] hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="size-3 text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Auto-Fix Error Banner */}
          {renderError && onAutoFixError && (
            <div className="rounded-xl bg-[#121214] border border-red-500/30 p-3 space-y-2 min-w-0 overflow-hidden">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-3.5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-semibold text-red-400">Manim Render Error</div>
                  <pre className="mt-1 font-mono text-[10px] text-[#a1a1aa] bg-black p-2 rounded border border-[#27272a] max-h-20 overflow-x-auto break-all">
                    {renderError}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onAutoFixError(renderError)}
                  className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-black hover:bg-[#e4e4e7] active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Wrench className="size-3" />
                  <span>1-Click Auto-Fix</span>
                </button>
              </div>
            </div>
          )}
        </MessageScroller>

        {/* Proximity Minimap Sidebar for Chat Timeline Navigation */}
        {chatSections.length > 1 && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 pointer-events-auto z-10 opacity-70 hover:opacity-100 transition-opacity">
            <ProximitySidebar
              sections={chatSections}
              side="right"
              className="py-4"
            />
          </div>
        )}
      </div>

      {/* Real PromptBar Composer */}
      <div className="shrink-0 p-3 bg-black border-t border-[#27272a] relative z-30 w-full">
        <div className="max-w-3xl mx-auto w-full">
          <PromptBar
            variant="Rounded"
            placeholder={`Ask ${activeAgent.command} CLI to animate or edit Manim code...`}
            onSend={(text, modelId, planMode) => onSendMessage(planMode ? `[PLAN MODE] ${text}` : text, modelId || selectedModel)}
            isGenerating={isGenerating}
            onStopGenerating={onStopGenerating}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            availableAgents={agentsList}
          />
        </div>
      </div>
    </div>
  );
}
