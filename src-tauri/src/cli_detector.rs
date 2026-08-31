use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentStatus {
    pub python_available: bool,
    pub python_version: Option<String>,
    pub manim_available: bool,
    pub manim_version: Option<String>,
    pub ffmpeg_available: bool,
    pub ffmpeg_version: Option<String>,
    pub latex_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCliInfo {
    pub id: String,
    pub name: String,
    pub command: String,
    pub installed: bool,
    pub path: Option<String>,
    pub description: String,
}

pub fn check_environment() -> EnvironmentStatus {
    // Check python
    let (py_avail, py_ver) = match Command::new("python").arg("--version").output() {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let ver = if s.is_empty() {
                String::from_utf8_lossy(&out.stderr).trim().to_string()
            } else {
                s
            };
            (true, Some(ver))
        }
        _ => (false, None),
    };

    // Check manim
    let (manim_avail, manim_ver) = match Command::new("python").args(["-m", "manim", "--version"]).output() {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            (true, Some(s))
        }
        _ => (false, None),
    };

    // Check ffmpeg
    let (ffmpeg_avail, ffmpeg_ver) = match Command::new("ffmpeg").arg("-version").output() {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout);
            let first_line = s.lines().next().unwrap_or("FFmpeg installed").to_string();
            (true, Some(first_line))
        }
        _ => (false, None),
    };

    // Check latex
    let latex_avail = match Command::new("latex").arg("--version").output() {
        Ok(out) => out.status.success(),
        _ => false,
    };

    EnvironmentStatus {
        python_available: py_avail,
        python_version: py_ver,
        manim_available: manim_avail,
        manim_version: manim_ver,
        ffmpeg_available: ffmpeg_avail,
        ffmpeg_version: ffmpeg_ver,
        latex_available: latex_avail,
    }
}

pub fn detect_installed_agents() -> Vec<AgentCliInfo> {
    let cli_registry = [
        ("agy", "Antigravity CLI", "agy", "DeepMind Autonomous Coding Agent"),
        ("opencode", "OpenCode CLI", "opencode", "Open-source terminal coding agent"),
        ("cline", "Cline CLI", "cline", "Autonomous CLI developer"),
        ("claude", "Claude Code CLI", "claude", "Anthropic Claude terminal assistant"),
        ("codex", "Codex CLI", "codex", "OpenAI Codex command line agent"),
        ("cursor", "Cursor CLI", "cursor", "Cursor terminal agent"),
        ("ollama", "Ollama CLI", "ollama", "Local offline LLM runner"),
    ];

    let mut agents = Vec::new();
    for (id, name, cmd, desc) in cli_registry {
        let p = check_cli_exists(cmd);
        let is_inst = p.is_some();
        agents.push(AgentCliInfo {
            id: id.to_string(),
            name: name.to_string(),
            command: cmd.to_string(),
            installed: is_inst,
            path: p,
            description: desc.to_string(),
        });
    }

    agents
}

fn check_cli_exists(name: &str) -> Option<String> {
    #[cfg(target_os = "windows")]
    let cmd = "where.exe";
    #[cfg(not(target_os = "windows"))]
    let cmd = "which";

    match Command::new(cmd).arg(name).output() {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout).trim().lines().next().map(|l| l.to_string());
            s
        }
        _ => None,
    }
}
