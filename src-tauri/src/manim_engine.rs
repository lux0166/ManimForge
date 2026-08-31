use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
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
        let err_msg = format!("Scene file '{}' does not exist in project directory", scene_path.display());
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 0,
                status_text: "File not found".to_string(),
                is_finished: true,
                error: Some(err_msg.clone()),
                output_path: None,
            },
        );
        return Err(err_msg);
    }

    let media_dir = project_dir.join("media");
    std::fs::create_dir_all(&media_dir).ok();

    let mut cmd = Command::new("python");
    cmd.current_dir(&project_dir)
        .args([
            "-m",
            "manim",
            &quality_flag,
            &scene_file,
            "--media_dir",
            "media",
            "--progress_bar",
            "display",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000);
    }

    let mut child = cmd.spawn().map_err(|e| {
        let msg = format!("Failed to spawn Manim process. Ensure Python & Manim are installed: {}", e);
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 0,
                status_text: "Process error".to_string(),
                is_finished: true,
                error: Some(msg.clone()),
                output_path: None,
            },
        );
        msg
    })?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let progress_re = Regex::new(r"(\d+)%").unwrap();
    let anim_re = Regex::new(r"Animation \d+: ([^:]+)").unwrap();
    let progress_re_clone = progress_re.clone();
    let anim_re_clone = anim_re.clone();
    let app_handle = app.clone();

    // Read stderr concurrently (Manim outputs tqdm progress to stderr)
    let stderr_task = tokio::spawn(async move {
        let mut collected_stderr = String::new();
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            collected_stderr.push_str(&line);
            collected_stderr.push('\n');

            let mut status = line.clone();
            if let Some(caps) = anim_re_clone.captures(&line) {
                if let Some(name) = caps.get(1) {
                    status = format!("Rendering: {}", name.as_str().trim());
                }
            }

            if let Some(caps) = progress_re_clone.captures(&line) {
                if let Some(pct) = caps.get(1).and_then(|m| m.as_str().parse::<u32>().ok()) {
                    let _ = app_handle.emit(
                        "manim://progress",
                        RenderProgress {
                            percent: pct,
                            status_text: status,
                            is_finished: false,
                            error: None,
                            output_path: None,
                        },
                    );
                }
            }
        }
        collected_stderr
    });

    let mut collected_stdout = String::new();
    while let Ok(Some(line)) = stdout_reader.next_line().await {
        collected_stdout.push_str(&line);
        collected_stdout.push('\n');

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

    let stderr_output = stderr_task.await.unwrap_or_default();
    let status = child.wait().await.map_err(|e| e.to_string())?;

    if status.success() {
        let video_path = find_latest_mp4(&media_dir).unwrap_or_else(|| "".to_string());
        
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 100,
                status_text: "Render complete".to_string(),
                is_finished: true,
                error: None,
                output_path: if video_path.is_empty() { None } else { Some(video_path.clone()) },
            },
        );

        Ok(video_path)
    } else {
        let combined_error = if !stderr_output.is_empty() {
            stderr_output
        } else {
            collected_stdout
        };

        let clean_error = extract_manim_error(&combined_error);
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 0,
                status_text: "Render failed".to_string(),
                is_finished: true,
                error: Some(clean_error.clone()),
                output_path: None,
            },
        );

        Err(clean_error)
    }
}

fn find_latest_mp4(dir: &Path) -> Option<String> {
    if !dir.exists() {
        return None;
    }

    let mut latest_file: Option<(PathBuf, std::time::SystemTime)> = None;

    fn walk_dir(dir: &Path, latest: &mut Option<(PathBuf, std::time::SystemTime)>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk_dir(&path, latest);
                } else if path.extension().and_then(|s| s.to_str()) == Some("mp4") {
                    if let Ok(metadata) = std::fs::metadata(&path) {
                        if let Ok(mod_time) = metadata.modified() {
                            if latest.as_ref().map_or(true, |(_, time)| mod_time > *time) {
                                *latest = Some((path, mod_time));
                            }
                        }
                    }
                }
            }
        }
    }

    walk_dir(dir, &mut latest_file);
    latest_file.map(|(p, _)| p.to_string_lossy().to_string())
}

fn extract_manim_error(output: &str) -> String {
    let mut lines = Vec::new();
    let mut capturing = false;

    for line in output.lines() {
        if line.contains("Traceback (most recent call last):") || line.contains("Error:") || line.contains("Exception:") {
            capturing = true;
        }
        if capturing {
            lines.push(line);
        }
    }

    if lines.is_empty() {
        output.lines().rev().take(15).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join("\n")
    } else {
        lines.join("\n")
    }
}
