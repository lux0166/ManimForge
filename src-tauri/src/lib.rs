pub mod cli_detector;
pub mod cli_runner;
pub mod manim_engine;
pub mod project_manager;

use cli_detector::{check_environment, detect_installed_agents, AgentCliInfo, EnvironmentStatus};
use manim_engine::render_scene_async;
use project_manager::{
    create_new_project, list_all_projects, read_project_code, save_project_code, ProjectMetadata,
};
use tauri::{AppHandle, command};

#[command]
fn get_environment_info() -> EnvironmentStatus {
    check_environment()
}

#[command]
fn get_available_agents() -> Vec<AgentCliInfo> {
    detect_installed_agents()
}

#[command]
fn list_projects() -> Vec<ProjectMetadata> {
    list_all_projects()
}

#[command]
fn create_project(name: String, theme: String, initial_code: String) -> Result<ProjectMetadata, String> {
    create_new_project(&name, &theme, &initial_code)
}

#[command]
fn save_code(project_id: String, code: String) -> Result<(), String> {
    save_project_code(&project_id, &code)
}

#[command]
fn load_code(project_id: String) -> Result<String, String> {
    read_project_code(&project_id)
}

#[command]
async fn render_manim(
    app: AppHandle,
    project_id: String,
    scene_file: String,
    quality: String,
) -> Result<String, String> {
    let proj_dir = project_manager::get_projects_dir().join(project_id);
    render_scene_async(app, proj_dir, scene_file, quality).await
}

#[command]
async fn execute_agent_prompt(
    app: AppHandle,
    agent_id: String,
    prompt: String,
    project_id: String,
) -> Result<String, String> {
    let proj_dir = project_manager::get_projects_dir().join(project_id);
    cli_runner::run_agent_prompt_stream(app, agent_id, prompt, proj_dir).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_environment_info,
            get_available_agents,
            list_projects,
            create_project,
            save_code,
            load_code,
            render_manim,
            execute_agent_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
