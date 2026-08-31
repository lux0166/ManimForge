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

    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let meta_path = entry.path().join("project.json");
                if meta_path.exists() {
                    if let Ok(data) = fs::read_to_string(meta_path) {
                        if let Ok(meta) = serde_json::from_str::<ProjectMetadata>(&data) {
                            list.push(meta);
                        }
                    }
                }
            }
        }
    }

    list
}

pub fn create_new_project(name: &str, theme: &str, initial_code: &str) -> Result<ProjectMetadata, String> {
    let root = get_projects_dir();
    let id = format!("proj_{}", chrono::Utc::now().timestamp());
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
        return Err("Project directory not found".to_string());
    }
    fs::write(proj_dir.join("scene.py"), code).map_err(|e| e.to_string())
}

pub fn read_project_code(project_id: &str) -> Result<String, String> {
    let root = get_projects_dir();
    let file = root.join(project_id).join("scene.py");
    fs::read_to_string(file).map_err(|e| e.to_string())
}
