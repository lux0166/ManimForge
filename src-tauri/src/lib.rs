mod cli_runner;
mod manim_engine;
mod project_manager;

use cli_runner::AgentCliInfo;
use manim_engine::EnvironmentInfo;
use project_manager::{ProjectMetadata, SceneParameter};
use tauri::AppHandle;

#[tauri::command]
fn get_environment_info() -> EnvironmentInfo {
    manim_engine::detect_environment()
}

#[tauri::command]
fn get_available_agents() -> Vec<AgentCliInfo> {
    cli_runner::detect_available_agents()
}

#[tauri::command]
fn list_projects() -> Vec<ProjectMetadata> {
    project_manager::list_all_projects()
}

#[tauri::command]
fn create_project(name: String, theme: String, initial_code: String) -> Result<ProjectMetadata, String> {
    project_manager::create_new_project(&name, &theme, &initial_code)
}

#[tauri::command]
fn save_code(project_id: String, code: String) -> Result<(), String> {
    project_manager::save_project_code(&project_id, &code)
}

#[tauri::command]
fn load_code(project_id: String) -> Result<String, String> {
    project_manager::read_project_code(&project_id)
}

#[tauri::command]
fn save_chat(project_id: String, chat_json: String) -> Result<(), String> {
    project_manager::save_project_chat(&project_id, &chat_json)
}

#[tauri::command]
fn load_chat(project_id: String) -> Result<String, String> {
    project_manager::read_project_chat(&project_id)
}

#[tauri::command]
fn get_project_video(project_id: String) -> Option<String> {
    project_manager::get_project_latest_video(&project_id)
}

#[tauri::command]
fn get_scene_parameters(code: String) -> Vec<SceneParameter> {
    project_manager::parse_scene_parameters(&code)
}

#[tauri::command]
async fn render_manim(
    app: AppHandle,
    project_id: String,
    scene_file: String,
    quality: String,
) -> Result<String, String> {
    let projects_dir = project_manager::get_projects_dir();
    let project_dir = projects_dir.join(project_id);
    manim_engine::render_scene_async(app, project_dir, scene_file, quality).await
}

#[tauri::command]
async fn execute_agent_prompt(
    app: AppHandle,
    agent_id: String,
    prompt: String,
    project_id: String,
) -> Result<String, String> {
    let projects_dir = project_manager::get_projects_dir();
    let project_dir = projects_dir.join(project_id);
    cli_runner::run_agent_prompt_stream(app, agent_id, prompt, project_dir).await
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
            save_chat,
            load_chat,
            get_project_video,
            get_scene_parameters,
            render_manim,
            execute_agent_prompt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
