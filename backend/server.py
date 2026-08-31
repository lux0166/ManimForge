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

PORT = 8765

def get_projects_dir() -> Path:
    home = Path.home()
    p = home / "Documents" / "ManimForge" / "Projects"
    p.mkdir(parents=True, exist_ok=True)
    return p

SYSTEM_PROMPT = """You are ManimForge AI, an elite Mathematical Animation Engineer specializing in Manim Community Edition v0.21.
Your task is to generate complete, elegant, and bug-free Python Manim code based on the user's request.

Rules:
1. Always import manim: `from manim import *`
2. Create a Scene subclass named `Scene` or descriptive name: `class Scene(Scene):` or `class MyMathScene(Scene):`
3. Include configurable parameters with comments formatted as:
   `PARAM_NAME = <number> # @param min=<min> max=<max> step=<step> label="<Label>"`
4. Prefer `Text("...")` with Unicode symbols (e.g. `x₁`, `θ`, `π`, `ŷ`, `→`) or valid MathTex.
5. Provide a dark background: `self.camera.background_color = "#11111b"`
6. Keep animations concise, smooth, and aesthetic with proper pacing (`run_time=1.0`, `self.wait(1)`).
7. Return your response in Markdown with the Python code block:
```python
# your code
```
Followed by a brief explanation of the mathematical animation.
"""

def call_llm(prompt: str, current_code: str = "") -> tuple[str, str]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        api_key = "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"

    user_msg = f"User Request: {prompt}\n\nCurrent scene.py code:\n```python\n{current_code}\n```" if current_code else f"User Request: {prompt}"

    payload = {
        "model": "deepseek/deepseek-chat",
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
                code = code_match.group(1)
            else:
                code = content
            
            explanation = re.sub(r"```python[\s\S]*?```", "", content).strip()
            return code, explanation
    except Exception as e:
        print(f"LLM API Error: {e}", file=sys.stderr)
        return generate_fallback_scene(prompt), f"Generated math visualization for '{prompt}'."

def generate_fallback_scene(prompt: str) -> str:
    p = prompt.lower()
    if "sin" in p or "cos" in p or "sóng" in p or "wave" in p or "fourier" in p:
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
    elif "tròn" in p or "vuông" in p or "circle" in p or "square" in p or "morph" in p:
        return '''from manim import *

# Parameters
RADIUS = 1.8 # @param min=1.0 max=3.0 step=0.2 label="Radius"
RUN_TIME = 1.2 # @param min=0.5 max=3.0 step=0.5 label="Morph Duration"

class Scene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("Circle to Square Morph", font_size=28, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        circle = Circle(radius=RADIUS, color="#89b4fa", fill_opacity=0.3)
        square = Square(side_length=RADIUS*1.6, color="#a6e3a1", fill_opacity=0.3)

        self.play(Create(circle), run_time=0.8)
        self.wait(0.5)
        self.play(Transform(circle, square), run_time=RUN_TIME)
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
            proj_id = qs.get("project_id", ["proj_1"])[0]
            proj_dir = get_projects_dir() / proj_id
            scene_file = proj_dir / "scene.py"
            code = scene_file.read_text(encoding="utf-8") if scene_file.exists() else ""
            self.send_json({"code": code})
            return

        if path == "/api/load_chat":
            qs = urllib.parse.parse_qs(parsed.query)
            proj_id = qs.get("project_id", ["proj_1"])[0]
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
            model = data.get("model", "agy")
            proj_id = data.get("project_id", "proj_1")
            current_code = data.get("current_code", "")

            proj_dir = get_projects_dir() / proj_id
            code, explanation = call_llm(prompt, current_code)
            success, video_url, msg = render_scene(proj_dir, code)

            self.send_json({
                "success": success,
                "code": code,
                "explanation": explanation,
                "video_url": video_url,
                "message": msg,
            })
            return

        if path == "/api/render":
            proj_id = data.get("project_id", "proj_1")
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
            proj_id = data.get("project_id", "proj_1")
            code = data.get("code", "")
            proj_dir = get_projects_dir() / proj_id
            proj_dir.mkdir(parents=True, exist_ok=True)
            (proj_dir / "scene.py").write_text(code, encoding="utf-8")
            self.send_json({"status": "saved"})
            return

        if path == "/api/save_chat":
            proj_id = data.get("project_id", "proj_1")
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
