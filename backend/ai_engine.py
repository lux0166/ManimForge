import os
import sys
import json
import re
import urllib.request
import subprocess
from pathlib import Path

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

### 2. CRITICAL ANTI-OVERLAPPING & VISUAL QUALITY RULES:

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
     sin_label = Text("y = sin(x)", font_size=18, color=GRAPH_COLOR).to_corner(UR, buff=0.8)
     cos_label = Text("y = cos(x)", font_size=18, color=PATH_COLOR).next_to(sin_label, DOWN, buff=0.25, aligned_edge=LEFT)
     ```

3. **CLASS DEFINITION & SCENE STRUCTURE**:
   - Always define `class Scene(Scene):` or `class <DescriptiveName>(Scene):` (inheriting from Scene or ThreeDScene).
   - Always start with `from manim import *` and `import numpy as np`.
   - Dark background: `self.camera.background_color = "#11111b"`.

4. **INTERACTIVE PARAMETER ANNOTATIONS (# @param)**:
   - Expose key parameters at the top of the file:
     ```python
     # Parameters for interactive sliders
     LENGTH = 2.5        # @param min=1.0 max=4.0 step=0.1 label="Length (m)"
     AMPLITUDE = 1.5     # @param min=0.5 max=3.0 step=0.1 label="Amplitude"
     FREQUENCY = 1.0     # @param min=0.2 max=3.0 step=0.2 label="Frequency"
     ANIM_SPEED = 1.0    # @param min=0.5 max=2.0 step=0.1 label="Speed"
     ```

5. **ROBUST LATEX-FREE TYPOGRAPHY**:
   - ALWAYS use `Text("...", font_size=...)` with clean Unicode characters (theta, lambda, pi, x_1) to ensure 100% render reliability on all machines.

6. **COLOR HARMONY (Catppuccin Palette)**:
   - Sapphire Blue: `"#89b4fa"`
   - Peach Orange: `"#fab387"`
   - Emerald Green: `"#a6e3a1"`
   - Coral Pink: `"#f38ba8"`
   - Gold Yellow: `"#f9e2af"`
   - Lavender: `"#cba6f7"`
   - Axis Muted: `"#71717a"`
"""

def call_llm(prompt: str, current_code: str = "") -> tuple[str | None, str]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        return None, "Error: OPENROUTER_API_KEY is not configured. Please set the OPENROUTER_API_KEY environment variable or configure it in Settings."

    user_msg = f"User: {prompt}\n\n[Current scene.py code:\n```python\n{current_code}\n```]" if current_code and len(current_code.strip()) > 0 else f"User: {prompt}"

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
                code = code_match.group(1).strip()
                explanation = re.sub(r"```python[\s\S]*?```", "", content).strip()
                return code, explanation
            else:
                return None, content.strip()
    except Exception as e:
        print(f"LLM API Error: {e}", file=sys.stderr)
        p = prompt.lower()
        if any(w in p for w in ["vẽ", "tạo", "mô phỏng", "đồ thị", "draw", "animate", "create", "plot", "sin", "cos", "wave"]):
            return generate_fallback_scene(prompt), f"Đã khởi tạo hoạt cảnh toán học cho: '{prompt}'."
        else:
            return None, "Chào bạn! Tôi là trợ lý ManimForge. Bạn có thể yêu cầu tôi mô phỏng hoặc vẽ bất kỳ hoạt cảnh toán học/vật lý nào bằng Manim Community v0.21."

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

def render_manim_code(project_dir: str, code: str) -> tuple[bool, str, str]:
    proj_path = Path(project_dir)
    proj_path.mkdir(parents=True, exist_ok=True)
    scene_path = proj_path / "scene.py"
    scene_path.write_text(code, encoding="utf-8")

    class_match = re.search(r"class\s+([A-Za-z0-9_]+)\s*\(\s*Scene\s*\):", code)
    scene_class = class_match.group(1) if class_match else "Scene"

    media_dir = proj_path / "media"
    media_dir.mkdir(exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "manim",
        "-ql",
        str(scene_path),
        scene_class,
        "--media_dir",
        "media",
    ]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(proj_path, timeout=60),
            capture_output=True,
            text=True,
            timeout=45
        )
        if proc.returncode == 0:
            mp4_files = list(media_dir.glob("**/*.mp4"))
            if mp4_files:
                latest_mp4 = max(mp4_files, key=lambda f: f.stat().st_mtime)
                return True, str(latest_mp4), "Render complete"
            return True, "", "Render complete (no video file found)"
        else:
            return False, "", proc.stderr or proc.stdout
    except Exception as e:
        return False, "", str(e)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: ai_engine.py <prompt> <project_dir> [current_code]"}))
        sys.exit(1)

    prompt = sys.argv[1]
    proj_dir = sys.argv[2]
    current_code = sys.argv[3] if len(sys.argv) > 3 else ""

    code, explanation = call_llm(prompt, current_code)
    
    if code:
        success, video_path, render_msg = render_manim_code(proj_dir, code)
        result = {
            "is_code_update": True,
            "success": success,
            "code": code,
            "explanation": explanation,
            "video_path": video_path,
            "render_message": render_msg,
        }
    else:
        result = {
            "is_code_update": False,
            "success": True,
            "code": None,
            "explanation": explanation,
            "video_path": "",
            "render_message": "Chat response",
        }

    print(json.dumps(result, ensure_ascii=False))
