use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStreamChunk {
    pub chunk_type: String, // "thought" | "text" | "tool" | "done" | "error"
    pub content: String,
}

pub async fn run_agent_prompt_stream(
    app: AppHandle,
    agent_id: String,
    prompt: String,
    project_dir: PathBuf,
) -> Result<String, String> {
    let mut cmd = match agent_id.as_str() {
        "claude" => {
            let mut c = Command::new("claude");
            c.arg("-p").arg(&prompt);
            c
        }
        "opencode" => {
            let mut c = Command::new("opencode");
            c.arg("run").arg(&prompt);
            c
        }
        "cline" => {
            let mut c = Command::new("cline");
            c.arg("-p").arg(&prompt);
            c
        }
        "cursor" => {
            let mut c = Command::new("cursor");
            c.arg("agent").arg(&prompt);
            c
        }
        "codex" => {
            let mut c = Command::new("codex");
            c.arg(&prompt);
            c
        }
        "ollama" => {
            let mut c = Command::new("ollama");
            c.arg("run").arg("qwen2.5-coder").arg(&prompt);
            c
        }
        "agy" | _ => {
            let mut c = Command::new("agy");
            c.arg("--goal").arg(&prompt);
            c
        }
    };

    cmd.current_dir(&project_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("CLI '{}' is not installed or failed to start: {}", agent_id, e))?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let mut reader = BufReader::new(stdout).lines();

    let mut full_response = String::new();
    while let Ok(Some(line)) = reader.next_line().await {
        full_response.push_str(&line);
        full_response.push('\n');

        let chunk = AgentStreamChunk {
            chunk_type: if line.starts_with("Thinking:") || line.starts_with("[THINK]") {
                "thought".to_string()
            } else if line.starts_with("Tool:") || line.starts_with("[TOOL]") {
                "tool".to_string()
            } else {
                "text".to_string()
            },
            content: line,
        };

        let _ = app.emit("agent://stream", chunk);
    }

    let _ = child.wait().await;
    let _ = app.emit(
        "agent://stream",
        AgentStreamChunk {
            chunk_type: "done".to_string(),
            content: format!("CLI '{}' finished execution", agent_id),
        },
    );

    Ok(full_response)
}
