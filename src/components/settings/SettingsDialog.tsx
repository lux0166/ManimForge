"use client";

import React, { useState, useEffect } from "react";
import { Settings, Key, Cpu, Globe, Check, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettingsData {
  apiKey: string;
  defaultModel: string;
  customEndpoint: string;
}

export const DEFAULT_SETTINGS: SettingsData = {
  apiKey: "",
  defaultModel: "deepseek/deepseek-chat",
  customEndpoint: "",
};

export function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem("manimforge_settings");
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(data: SettingsData): void {
  try {
    localStorage.setItem("manimforge_settings", JSON.stringify(data));
  } catch {}
}

export interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: SettingsData) => void;
}

export const SettingsDialog = React.memo(function SettingsDialog({
  isOpen,
  onClose,
  onSave,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSettings(settings);
    if (onSave) onSave(settings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    if (onSave) onSave(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-xl border border-[#27272a] bg-[#121214] p-5 shadow-2xl text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#27272a] text-[#89b4fa]">
              <Settings className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">AI Studio Settings</h2>
              <p className="text-[11px] text-zinc-400">Configure API Keys & LLM Providers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-[#27272a] hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 py-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Key className="size-3.5 text-[#89b4fa]" />
              <span>OpenRouter / OpenAI API Key</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                placeholder="sk-or-v1-... (Leave blank for default server key)"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#89b4fa] focus:outline-none pr-9 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Stored securely in your local browser storage.
            </p>
          </div>

          {/* Default Model */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Cpu className="size-3.5 text-[#fab387]" />
              <span>Default AI Model</span>
            </label>
            <select
              value={settings.defaultModel}
              onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
              className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-white focus:border-[#89b4fa] focus:outline-none"
            >
              <option value="deepseek/deepseek-chat">DeepSeek V3 / Chat (Recommended)</option>
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Fast & Accurate)</option>
              <option value="qwen/qwen-2.5-coder-32b-instruct">Qwen 2.5 Coder 32B (Math Expert)</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Elite Quality)</option>
            </select>
          </div>

          {/* Custom Endpoint URL */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Globe className="size-3.5 text-[#a6e3a1]" />
              <span>Custom Endpoint (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              value={settings.customEndpoint}
              onChange={(e) => setSettings({ ...settings, customEndpoint: e.target.value })}
              className="w-full rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-[#89b4fa] focus:outline-none font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              Use for local Ollama, vLLM, or custom OpenAI-compatible proxies.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[#27272a] pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="size-3" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#27272a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-all shadow-md",
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-black hover:bg-zinc-200"
              )}
            >
              {saved ? (
                <>
                  <Check className="size-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
