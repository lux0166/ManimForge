use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentInfo {
    pub python_available: bool,
    pub python_version: Option<String>,
    pub manim_available: bool,
    pub manim_version: Option<String>,
    pub ffmpeg_available: bool,
    pub ffmpeg_version: Option<String>,
    pub latex_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderProgress {
    pub percent: u32,
    pub status_text: String,
    pub is_finished: bool,
    pub error: Option<String>,
    pub output_path: Option<String>,
}

pub fn detect_environment() -> EnvironmentInfo {
    let py_out = std::process::Command::new("python").arg("--version").output();
    let python_version = py_out.ok().and_then(|o| String::from_utf8(o.stdout).ok()).map(|s| s.trim().to_string());
    let python_available = python_version.is_some();

    let manim_out = std::process::Command::new("python").args(["-m", "manim", "--version"]).output();
    let manim_version = manim_out.ok().and_then(|o| String::from_utf8(o.stdout).ok()).map(|s| s.trim().to_string());
    let manim_available = manim_version.is_some();

    let ffmpeg_out = std::process::Command::new("ffmpeg").arg("-version").output();
    let ffmpeg_version = ffmpeg_out.ok().and_then(|o| String::from_utf8(o.stdout).ok()).map(|s| s.lines().next().unwrap_or("").to_string());
    let ffmpeg_available = ffmpeg_version.is_some();

    EnvironmentInfo {
        python_available,
        python_version,
        manim_available,
        manim_version,
        ffmpeg_available,
        ffmpeg_version,
        latex_available: true,
    }
}

pub async fn render_scene_async(
    app: AppHandle,
    project_dir: PathBuf,
    scene_file: String,
    quality: String,
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

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn Manim process: {}", e))?;

    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;

    let app_handle = app.clone();
    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        let percent_regex = Regex::new(r"(\d+)%").unwrap();
        let anim_regex = Regex::new(r"Animation\s+\d+:\s+([^,:]+)").unwrap();
        let mut err_log = String::new();

        while let Ok(Some(line)) = reader.next_line().await {
            err_log.push_str(&line);
            err_log.push('\n');

            let mut percent = None;
            let mut anim_name = None;

            if let Some(caps) = percent_regex.captures(&line) {
                if let Some(p) = caps.get(1) {
                    percent = p.as_str().parse::<u32>().ok();
                }
            }

            if let Some(caps) = anim_regex.captures(&line) {
                if let Some(a) = caps.get(1) {
                    anim_name = Some(a.as_str().to_string());
                }
            }

            if percent.is_some() || anim_name.is_some() {
                let status_text = if let Some(name) = anim_name {
                    format!("Rendering: {}", name)
                } else {
                    "Compiling frames...".to_string()
                };

                let _ = app_handle.emit(
                    "manim://progress",
                    RenderProgress {
                        percent: percent.unwrap_or(50),
                        status_text,
                        is_finished: false,
                        error: None,
                        output_path: None,
                    },
                );
            }
        }
        err_log
    });

    let stdout_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        let mut out_log = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            out_log.push_str(&line);
            out_log.push('\n');
        }
        out_log
    });

    let status = child.wait().await.map_err(|e| format!("Process error: {}", e))?;
    let stderr_output = stderr_task.await.unwrap_or_default();
    let stdout_output = stdout_task.await.unwrap_or_default();
    let combined_error = format!("{}\n{}", stdout_output, stderr_output);

    if status.success() {
        let video_path = find_latest_mp4(&media_dir).unwrap_or_default();
        let _ = app.emit(
            "manim://progress",
            RenderProgress {
                percent: 100,
                status_text: "Render complete".to_string(),
                is_finished: true,
                error: None,
                output_path: Some(video_path.clone()),
            },
        );
        Ok(video_path)
    } else {
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
