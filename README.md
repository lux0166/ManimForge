# 🌌 ManimForge Studio

<div align="center">

**Next-Gen Desktop IDE for Mathematical Animations & Physics Visualizations**  
*Powered by Tauri v2, React 19, Manim Community Engine (v0.21) & Autonomous CLI Coding Agents*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Manim Community](https://img.shields.io/badge/Manim-v0.21-ECE6E2?style=for-the-badge&logo=python&logoColor=black)](https://www.manim.community/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🌟 Overview

**ManimForge Studio** is a professional desktop IDE tailored for mathematicians, researchers, educators, and content creators authoring mathematical animations with [Manim Community v0.21](https://www.manim.community/).

Built with **Tauri 2.0**, **React 19**, and a **Multi-threaded Python Backend**, ManimForge combines real-time code generation, interactive variable sliders, animation keyframe scrubbers, multi-scene storyboards, and autonomous CLI coding agents into a unified, dark-mode workspace.

---

## ✨ Key Features

### 1. 🤖 Intelligent Mathematical AI Assistant & Slash Commands
- **Autonomous CLI Agent Hub**: Real-time integration with **Google DeepMind Antigravity CLI (`agy`)**, **OpenCode CLI (`opencode`)**, and **Cline CLI (`cline`)**.
- **Real Model Routing**: Dynamic routing to state-of-the-art models (**DeepSeek-V3 / DeepSeek-R1**, **OpenAI GPT-4o / GPT-4o-mini**, **Qwen 2.5 Coder 32B**).
- **Dynamic `/model` Slash Command**: Switch models on-the-fly directly from the chat prompt (e.g. `/model qwen`, `/model gpt-4o`, `/model deepseek`).
- **Conversational Separation**: Distinguishes casual math discussions and questions from video generation requests.
- **Typewriter Code Streaming**: Real-time progressive code streaming directly into Monaco Editor.

### 2. 🎛️ Interactive Parameter Sliders & Inspector (`Variables` Tab)
- **`# @param` AST Parser**: Automatically extracts configurable parameters from python code:
  ```python
  AMPLITUDE = 1.5      # @param min=0.5 max=3.0 step=0.1 label="Amplitude"
  FREQUENCY = 2.0      # @param min=0.5 max=5.0 step=0.5 label="Frequency"
  COLOR_PRIMARY = "#89b4fa" # @param type=color label="Wave Color"
  ```
- **Reactive UI Controls**: Drag sliders or pick colors to immediately update the code and re-render the scene in real time without typing code manually.

### 3. ⏱️ Animation Keyframe Timeline & Scrubber
- **Animation Milestone Extraction**: Parses `self.play(...)` and `self.wait(...)` run times from the scene code.
- **Interactive Scrubber**: Displays color-coded animation milestone chips directly under the video player.
- **Click-to-Seek**: Jump the video player to any specific animation milestone instantly.

### 4. 🎬 Multi-Scene Storyboard & Master Video Merger
- **Multi-Scene Organization**: Discovers all `class SceneName(Scene):` in your project.
- **Sequential Storyboard Grid**: Preview individual scene components independently.
- **1-Click Master Video Merger**: Automatically compiles all scenes and concatenates them with FFmpeg into a continuous master lecture video (`master_merged.mp4`).

### 5. 📁 Project Lifecycle & Native Context Menu
- **Full Context Menu**: Right-click any project in the sidebar to:
  - 📌 **Pin to Top / Unpin**: Keep priority animations at the top.
  - ✏️ **Rename**: Inline editing of project titles.
  - 📑 **Duplicate**: Clone entire scenes with code and chat history.
  - 🗑️ **Delete**: Clean removal from disk and UI.
- **Instant Search Bar**: Filter through projects in real time.

### 6. 🚀 1080p60 & 4K Master Video Export
- Export clean production videos in **1080p60** or **4K** with automatic browser download.
- 1-Click AI Auto-Fix that repairs syntax and compiler errors from stack traces automatically.

---

## 🛠️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ManimForge Studio                             │
├──────────────────────────────┬─────────────────────────────────────────┤
│       Frontend (UI/UX)       │           Backend Engine                │
├──────────────────────────────┼─────────────────────────────────────────┤
│ • React 19 + TypeScript      │ • Multi-Threaded Python 3.14 Server     │
│ • Tailwind CSS v4            │ • Manim Community Edition v0.21.0       │
│ • Monaco Code Editor         │ • Cairo & FFmpeg Vector Compilation     │
│ • Interactive Sliders Panel  │ • Dynamic OpenRouter LLM Gateway        │
│ • Keyframe Timeline Scrubber │ • Real System CLI Detector              │
│ • Multi-Scene Storyboard     │ • Multi-Scene FFmpeg Stitching Pipeline │
└──────────────────────────────┴─────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: 3.10+ with Manim Community (`pip install manim`)
- **FFmpeg**: Installed and added to system PATH

### Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lux0166/ManimForge.git
   cd ManimForge
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Python Backend & Dev Server**:
   ```bash
   # Terminal 1: Start Backend Server
   python backend/server.py

   # Terminal 2: Start Frontend Dev Server (or Tauri)
   npm run dev
   # or
   npm run tauri dev
   ```

4. **Open in Browser or Desktop App**:
   - Web App: `http://localhost:5173`
   - Native Desktop: Tauri window launches automatically.

---

## 📂 Codebase Structure

```
ManimForge/
├── backend/
│   ├── server.py              # Multi-threaded API & video streaming server
│   └── ai_engine.py           # LLM synthesis & Manim v0.21 scene generator
├── src/
│   ├── components/
│   │   ├── chat/              # PromptBar, ChatPanel, Model Dropdown
│   │   ├── editor/            # Monaco Code Editor & VariableInspector (Sliders)
│   │   ├── preview/           # Video Player, KeyframeTimeline, StoryboardPanel
│   │   └── sidebar/           # AppSidebar with Context Menu (Pin/Rename/Delete)
│   ├── lib/
│   │   └── tauri-bridge.ts    # Dual-mode API bridge (Tauri IPC + Browser Fetch)
│   ├── App.tsx                # Studio layout & state orchestrator
│   └── theme.css              # Dark HUD tokens & animations
├── src-tauri/                 # Tauri native desktop configuration & Rust runner
└── README.md
```

---

## 📄 License

This project is licensed under the MIT License.

<div align="center">
Built with 💙 for the Mathematical Animation Community
</div>
