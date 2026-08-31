import os
import sys
import json
import re
import urllib.request
import subprocess
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import urllib.parse
import mimetypes
import shutil
import time

PORT = 8765

def get_projects_dir() -> Path:
    home = Path.home()
    p = home / "Documents" / "ManimForge" / "Projects"
    p.mkdir(parents=True, exist_ok=True)
    return p

SYSTEM_PROMPT = """You are ManimForge Assistant, an expert AI Mathematical Animator and Pair Programmer specialized in Manim Community Edition v0.21.

Guidelines:
1. Natural Conversation:
   - If the user greets you (e.g. "hi", "xin chào"), asks a general question, discusses math/physics theory, or chats casually, respond naturally, friendly, and concisely in their language (Vietnamese/English). DO NOT generate Python code or scene files for casual conversation.
2. Animation Requests:
   - When the user asks to create, visualize, animate, draw, or edit a mathematical scene (e.g. "Vẽ hình tròn...", "Tạo đồ thị sin...", "Mô phỏng trọng lực..."):
     - Explain your mathematical approach briefly.
     - Provide the complete, bug-free Python Manim code in a ```python ... ``` block.
     - Use `from manim import *` and define `class Scene(Scene):` (or descriptive subclass).
     - Include parameter annotations formatted as: `# @param min=... max=... step=... label="..."`.
     - Prefer `Text("...")` with clean Unicode symbols (e.g. `x₁`, `θ`, `π`, `ŷ`) or valid MathTex.
     - Use dark background `self.camera.background_color = "#11111b"`.
"""

AGENT_MODEL_MAP = {
    "agy": "deepseek/deepseek-chat",
    "opencode": "deepseek/deepseek-chat",
    "cline": "deepseek/deepseek-chat",
    "claude": "deepseek/deepseek-chat",
    "cursor": "openai/gpt-4o-mini",
    "codex": "openai/gpt-4o-mini",
    "ollama": "qwen/qwen-2.5-coder-32b-instruct",
}

def detect_system_agents():
    agent_defs = [
        {"id": "agy", "name": "Antigravity CLI", "command": "agy", "description": "DeepMind Autonomous Coding Agent"},
        {"id": "opencode", "name": "OpenCode CLI", "command": "opencode", "description": "Open-source terminal coding agent"},
        {"id": "cline", "name": "Cline CLI", "command": "cline", "description": "Autonomous CLI developer"},
        {"id": "claude", "name": "Claude Code CLI", "command": "claude", "description": "Anthropic Claude terminal assistant"},
        {"id": "cursor", "name": "Cursor CLI", "command": "cursor", "description": "Cursor terminal agent"},
        {"id": "codex", "name": "Codex CLI", "command": "codex", "description": "OpenAI Codex command line agent"},
        {"id": "ollama", "name": "Ollama CLI", "command": "ollama", "description": "Local offline LLM runner"},
    ]
    
    results = []
    for a in agent_defs:
        cmd = a["command"]
        path = shutil.which(cmd)
        if not path:
            local_app = os.path.expandvars(r'%LOCALAPPDATA%\agy\bin\agy.exe') if cmd == 'agy' else None
            npm_cmd = os.path.expandvars(rf'%APPDATA%\npm\{cmd}.cmd')
            npm_exe = os.path.expandvars(rf'%APPDATA%\npm\{cmd}.exe')
            if local_app and os.path.exists(local_app):
                path = local_app
            elif os.path.exists(npm_cmd):
                path = npm_cmd
            elif os.path.exists(npm_exe):
                path = npm_exe
        
        results.append({
            "id": a["id"],
            "name": a["name"],
            "command": a["command"],
            "installed": bool(path),
            "path": path,
            "description": a["description"]
        })
    return results

def resolve_model(agent_id: str, prompt: str) -> tuple[str, str]:
    model_match = re.match(r"^/model\s+([^\s]+)\s*(.*)", prompt, re.DOTALL | re.IGNORECASE)
    if model_match:
        custom_model = model_match.group(1).strip()
        remaining_prompt = model_match.group(2).strip()
        if "/" not in custom_model:
            if "deepseek" in custom_model:
                custom_model = "deepseek/deepseek-chat"
            elif "gpt" in custom_model:
                custom_model = "openai/gpt-4o-mini"
            elif "qwen" in custom_model:
                custom_model = "qwen/qwen-2.5-coder-32b-instruct"
            elif "claude" in custom_model:
                custom_model = "deepseek/deepseek-chat"
        return custom_model, remaining_prompt or f"Switched model to {custom_model}"
    
    target_model = AGENT_MODEL_MAP.get(agent_id.lower(), "deepseek/deepseek-chat")
    return target_model, prompt

def call_llm(prompt: str, current_code: str = "", agent_id: str = "agy") -> tuple[str | None, str]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        api_key = "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"

    model_name, clean_prompt = resolve_model(agent_id, prompt)

    user_msg = f"User: {clean_prompt}\n\n[Current scene.py code:\n```python\n{current_code}\n```]" if current_code and len(current_code.strip()) > 0 else f"User: {clean_prompt}"

    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        "temperature": 0.3,
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/lux0166/ManimForge",
            "X-Title": "ManimForge Studio",
            "User-Agent": "ManimForge/1.0"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    try:
        with urllib.request.urlopen(req, timeout=35) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"]
            
            code_match = re.search(r"```python\s*([\s\S]*?)\s*```", content)
            if code_match:
                code = code_match.group(1).strip()
                explanation = re.sub(r"```python[\s\S]*?```", "", content).strip()
                return code, explanation
            else:
                return None, content.strip()
    except Exception as e:
        print(f"LLM API Error with model {model_name}: {e}", file=sys.stderr)
        p = clean_prompt.lower()
        if any(w in p for w in ["vẽ", "tạo", "mô phỏng", "đồ thị", "draw", "animate", "create", "plot", "sin", "cos", "wave"]):
            return generate_fallback_scene(clean_prompt), f"Đã khởi tạo hoạt cảnh toán học ({model_name}) cho: '{clean_prompt}'."
        else:
            return None, f"Chào bạn! Tôi là trợ lý ManimForge (Model: {model_name}). Bạn có thể yêu cầu tôi mô phỏng hoặc vẽ bất kỳ hoạt cảnh toán học/vật lý nào bằng Manim Community v0.21."

def generate_fallback_scene(prompt: str) -> str:
    p = prompt.lower()
    if "sin" in p or "cos" in p or "sóng" in p or "wave" in p:
        return '''from manim import *
import numpy as np

# Parameters
AMPLITUDE = 1.5 # @param min=0.5 max=3.0 step=0.1 label="Amplitude"
FREQUENCY = 1.5 # @param min=0.5 max=4.0 step=0.5 label="Frequency"
SPEED = 1.0 # @param min=0.5 max=2.0 step=0.5 label="Speed"

class Scene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("Sine & Cosine Waves", font_size=28, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-2, 2, 1],
            x_length=8,
            y_length=4,
            axis_config={"color": "#71717a"}
        )
        self.play(Create(axes), run_time=0.8)

        sin_curve = axes.plot(lambda x: AMPLITUDE * np.sin(FREQUENCY * x), color="#89b4fa")
        cos_curve = axes.plot(lambda x: AMPLITUDE * np.cos(FREQUENCY * x), color="#f38ba8")
        sin_label = Text("y = sin(x)", font_size=18, color="#89b4fa").next_to(axes, DOWN).shift(LEFT * 1.5)
        cos_label = Text("y = cos(x)", font_size=18, color="#f38ba8").next_to(axes, DOWN).shift(RIGHT * 1.5)

        self.play(Create(sin_curve), Write(sin_label), run_time=SPEED)
        self.play(Create(cos_curve), Write(cos_label), run_time=SPEED)
        self.wait(1.5)
'''
    else:
        return f'''from manim import *

# Parameters
SCALE = 1.2 # @param min=0.5 max=2.5 step=0.1 label="Scale"

class Scene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("{prompt[:30]}", font_size=26, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        c = Circle(radius=1.5 * SCALE, color="#89b4fa", fill_opacity=0.2)
        dot = Dot(color="#f9e2af").move_to(c.get_top())

        self.play(Create(c), run_time=1)
        self.play(MoveAlongPath(dot, c), run_time=2, rate_func=linear)
        self.wait(1)
'''

def render_scene(proj_dir: Path, code: str) -> tuple[bool, str, str]:
    proj_dir.mkdir(parents=True, exist_ok=True)
    scene_file = proj_dir / "scene.py"
    scene_file.write_text(code, encoding="utf-8")

    class_match = re.search(r"class\s+([A-Za-z0-9_]+)\s*\(\s*Scene\s*\):", code)
    scene_class = class_match.group(1) if class_match else "Scene"

    media_dir = proj_dir / "media"
    media_dir.mkdir(exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "manim",
        "-ql",
        str(scene_file),
        scene_class,
        "--media_dir",
        "media",
    ]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(proj_dir),
            capture_output=True,
            text=True,
            timeout=45
        )
        if proc.returncode == 0:
            mp4_files = list(media_dir.glob("**/*.mp4"))
            if mp4_files:
                latest_mp4 = max(mp4_files, key=lambda f: f.stat().st_mtime)
                rel = latest_mp4.relative_to(proj_dir).as_posix()
                url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                return True, url, "Render complete"
            return True, "", "No video file found"
        else:
            return False, "", proc.stderr or proc.stdout
    except Exception as e:
        return False, "", str(e)

class ManimForgeHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/agents":
            self.send_json(detect_system_agents())
            return

        if path == "/api/projects":
            proj_dir = get_projects_dir()
            projects = []
            for item in proj_dir.iterdir():
                if item.is_dir():
                    created_at = item.stat().st_ctime
                    label = item.name
                    chat_file = item / "chat.json"
                    if chat_file.exists():
                        try:
                            chat_data = json.loads(chat_file.read_text(encoding="utf-8"))
                            if isinstance(chat_data, list) and len(chat_data) > 0:
                                first_msg = chat_data[0].get("content", "")
                                match = re.search(r"🎬\s*\*\*([^\*]+)\*\*", first_msg)
                                if match:
                                    label = match.group(1).strip()
                        except:
                            pass
                    projects.append({
                        "id": item.name,
                        "name": label,
                        "created_at": str(created_at),
                        "active_theme": "Catppuccin Mocha"
                    })
            projects.sort(key=lambda x: x["id"])
            if not projects:
                initial_id = f"proj_{int(time.time()*1000)}"
                (proj_dir / initial_id).mkdir(parents=True, exist_ok=True)
                projects = [{"id": initial_id, "name": "Video 1", "created_at": str(time.time()), "active_theme": "Catppuccin Mocha"}]
            self.send_json(projects)
            return

        if path == "/api/health":
            self.send_json({"status": "ok", "manim": "v0.21.0"})
            return

        if path.startswith("/media/"):
            parts = path[len("/media/"):].split("/", 1)
            if len(parts) == 2:
                proj_id, rel = parts
                proj_dir = get_projects_dir() / proj_id
                file_path = proj_dir / rel
                if file_path.exists() and file_path.is_file():
                    mime_type, _ = mimetypes.guess_type(str(file_path))
                    self.send_response(200)
                    self.send_header("Content-Type", mime_type or "video/mp4")
                    self.send_header("Content-Length", str(file_path.stat().st_size))
                    self.send_header("Accept-Ranges", "bytes")
                    self.end_headers()
                    with open(file_path, "rb") as f:
                        self.wfile.write(f.read())
                    return

            self.send_error(404, "File Not Found")
            return

        if path == "/api/load_code":
            qs = urllib.parse.parse_qs(parsed.query)
            proj_id = qs.get("project_id", [""])[0]
            proj_dir = get_projects_dir() / proj_id
            scene_file = proj_dir / "scene.py"
            code = scene_file.read_text(encoding="utf-8") if scene_file.exists() else ""
            self.send_json({"code": code})
            return

        if path == "/api/load_chat":
            qs = urllib.parse.parse_qs(parsed.query)
            proj_id = qs.get("project_id", [""])[0]
            proj_dir = get_projects_dir() / proj_id
            chat_file = proj_dir / "chat.json"
            chat_data = chat_file.read_text(encoding="utf-8") if chat_file.exists() else "[]"
            self.send_json(json.loads(chat_data))
            return

        self.send_error(404, "Endpoint Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        data = json.loads(body)

        if path == "/api/chat":
            prompt = data.get("prompt", "")
            agent_id = data.get("model", "agy")
            proj_id = data.get("project_id", "")
            current_code = data.get("current_code", "")

            proj_dir = get_projects_dir() / proj_id
            code, explanation = call_llm(prompt, current_code, agent_id)

            if code:
                success, video_url, msg = render_scene(proj_dir, code)
                self.send_json({
                    "is_code_update": True,
                    "success": success,
                    "code": code,
                    "explanation": explanation,
                    "video_url": video_url,
                    "message": msg,
                })
            else:
                self.send_json({
                    "is_code_update": False,
                    "success": True,
                    "code": None,
                    "explanation": explanation,
                    "video_url": None,
                    "message": "Chat response",
                })
            return

        if path == "/api/merge_scenes":
            proj_id = data.get("project_id", "")
            code = data.get("code", "")
            proj_dir = get_projects_dir() / proj_id
            proj_dir.mkdir(parents=True, exist_ok=True)
            
            scene_file = proj_dir / "scene.py"
            if code:
                scene_file.write_text(code, encoding="utf-8")
            else:
                code = scene_file.read_text(encoding="utf-8") if scene_file.exists() else ""
            
            scene_classes = re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(\s*Scene\s*\):", code)
            if not scene_classes:
                scene_classes = ["Scene"]
            
            media_dir = proj_dir / "media"
            media_dir.mkdir(exist_ok=True)
            
            rendered_videos = []
            for sc in scene_classes:
                cmd = [
                    sys.executable,
                    "-m",
                    "manim",
                    "-qh",
                    str(scene_file),
                    sc,
                    "--media_dir",
                    "media",
                ]
                proc = subprocess.run(cmd, cwd=str(proj_dir), capture_output=True, text=True, timeout=120)
                sc_mp4s = list(media_dir.glob(f"**/{sc}.mp4"))
                if sc_mp4s:
                    rendered_videos.append(sc_mp4s[0])
            
            if rendered_videos:
                concat_list_file = media_dir / "concat_list.txt"
                with open(concat_list_file, "w", encoding="utf-8") as cf:
                    for v in rendered_videos:
                        cf.write(f"file '{v.as_posix()}'\n")
                
                merged_output = media_dir / "master_merged.mp4"
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", str(concat_list_file),
                    "-c", "copy",
                    str(merged_output),
                    "-y"
                ]
                subprocess.run(ffmpeg_cmd, cwd=str(proj_dir), capture_output=True)
                
                rel = merged_output.relative_to(proj_dir).as_posix()
                url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                self.send_json({"success": True, "video_url": url, "scenes_count": len(rendered_videos)})
                return
            
            self.send_json({"success": False, "message": "Failed to compile individual scenes"})
            return

        if path == "/api/export":
            proj_id = data.get("project_id", "")
            quality = data.get("quality", "1080p")
            code = data.get("code", "")
            proj_dir = get_projects_dir() / proj_id
            
            q_flag = "-qh" if quality == "1080p" else "-qk" if quality == "4k" else "-qm"
            scene_file = proj_dir / "scene.py"
            if code:
                scene_file.write_text(code, encoding="utf-8")
            
            class_match = re.search(r"class\s+([A-Za-z0-9_]+)\s*\(\s*Scene\s*\):", code or (scene_file.read_text(encoding="utf-8") if scene_file.exists() else ""))
            scene_class = class_match.group(1) if class_match else "Scene"
            
            cmd = [
                sys.executable,
                "-m",
                "manim",
                q_flag,
                str(scene_file),
                scene_class,
                "--media_dir",
                "media",
            ]
            
            try:
                proc = subprocess.run(cmd, cwd=str(proj_dir), capture_output=True, text=True, timeout=120)
                media_dir = proj_dir / "media"
                mp4_files = list(media_dir.glob("**/*.mp4"))
                if mp4_files:
                    latest = max(mp4_files, key=lambda f: f.stat().st_mtime)
                    rel = latest.relative_to(proj_dir).as_posix()
                    url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                    self.send_json({"success": True, "video_url": url, "filename": latest.name})
                    return
                self.send_json({"success": False, "message": "Export completed but no video file found"})
            except Exception as e:
                self.send_json({"success": False, "message": str(e)})
            return

        if path == "/api/delete_project":
            proj_id = data.get("project_id", "")
            if proj_id:
                proj_dir = get_projects_dir() / proj_id
                if proj_dir.exists():
                    shutil.rmtree(proj_dir, ignore_errors=True)
                    self.send_json({"status": "deleted", "project_id": proj_id})
                    return
            self.send_json({"status": "error", "message": "Project not found"})
            return

        if path == "/api/rename_project":
            proj_id = data.get("project_id", "")
            new_name = data.get("new_name", "Video")
            if proj_id:
                proj_dir = get_projects_dir() / proj_id
                if proj_dir.exists():
                    chat_file = proj_dir / "chat.json"
                    chat_data = []
                    if chat_file.exists():
                        try:
                            chat_data = json.loads(chat_file.read_text(encoding="utf-8"))
                        except:
                            chat_data = []
                    new_welcome = {
                        "id": "msg-welcome",
                        "sender": "assistant",
                        "content": f"🎬 **{new_name}** created!\n\nDescribe the mathematical scene or animation you want to create below.",
                        "timestamp": "00:00"
                    }
                    if chat_data:
                        chat_data[0] = new_welcome
                    else:
                        chat_data = [new_welcome]
                    chat_file.write_text(json.dumps(chat_data, indent=2, ensure_ascii=False), encoding="utf-8")
                    self.send_json({"status": "renamed", "project_id": proj_id, "name": new_name})
                    return
            self.send_json({"status": "error", "message": "Project not found"})
            return

        if path == "/api/duplicate_project":
            proj_id = data.get("project_id", "")
            if proj_id:
                proj_dir = get_projects_dir() / proj_id
                if proj_dir.exists():
                    new_id = f"proj_{int(time.time()*1000)}"
                    new_dir = get_projects_dir() / new_id
                    shutil.copytree(proj_dir, new_dir)
                    self.send_json({"status": "duplicated", "new_project_id": new_id})
                    return
            self.send_json({"status": "error", "message": "Project not found"})
            return

        if path == "/api/render":
            proj_id = data.get("project_id", "")
            code = data.get("code", "")
            proj_dir = get_projects_dir() / proj_id
            success, video_url, msg = render_scene(proj_dir, code)

            self.send_json({
                "success": success,
                "video_url": video_url,
                "message": msg,
            })
            return

        if path == "/api/save_code":
            proj_id = data.get("project_id", "")
            code = data.get("code", "")
            proj_dir = get_projects_dir() / proj_id
            proj_dir.mkdir(parents=True, exist_ok=True)
            (proj_dir / "scene.py").write_text(code, encoding="utf-8")
            self.send_json({"status": "saved"})
            return

        if path == "/api/save_chat":
            proj_id = data.get("project_id", "")
            chat = data.get("chat", [])
            proj_dir = get_projects_dir() / proj_id
            proj_dir.mkdir(parents=True, exist_ok=True)
            (proj_dir / "chat.json").write_text(json.dumps(chat, indent=2, ensure_ascii=False), encoding="utf-8")
            self.send_json({"status": "saved"})
            return

        self.send_error(404, "Endpoint Not Found")

    def send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

def run_server():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ManimForgeHandler)
    print(f"ManimForge AI & Video Streaming Server listening on http://127.0.0.1:{PORT}")
    server.serve_forever()

if __name__ == "__main__":
    run_server()
