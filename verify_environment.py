#!/usr/bin/env python3
"""
ManimForge Studio - Cross-Platform Environment Doctor
Run this script on ANY machine (Windows / macOS / Linux) to verify all prerequisites.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def print_status(component: str, is_ok: bool, details: str = ""):
    icon = "[OK]" if is_ok else "[FAILED]"
    print(f"  {icon:8} {component:<25} {details}")

def main():
    print("=" * 65)
    print("      ManimForge Studio - System Readiness Diagnostic")
    print("=" * 65)

    all_passed = True

    # 1. Python Version Check
    py_ver = sys.version_info
    py_ok = py_ver >= (3, 10)
    print_status("Python Runtime", py_ok, f"v{py_ver.major}.{py_ver.minor}.{py_ver.micro} (Requires 3.10+)")
    if not py_ok: all_passed = False

    # 2. Manim Community Check
    try:
        res = subprocess.run([sys.executable, "-m", "manim", "--version"], capture_output=True, text=True, timeout=10)
        manim_ok = res.returncode == 0
        manim_ver = res.stdout.strip() if manim_ok else "Not installed"
        print_status("Manim Engine", manim_ok, f"{manim_ver} (pip install manim)")
        if not manim_ok: all_passed = False
    except Exception as e:
        print_status("Manim Engine", False, "Not found in Python environment")
        all_passed = False

    # 3. FFmpeg Transcoder Check
    ffmpeg_path = shutil.which("ffmpeg")
    ffmpeg_ok = bool(ffmpeg_path)
    print_status("FFmpeg Binary", ffmpeg_ok, ffmpeg_path or "Missing in PATH (Required for MP4 export)")
    if not ffmpeg_ok: all_passed = False

    # 4. Node.js & npm Check
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")
    node_ok = bool(node_path and npm_path)
    print_status("Node.js & npm", node_ok, f"Node: {bool(node_path)}, npm: {bool(npm_path)}")
    if not node_ok: all_passed = False

    # 5. User Storage Directory Check
    home = Path.home()
    storage_dir = home / "Documents" / "ManimForge" / "Projects"
    try:
        storage_dir.mkdir(parents=True, exist_ok=True)
        storage_ok = storage_dir.exists() and os.access(str(storage_dir), os.W_OK)
    except:
        storage_ok = False
    print_status("Project Storage", storage_ok, str(storage_dir))
    if not storage_ok: all_passed = False

    # 6. Local CLI Coding Agents Check
    print("\n  --- Detected Local CLI Coding Agents (Optional) ---")
    for agent in ["agy", "opencode", "cline", "claude", "cursor", "codex", "ollama"]:
        p = shutil.which(agent)
        status_txt = f"Found: {p}" if p else "Not installed (Cloud AI Fallback)"
        print(f"    - {agent:<10}: {status_txt}")

    print("=" * 65)
    if all_passed:
        print("  [SUCCESS] All core prerequisites are verified and ready!")
        print("  You can launch the studio with:")
        print("    1. python backend/server.py")
        print("    2. npm run dev (or npm run tauri dev)")
    else:
        print("  [WARNING] Some prerequisites are missing.")
        print("  Quick setup commands:")
        print("    - pip install -r requirements.txt")
        print("    - Install FFmpeg and add to PATH")
    print("=" * 65)

if __name__ == "__main__":
    main()
