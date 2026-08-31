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

    if list.is_empty() {
        // Create initial default project
        if let Ok(default_proj) = create_new_project(
            "Neural Network 2D",
            "Catppuccin Mocha",
            r#"from manim import *

class Scene(Scene):
    def construct(self):
        # Hyperparameters
        NUM_LAYERS = 4 # @param min=2 max=8 step=1 label="Layers"
        LEARNING_RATE = 0.05 # @param min=0.01 max=0.5 step=0.01 label="Learning Rate"
        ANIMATION_SPEED = 1.0 # @param min=0.5 max=3.0 step=0.5 label="Speed Multiplier"

        title = Tex(r"	extbf{Neural Network Optimization}", color=BLUE_B).to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # Draw Layers
        layers = VGroup()
        for i in range(int(NUM_LAYERS)):
            layer = VGroup(*[Circle(radius=0.25, color=TEAL, fill_opacity=0.6) for _ in range(4)])
            layer.arrange(DOWN, buff=0.4)
            layers.add(layer)
        layers.arrange(RIGHT, buff=1.2)

        self.play(Create(layers), run_time=ANIMATION_SPEED)
        self.wait(1)
"#,
        ) {
            list.push(default_proj);
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
