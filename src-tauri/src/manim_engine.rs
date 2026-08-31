use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderProgress {
    pub percent: u32,
    pub status_text: String,
    pub is_finished: bool,
    pub error: Option<String>,
    pub output_path: Option<String>,
}

pub async fn render_scene_async(
    app: AppHandle,
    project_dir: PathBuf,
    scene_file: String,
    quality: String, // "ql" (480p), "qm" (720p), "qh" (1080p), "qk" (4k)
) -> Result<String, String> {
    let quality_flag = format!("-{}", quality);
    let scene_path = project_dir.join(&scene_file);

    if !scene_path.exists() {
        return Err(format!("Scene file {} not found", scene_path.display()));
    }

    let renders_dir = project_dir.join("media");
    std::fs::create_dir_all(&renders_dir).ok();

    let mut cmd = Command::new("python");
    cmd.current_dir(&project_dir)
        .args([
            "-m",
            "manim",
            &quality_flag,
            &scene_file,
            "--media_dir",
            "media",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn Manim: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let progress_re = Regex::new(r"(\d+)%").unwrap();
    let progress_re_clone = progress_re.clone();
    let app_handle = app.clone();

    // Read stderr and stdout concurrently
    tokio::spawn(async move {
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            if let Some(caps) = progress_re_clone.captures(&line) {
                if let Some(pct) = caps.get(1).and_then(|m| m.as_str().parse::<u32>().ok()) {
                    let _ = app_handle.emit(
                        "manim://progress",
                        RenderProgress {
                            percent: pct,
                            status_text: line.clone(),
                            is_finished: false,
                            error: None,
                            output_path: None,
                        },
                    );
                }
            }
        }
    });

    let mut last_log = String::new();
    while let Ok(Some(line)) = stdout_reader.next_line().await {
        last_log = line.clone();
        if let Some(caps) = progress_re.captures(&line) {
            if let Some(pct) = caps.get(1).and_then(|m| m.as_str().parse::<u32>().ok()) {
                let _ = app.emit(
                    "manim://progress",
                    RenderProgress {
                        percent: pct,
                        status_text: line,
                        is_finished: false,
                        error: None,
                        output_path: None,
                    },
                );
            }
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;

    if status.success() {
        // Find newest mp4 in media/videos/
        let mut mp4_path: Option<PathBuf> = None;
        let videos_dir = project_dir.join("media").join("videos");
        if let Ok(entries) = std::fs::read_dir(videos_dir) {
            for entry in entries.flatten() {
                if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                    for sub in sub_entries.flatten() {
                        if let Ok(deep_entries) = std::fs::read_dir(sub.path()) {
                            for f in deep_entries.flatten() {
                                if f.path().extension().and_then(|s| s.to_str()) == Some("mp4") {
                                    mp4_path = Some(f.path());
                                }
                            }
                        }
                    }
                }
            }
        }

        let out_str = mp4_path
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "media/renders/output.mp4".to_string());

        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 100,
                status_text: "Render Complete".to_string(),
                is_finished: true,
                error: None,
                output_path: Some(out_str.clone()),
            },
        );

        Ok(out_str)
    } else {
        let err_msg = format!("Manim render failed with status {}: {}", status, last_log);
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 0,
                status_text: "Render Error".to_string(),
                is_finished: true,
                error: Some(err_msg.clone()),
                output_path: None,
            },
        );
        Err(err_msg)
    }
}
