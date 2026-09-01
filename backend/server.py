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

def load_env_file():
    for candidate in [Path(__file__).resolve().parent.parent / ".env", Path(__file__).resolve().parent / ".env", Path.cwd() / ".env"]:
        if candidate.exists():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass
            break

load_env_file()

def get_projects_dir() -> Path:
    home = Path.home()
    p = home / "Documents" / "ManimForge" / "Projects"
    p.mkdir(parents=True, exist_ok=True)
    return p

SYSTEM_PROMPT = """You are ManimForge Master Agent, an elite AI Mathematical Animator, Physicist, and Pair Programmer specializing in Manim Community Edition v0.21.

### CORE OBJECTIVES:
You synthesize breathtaking, mathematically rigorous, visually stunning, and 100% bug-free Manim animation code.
Every frame must be clean, elegant, with ZERO overlapping text, ZERO colliding axis numbers, and perfect spatial harmony.

---

### 1. CONVERSATIONAL VS ANIMATION ROUTING:
- **Casual Conversations / Questions / Math Theory**:
  - Respond naturally, clearly, and concisely in Vietnamese or English.
  - DO NOT output Python code for general conversational inquiries.
- **Animation / Visualization / Code Requests**:
  - Provide a brief 1-2 sentence mathematical breakdown.
  - Deliver the complete, fully working Python code in a single ```python ... ``` block.

---

### 2. SURGICAL CODE EDITS VS FRESH GENERATION:
- **When Fixing Errors / Modifying Existing Code (SỬA LỖI & CHỈNH SỬA CỤC BỘ)**:
  - If `[Current scene.py code]` is provided and the user asks to fix an error, change a parameter, or add an animation:
    - ⚠️ **DO NOT rewrite the scene from scratch!**
    - Identify the EXACT broken line, misspelled function, or requested change.
    - Preserve 100% of the existing scene logic, class names, variable names, `# @param` sliders, and existing animations.
    - Apply the precise fix cleanly to the existing code.
- **When Creating a Brand New Scene (TẠO HOẠT CẢNH MỚI)**:
  - Only when `[Current scene.py code]` is empty or the user asks for a completely different mathematical topic, construct a fresh scene following the golden standards.

---

### 3. LONG-FORM & MULTI-CHAPTER LECTURES (5 - 10 MINUTE VIDEOS):
- When the user asks for a long video (e.g. "video 5 phút", "video 10 phút", "bài giảng chi tiết", "toàn bộ bài học"):
  - ⚠️ DO NOT pack everything into a single cramped class.
  - Divide the lecture into **3 to 6 distinct Chapter Scene classes** in the SAME script:
    ```python
    class Chapter1_Introduction(Scene):
        def construct(self): ... # ~1-2 minutes: Hook, problem statement, key question

    class Chapter2_CoreTheory(Scene):
        def construct(self): ... # ~2-3 minutes: Mathematical formulation, definitions, theorems

    class Chapter3_VisualProof(Scene):
        def construct(self): ... # ~2-3 minutes: Dynamic graphs, geometric transformations, vectors

    class Chapter4_Applications(Scene):
        def construct(self): ... # ~2 minutes: Real-world physics simulation or engineering use-case

    class Chapter5_Summary(Scene):
        def construct(self): ... # ~1 minute: Key takeaways, formula recap
    ```
  - Pace the animations generously using `self.wait(2)` or `self.wait(3)` between concepts to give the audience time to absorb each visual step, achieving the requested lecture duration.
  - The studio backend will AUTOMATICALLY render each chapter and stitch them together into one seamless 10-minute Master Video!

---

### 4. CRITICAL ANTI-OVERLAPPING & VISUAL QUALITY RULES:

1. **AXES & COORDINATE NUMBERING (PREVENT SMASHED / OVERLAPPING NUMBERS)**:
   - NEVER use a tiny float step (like 0.1, 0.2, 0.318...) in x_range or y_range with automatic numbers! This generates hundreds of decimal labels that collide horizontally into an unreadable blob.
   - **Correct Axes Construction**:
     ```python
     axes = Axes(
         x_range=[-6, 6, 2],       # Use clean integer step (e.g. 1 or 2)
         y_range=[-2, 2, 1],       # Clean integer step
         x_length=9,
         y_length=4.5,
         axis_config={
             "color": "#71717a",
             "stroke_width": 2,
             "tip_width": 0.2,
             "tip_height": 0.2,
         },
         tips=True,
     )
     # Add ONLY clean, spaced integer tick labels with small readable font:
     axes.add_coordinates(font_size=16)
     ```
   - For trigonometric functions (-pi to pi), do NOT add automatic decimal numbers. Either use integer x_range [-6, 6, 2] or manually label key points like `Text("pi", font_size=16)`.

2. **PREVENT TEXT & LABEL COLLISIONS**:
   - Never stack labels on top of the Y-axis apex or directly on the curve endpoints.
   - Always place legend / curve labels clearly in open space or offset with next_to:
     ```python
     sin_label = Text("y = sin(x)", font="Segoe UI", font_size=18, color=GRAPH_COLOR).to_corner(UR, buff=0.8)
     cos_label = Text("y = cos(x)", font="Segoe UI", font_size=18, color=PATH_COLOR).next_to(sin_label, DOWN, buff=0.25, aligned_edge=LEFT)
     ```

3. **CRITICAL TYPOGRAPHY & ESCAPING RULES (PREVENT 'extbf' OR ESCAPE BUGS)**:
   - ⚠️ NEVER use LaTeX formatting like `\textbf{...}` inside `Text(...)`!
   - To make bold or italic text, ALWAYS use native Manim parameters:
     ```python
     title = Text("Neural Network Optimization", weight=BOLD, font="Segoe UI", font_size=28, color="#cdd6f4").to_edge(UP, buff=0.5)
     ```
   - If writing math with backslashes, ALWAYS use raw string literals `r"..."` (e.g. `r"\theta"`, `r"\tau"`, `r"\alpha"`). Without `r"..."`, Python interprets `\t` as a Tab character and strips `\t` into `extbf` or corrupted text!

4. **NEURAL NETWORK VISUALIZATION STANDARDS**:
   - When asked for a Neural Network / Deep Learning visualization:
     - Construct distinct layers (e.g. Input: 3 nodes, Hidden 1: 4 nodes, Hidden 2: 4 nodes, Output: 2 nodes).
     - Connect neurons with synaptic weight lines: `Line(n1.get_center(), n2.get_center(), stroke_opacity=0.25, stroke_width=1.5, color="#71717a")`.
     - Animate the **Forward Pass**: Flash pulses of light (`#89b4fa`) moving from input to output.
     - Animate **Backpropagation / Loss Gradient**: Reverse pulses (`#f38ba8`) flowing backwards as weights adjust.
     - Add clean layer labels below each column: `Text("Input", font="Segoe UI", font_size=16)`, `Text("Hidden", font="Segoe UI", font_size=16)`, `Text("Output", font="Segoe UI", font_size=16)`.

5. **VIETNAMESE & UNICODE TYPOGRAPHY (ZERO MISSING GLYPHS / NO TOFU BOXES)**:
   - When writing Vietnamese text in `Text(...)` (e.g. `Lan truyền thuận`, `Đồ thị`, `Tầng ẩn`), ALWAYS specify `font="Segoe UI"` or `font="Arial"`:
     ```python
     title = Text("Lan truyền thuận (Forward Propagation)", font="Segoe UI", font_size=26, color="#cdd6f4").to_edge(UP, buff=0.4)
     ```
   - ⚠️ NEVER omit the font for Vietnamese text because Windows default Serif font lacks composite diacritics (`ề`, `ậ`, `ắ`, `ỗ`, `ự`), which causes white rectangle tofu glyphs and detached accents!

6. **OUTPUT FORMAT RULE (EXACTLY ONE CODE BLOCK)**:
   - ⚠️ NEVER output multiple ```python ... ``` code blocks in a single response!
   - If explaining a bug or highlighting a specific line in text, write the snippet inline in single backticks (e.g. `rate_of_change = Text(...)`).
   - Output EXACTLY ONE ```python ... ``` code block containing the complete, runnable `scene.py` script.

7. **COLOR HARMONY (Catppuccin Palette)**:
   - Sapphire Blue: `"#89b4fa"`
   - Peach Orange: `"#fab387"`
   - Emerald Green: `"#a6e3a1"`
   - Coral Pink: `"#f38ba8"`
   - Gold Yellow: `"#f9e2af"`
   - Lavender: `"#cba6f7"`
   - Axis Muted: `"#71717a"`
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

def extract_scene_code(text: str) -> tuple[str | None, str]:
    blocks = re.findall(r"```python\s*([\s\S]*?)\s*```", text)
    if not blocks:
        match = re.search(r"```python\s*([\s\S]*?)$", text)
        if match and ("class " in match.group(1) or "from manim" in match.group(1)):
            return match.group(1).strip(), text
        return None, text.strip()
    
    scene_blocks = [b for b in blocks if "class " in b or "from manim" in b]
    main_block = scene_blocks[-1] if scene_blocks else max(blocks, key=len)
    explanation = re.sub(r"```python[\s\S]*?```", "", text).strip()
    return main_block.strip(), explanation

def get_or_create_project_meta(proj_dir: Path) -> dict:
    meta_file = proj_dir / "project.json"
    if meta_file.exists():
        try:
            return json.loads(meta_file.read_text(encoding="utf-8"))
        except:
            pass
    
    created_at = str(proj_dir.stat().st_ctime)
    label = proj_dir.name
    chat_file = proj_dir / "chat.json"
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
    
    meta = {
        "id": proj_dir.name,
        "name": label,
        "createdAt": created_at,
        "updatedAt": str(time.time()),
        "activeTheme": "Catppuccin Mocha",
        "isPinned": False,
        "tags": []
    }
    meta_file.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    return meta

def render_scene(proj_dir: Path, code: str) -> tuple[bool, str, str]:
    proj_dir.mkdir(parents=True, exist_ok=True)
    scene_file = proj_dir / "scene.py"
    scene_file.write_text(code, encoding="utf-8")

    scene_classes = re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\):", code)
    if not scene_classes:
        scene_classes = ["Scene"]

    media_dir = proj_dir / "media"
    media_dir.mkdir(exist_ok=True)

    # Single Scene Quick Render
    if len(scene_classes) == 1:
        sc = scene_classes[0]
        cmd = [
            sys.executable,
            "-m",
            "manim",
            "-ql",
            str(scene_file),
            sc,
            "--media_dir",
            "media",
        ]
        try:
            proc = subprocess.run(cmd, cwd=str(proj_dir), capture_output=True, text=True, timeout=120)
            if proc.returncode == 0:
                mp4_files = list(media_dir.glob(f"**/{sc}.mp4")) or list(media_dir.glob("**/*.mp4"))
                if mp4_files:
                    latest = max(mp4_files, key=lambda f: f.stat().st_mtime)
                    rel = latest.relative_to(proj_dir).as_posix()
                    url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                    return True, url, "Render complete"
                return True, "", "No video file found"
            else:
                return False, "", proc.stderr or proc.stdout
        except Exception as e:
            return False, "", str(e)

    # Multi-Chapter / Long Video Render & Merge
    rendered_videos = []
    errors = []
    for sc in scene_classes:
        cmd = [
            sys.executable,
            "-m",
            "manim",
            "-ql",
            str(scene_file),
            sc,
            "--media_dir",
            "media",
        ]
        try:
            proc = subprocess.run(cmd, cwd=str(proj_dir), capture_output=True, text=True, timeout=120)
            sc_mp4s = list(media_dir.glob(f"**/{sc}.mp4"))
            if sc_mp4s:
                rendered_videos.append(sc_mp4s[0])
            elif proc.returncode != 0:
                errors.append(f"[{sc} Error]: {proc.stderr[:200]}")
        except Exception as e:
            errors.append(f"[{sc} Error]: {str(e)}")

    if rendered_videos:
        if len(rendered_videos) == 1:
            rel = rendered_videos[0].relative_to(proj_dir).as_posix()
            url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
            return True, url, f"Rendered 1 of {len(scene_classes)} chapters"

        concat_list_file = media_dir / "auto_concat_list.txt"
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
        try:
            subprocess.run(ffmpeg_cmd, cwd=str(proj_dir), capture_output=True, timeout=60)
            rel = merged_output.relative_to(proj_dir).as_posix()
            url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
            return True, url, f"Successfully rendered & merged all {len(rendered_videos)} chapters into 1 Master Video!"
        except Exception as e:
            rel = rendered_videos[0].relative_to(proj_dir).as_posix()
            url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
            return True, url, f"Merged fallback: {str(e)}"

    return False, "", "\n".join(errors) or "Failed to compile multi-chapter video"

def call_llm(prompt: str, current_code: str = "", agent_id: str = "agy", api_key_override: str = "", endpoint_override: str = "") -> tuple[str | None, str]:
    api_key = (api_key_override or os.environ.get("OPENROUTER_API_KEY", "")).strip()
    if not api_key:
        return None, "Lỗi: Chưa cấu hình API Key. Vui lòng thiết lập biến môi trường OPENROUTER_API_KEY hoặc nhập API Key trong phần Cài đặt (Settings)."
    endpoint_url = endpoint_override or "https://openrouter.ai/api/v1/chat/completions"

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
        endpoint_url,
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
        with urllib.request.urlopen(req, timeout=60) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"]
            code, explanation = extract_scene_code(content)
            if code:
                return code, explanation
            else:
                return None, content.strip()
    except Exception as e:
        print(f"LLM API Error with model {model_name}: {e}", file=sys.stderr)
        return None, f"Lỗi kết nối AI ({model_name}): {e}"

class ManimForgeHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Cache-Control, X-API-Key, X-Custom-Endpoint")
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
                    meta = get_or_create_project_meta(item)
                    projects.append({
                        "id": meta.get("id", item.name),
                        "name": meta.get("name", item.name),
                        "created_at": meta.get("createdAt", str(item.stat().st_ctime)),
                        "active_theme": meta.get("activeTheme", "Catppuccin Mocha"),
                        "is_pinned": meta.get("isPinned", False),
                        "tags": meta.get("tags", [])
                    })
            projects.sort(key=lambda x: (not x.get("is_pinned", False), x["id"]))
            if not projects:
                initial_id = f"proj_{int(time.time()*1000)}"
                new_p = proj_dir / initial_id
                new_p.mkdir(parents=True, exist_ok=True)
                meta = get_or_create_project_meta(new_p)
                projects = [{
                    "id": initial_id,
                    "name": "Video 1",
                    "created_at": str(time.time()),
                    "active_theme": "Catppuccin Mocha",
                    "is_pinned": False,
                    "tags": []
                }]
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

        if path == "/api/project_video":
            qs = urllib.parse.parse_qs(parsed.query)
            proj_id = qs.get("project_id", [""])[0]
            proj_dir = get_projects_dir() / proj_id
            media_dir = proj_dir / "media"
            if media_dir.exists():
                merged = media_dir / "master_merged.mp4"
                if merged.exists():
                    rel = merged.relative_to(proj_dir).as_posix()
                    url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                    self.send_json({"video_url": url})
                    return

                mp4_files = list(media_dir.glob("**/*.mp4"))
                if mp4_files:
                    latest_mp4 = max(mp4_files, key=lambda f: f.stat().st_mtime)
                    rel = latest_mp4.relative_to(proj_dir).as_posix()
                    url = f"http://127.0.0.1:{PORT}/media/{proj_dir.name}/{rel}"
                    self.send_json({"video_url": url})
                    return
            self.send_json({"video_url": None})
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

        if path == "/api/chat_stream":
            prompt = data.get("prompt", "")
            agent_id = data.get("model", "agy")
            proj_id = data.get("project_id", "")
            current_code = data.get("current_code", "")
            custom_api_key = data.get("api_key") or self.headers.get("X-API-Key", "")
            custom_endpoint = data.get("endpoint") or self.headers.get("X-Custom-Endpoint", "")

            proj_dir = get_projects_dir() / proj_id

            api_key = (custom_api_key or os.environ.get("OPENROUTER_API_KEY", "")).strip()
            endpoint_url = custom_endpoint or "https://openrouter.ai/api/v1/chat/completions"

            if not api_key:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self.end_headers()
                err_msg = "Lỗi: Chưa cấu hình API Key. Vui lòng thiết lập biến môi trường OPENROUTER_API_KEY hoặc nhập API Key trong phần Cài đặt (Settings)."
                self.wfile.write(f"data: {json.dumps({'type': 'error', 'error': err_msg})}\n\n".encode("utf-8"))
                self.wfile.flush()
                return

            model_name, clean_prompt = resolve_model(agent_id, prompt)

            user_msg = f"User: {clean_prompt}\n\n[Current scene.py code:\n```python\n{current_code}\n```]" if current_code and len(current_code.strip()) > 0 else f"User: {clean_prompt}"

            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg}
                ],
                "temperature": 0.3,
                "stream": True
            }

            req = urllib.request.Request(
                endpoint_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/lux0166/ManimForge",
                    "X-Title": "ManimForge Studio",
                    "User-Agent": "ManimForge/1.0"
                },
                data=json.dumps(payload).encode("utf-8")
            )

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            accumulated_text = ""
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    for line in resp:
                        line = line.decode("utf-8").strip()
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk["choices"][0]["delta"].get("content", "")
                                if delta:
                                    accumulated_text += delta
                                    sse_payload = json.dumps({"type": "token", "content": delta})
                                    self.wfile.write(f"data: {sse_payload}\n\n".encode("utf-8"))
                                    self.wfile.flush()
                            except:
                                pass

                # Stream completed, parse code safely
                code, explanation = extract_scene_code(accumulated_text)
                if code:
                    render_start_payload = json.dumps({"type": "render_start", "code": code})
                    self.wfile.write(f"data: {render_start_payload}\n\n".encode("utf-8"))
                    self.wfile.flush()

                    success, video_url, msg = render_scene(proj_dir, code)

                    done_payload = json.dumps({
                        "type": "done",
                        "is_code_update": True,
                        "success": success,
                        "code": code,
                        "explanation": explanation,
                        "video_url": video_url,
                        "message": msg
                    })
                    self.wfile.write(f"data: {done_payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                else:
                    done_payload = json.dumps({
                        "type": "done",
                        "is_code_update": False,
                        "success": True,
                        "code": None,
                        "explanation": accumulated_text.strip(),
                        "video_url": None,
                        "message": "Chat response"
                    })
                    self.wfile.write(f"data: {done_payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
            except Exception as e:
                err_payload = json.dumps({"type": "error", "message": str(e)})
                self.wfile.write(f"data: {err_payload}\n\n".encode("utf-8"))
                self.wfile.flush()
            return

        if path == "/api/chat":
            prompt = data.get("prompt", "")
            agent_id = data.get("model", "agy")
            proj_id = data.get("project_id", "")
            current_code = data.get("current_code", "")
            custom_api_key = data.get("api_key") or self.headers.get("X-API-Key", "")
            custom_endpoint = data.get("endpoint") or self.headers.get("X-Custom-Endpoint", "")

            proj_dir = get_projects_dir() / proj_id
            code, explanation = call_llm(prompt, current_code, agent_id, custom_api_key, custom_endpoint)

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
            
            scene_classes = re.findall(r"class\s+([A-Za-z0-9_]+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\):", code)
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
                subprocess.run(ffmpeg_cmd, cwd=str(proj_dir), capture_output=True, timeout=60)
                
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
            
            class_match = re.search(r"class\s+([A-Za-z0-9_]+)\s*\(\s*(?:Scene|ThreeDScene|MovingCameraScene)\s*\):", code or (scene_file.read_text(encoding="utf-8") if scene_file.exists() else ""))
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
                    meta = get_or_create_project_meta(proj_dir)
                    meta["name"] = new_name
                    meta["updatedAt"] = str(time.time())
                    (proj_dir / "project.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
                    self.send_json({"status": "renamed", "project_id": proj_id, "name": new_name})
                    return
            self.send_json({"status": "error", "message": "Project not found"})
            return

        if path == "/api/pin_project":
            proj_id = data.get("project_id", "")
            is_pinned = data.get("is_pinned", False)
            if proj_id:
                proj_dir = get_projects_dir() / proj_id
                if proj_dir.exists():
                    meta = get_or_create_project_meta(proj_dir)
                    meta["isPinned"] = bool(is_pinned)
                    meta["updatedAt"] = str(time.time())
                    (proj_dir / "project.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
                    self.send_json({"status": "pinned", "project_id": proj_id, "is_pinned": is_pinned})
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
                    meta = get_or_create_project_meta(new_dir)
                    meta["id"] = new_id
                    meta["name"] = f"{meta.get('name', 'Video')} (Copy)"
                    meta["createdAt"] = str(time.time())
                    (new_dir / "project.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
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
