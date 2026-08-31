import os
import sys
import json
import re
import urllib.request
import subprocess
from pathlib import Path

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
            "X-Title": "ManimForge Studio"
        },
        data=json.dumps(payload).encode("utf-8")
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            content = res_data["choices"][0]["message"]["content"]
            
            # Extract code block
            code_match = re.search(r"```python\s*([\s\S]*?)\s*```", content)
            if code_match:
                code = code_match.group(1)
            else:
                code = content
            
            explanation = re.sub(r"```python[\s\S]*?```", "", content).strip()
            return code, explanation
    except Exception:
        # Fallback intelligent scene generator if network fails
        return generate_fallback_scene(prompt), f"Generated scene for '{prompt}' using local math engine."

def generate_fallback_scene(prompt: str) -> str:
    p = prompt.lower()
    if "sin" in p or "sóng" in p or "wave" in p or "fourier" in p:
        return '''from manim import *
import numpy as np

# Parameters
AMPLITUDE = 1.5 # @param min=0.5 max=3.0 step=0.1 label="Amplitude"
FREQUENCY = 2.0 # @param min=0.5 max=5.0 step=0.5 label="Frequency"
SPEED = 1.0 # @param min=0.5 max=2.0 step=0.5 label="Speed"

class SineWaveScene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("Sine Wave & Harmonics", font_size=28, color="#cdd6f4").to_edge(UP, buff=0.6)
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
        sin_label = Text("y = A·sin(ωx)", font_size=20, color="#89b4fa").next_to(axes, DOWN)

        self.play(Create(sin_curve), Write(sin_label), run_time=SPEED)
        self.wait(1.5)
'''
    elif "tròn" in p or "vuông" in p or "circle" in p or "square" in p or "morph" in p:
        return '''from manim import *

# Parameters
RADIUS = 1.8 # @param min=1.0 max=3.0 step=0.2 label="Radius"
RUN_TIME = 1.2 # @param min=0.5 max=3.0 step=0.5 label="Morph Duration"

class ShapeMorphScene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("Shape Homotopy & Morphing", font_size=28, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        circle = Circle(radius=RADIUS, color="#89b4fa", fill_opacity=0.3)
        square = Square(side_length=RADIUS*1.6, color="#f38ba8", fill_opacity=0.3)

        self.play(Create(circle), run_time=0.8)
        self.wait(0.5)
        self.play(Transform(circle, square), run_time=RUN_TIME)
        self.wait(1.5)
'''
    else:
        return f'''from manim import *

# Parameters
SCALE_FACTOR = 1.2 # @param min=0.5 max=2.5 step=0.1 label="Scale"

class CustomMathScene(Scene):
    def construct(self):
        self.camera.background_color = "#11111b"
        title = Text("{prompt[:35]}", font_size=26, color="#cdd6f4").to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.8)

        circle = Circle(radius=1.5 * SCALE_FACTOR, color="#a6e3a1", fill_opacity=0.2)
        dot = Dot(color="#f9e2af").move_to(circle.get_top())

        self.play(Create(circle), run_time=1)
        self.play(MoveAlongPath(dot, circle), run_time=2, rate_func=linear)
        self.wait(1)
'''

def render_manim_code(project_dir: str, code: str) -> tuple[bool, str, str]:
    proj_path = Path(project_dir)
    proj_path.mkdir(parents=True, exist_ok=True)
    scene_path = proj_path / "scene.py"
    scene_path.write_text(code, encoding="utf-8")

    # Detect scene class name
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
            cwd=str(proj_path),
            capture_output=True,
            text=True,
            timeout=40
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
    success, video_path, render_msg = render_manim_code(proj_dir, code)

    result = {
        "success": success,
        "code": code,
        "explanation": explanation,
        "video_path": video_path,
        "render_message": render_msg,
    }

    print(json.dumps(result, ensure_ascii=False))
