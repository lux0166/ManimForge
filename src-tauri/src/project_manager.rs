use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub active_theme: String,
    pub prompt: Option<String>,
    pub last_rendered_video: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneParameter {
    pub name: String,
    pub value: f64,
    pub min: f64,
    pub max: f64,
    pub step: f64,
    pub label: String,
}

pub fn get_projects_dir() -> PathBuf {
    let mut dir = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("ManimForge");
    dir.push("Projects");
    fs::create_dir_all(&dir).ok();
    dir
}

pub fn list_all_projects() -> Vec<ProjectMetadata> {
    let root = get_projects_dir();
    let mut list = Vec::new();

    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let meta_path = entry.path().join("project.json");
                if meta_path.exists() {
                    if let Ok(data) = fs::read_to_string(&meta_path) {
                        if let Ok(mut meta) = serde_json::from_str::<ProjectMetadata>(&data) {
                            let media_dir = entry.path().join("media");
                            if let Ok(video_files) = find_mp4_recursive(&media_dir) {
                                if let Some(latest) = video_files.into_iter().max_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).ok()) {
                                    meta.last_rendered_video = Some(latest.to_string_lossy().to_string());
                                }
                            }
                            list.push(meta);
                        }
                    }
                }
            }
        }
    }

    if list.is_empty() {
        if let Ok(default_proj) = create_new_project(
            "Video 1",
            "Catppuccin Mocha",
            "from manim import *\n\nclass Scene(Scene):\n    def construct(self):\n        self.camera.background_color = \"#11111b\"\n        title = Text(\"Neural Network Optimization\", font_size=28, color=\"#cdd6f4\").to_edge(UP, buff=0.6)\n        self.play(Write(title), run_time=1)\n        self.wait(1)\n",
        ) {
            list.push(default_proj);
        }
    }

    list
}

fn find_mp4_recursive(dir: &PathBuf) -> Result<Vec<PathBuf>, std::io::Error> {
    let mut results = Vec::new();
    if dir.exists() && dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if let Ok(mut sub) = find_mp4_recursive(&path) {
                    results.append(&mut sub);
                }
            } else if path.extension().and_then(|s| s.to_str()) == Some("mp4") {
                results.push(path);
            }
        }
    }
    Ok(results)
}

pub fn create_new_project(name: &str, theme: &str, initial_code: &str) -> Result<ProjectMetadata, String> {
    let root = get_projects_dir();
    let id = format!("proj_{}", chrono::Utc::now().timestamp_micros());
    let proj_dir = root.join(&id);
    fs::create_dir_all(&proj_dir).map_err(|e| e.to_string())?;

    let scene_path = proj_dir.join("scene.py");
    fs::write(scene_path, initial_code).map_err(|e| e.to_string())?;

    let meta = ProjectMetadata {
        id: id.clone(),
        name: name.to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
        active_theme: theme.to_string(),
        prompt: None,
        last_rendered_video: None,
    };

    let meta_json = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;
    fs::write(proj_dir.join("project.json"), meta_json).map_err(|e| e.to_string())?;

    Ok(meta)
}

pub fn save_project_code(project_id: &str, code: &str) -> Result<(), String> {
    let root = get_projects_dir();
    let proj_dir = root.join(project_id);
    if !proj_dir.exists() {
        fs::create_dir_all(&proj_dir).map_err(|e| e.to_string())?;
    }
    fs::write(proj_dir.join("scene.py"), code).map_err(|e| e.to_string())
}

pub fn read_project_code(project_id: &str) -> Result<String, String> {
    let root = get_projects_dir();
    let file = root.join(project_id).join("scene.py");
    fs::read_to_string(file).map_err(|e| e.to_string())
}

pub fn save_project_chat(project_id: &str, chat_json: &str) -> Result<(), String> {
    let root = get_projects_dir();
    let proj_dir = root.join(project_id);
    if !proj_dir.exists() {
        fs::create_dir_all(&proj_dir).map_err(|e| e.to_string())?;
    }
    fs::write(proj_dir.join("chat.json"), chat_json).map_err(|e| e.to_string())
}

pub fn read_project_chat(project_id: &str) -> Result<String, String> {
    let root = get_projects_dir();
    let file = root.join(project_id).join("chat.json");
    if file.exists() {
        fs::read_to_string(file).map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string())
    }
}

pub fn get_project_latest_video(project_id: &str) -> Option<String> {
    let root = get_projects_dir();
    let media_dir = root.join(project_id).join("media");
    if let Ok(videos) = find_mp4_recursive(&media_dir) {
        if let Some(latest) = videos.into_iter().max_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).ok()) {
            return Some(latest.to_string_lossy().to_string());
        }
    }
    None
}

pub fn parse_scene_parameters(code: &str) -> Vec<SceneParameter> {
    let mut params = Vec::new();
    let re = Regex::new(r#"([A-Z0-9_]+)\s*=\s*([0-9.]+)\s*#\s*@param(?:\s+min=([0-9.]+))?(?:\s+max=([0-9.]+))?(?:\s+step=([0-9.]+))?(?:\s+label="([^"]+)")?"#).unwrap();

    for cap in re.captures_iter(code) {
        let name = cap.get(1).map_or("", |m| m.as_str()).to_string();
        let val: f64 = cap.get(2).and_then(|m| m.as_str().parse().ok()).unwrap_or(1.0);
        let min: f64 = cap.get(3).and_then(|m| m.as_str().parse().ok()).unwrap_or(0.0);
        let max: f64 = cap.get(4).and_then(|m| m.as_str().parse().ok()).unwrap_or(10.0);
        let step: f64 = cap.get(5).and_then(|m| m.as_str().parse().ok()).unwrap_or(0.1);
        let label = cap.get(6).map_or(name.clone(), |m| m.as_str().to_string());

        params.push(SceneParameter {
            name,
            value: val,
            min,
            max,
            step,
            label,
        });
    }

    params
}
