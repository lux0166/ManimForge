# 🌌 ManimForge Studio

<div align="center">

**Next-Gen Desktop IDE for Mathematical Animations & Physics Visualizations**  
*Powered by Tauri v2, React 19, Manim Community Engine & Autonomous CLI Agents*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-blue?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Manim Community](https://img.shields.io/badge/Manim-v0.21-ECE6E2?style=for-the-badge&logo=python&logoColor=black)](https://www.manim.community/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 🌟 Overview

**ManimForge Studio** is a modern, high-performance desktop application designed to supercharge the workflow of educators, researchers, mathematicians, and content creators authoring mathematical animations with [Manim Community](https://www.manim.community/).

Built on top of **Tauri 2.0** and **React 19**, ManimForge combines instant code editing, live video playback, parameter tweaking, and autonomous AI coding agents into a cohesive, fluid workspace.

---

## ✨ Key Features

### 1. 🤖 Autonomous CLI Agent Hub (`PromptBar`)
- **Multi-Agent Orchestration**: Seamlessly interact with terminal coding agents including **Google DeepMind Antigravity CLI (`agy`)**, **OpenCode CLI (`opencode`)**, and **Cline CLI (`cline`)**.
- **WebGL Rainbow Sweep**: Dynamic `glimm` rainbow shader sweep celebrating model transitions.
- **`@` Data Tokens & `/` Slash Commands**: Rapidly query `@scene.py`, `@variables`, `@manim-docs`, or trigger `/render`, `/fix`, `/optimize`, and `/export`.
- **Keyboard-First Plan Mode**: Effortlessly toggle between Direct Execution and **Plan Mode** (`agy • Plan ▾`) using the **`Tab`** key without any layout shift.

### 2. 🧠 Expandable Thinking & Activity Traces (`ThinkingState`)
- **Multi-Variant Process Tracing**: 4 distinct modes (`Steps`, `Reasoning`, `Search`, `Coding`).
- **Shimmer Text Gradient & Animated Vertical Guide Line**: Visual feedback of the AI's internal reasoning loop before executing code modifications.
- **Interactive Tool Inspection**: Inspect diff lines (`+48 -12`), files read, and shell commands executed in real-time.

### 3. 🗳️ Human-in-the-Loop Decision Cards (`ApprovalCard`)
- **Vertical Sliding Question Stack**: Smooth `translate3d` question transitions with dynamic height auto-adaptation.
- **Rolling Odometer Digits**: Tactile step counter for question progression (`1 / 3` → `2 / 3`).
- **Glide Cursor Effects**: Powered by `GlideMenu` with support for both radio auto-advance and multi-select checkboxes.

### 4. 🎛️ Live Parameter Inspector & Monaco Code Editor
- **Interactive Parameter Sliders**: Tweak mathematical variables in real time with instant reflection in the scene.
- **Full Monaco IDE**: Syntax highlighting for Python / Manim, AST error detection, and 1-Click Auto-Fix for render failures.
- **Math Snippet Palette**: 1-click insertion for LaTeX formulas, matrices, coordinate grids, calculus Riemann sums, and neural network topologies.

### 5. ⚡ 60fps Live Preview & Storyboard Timeline
- **High-Performance Video Scrubber**: Frame-by-frame scrubbing, 4K/1080p/720p resolution switching, and zoom controls.
- **Storyboard Timeline**: Visual scene transitions, pacing controller, and frame markers.
- **Ambient Shader Backgrounds**: Powered by `@paper-design/shaders-react` for an immersive dark-mode aesthetic.

---

## 🛠️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      ManimForge Studio                      │
├──────────────────────────────┬──────────────────────────────┤
│       Frontend (UI/UX)       │    Native Backend (Rust)     │
├──────────────────────────────┼──────────────────────────────┤
│ • React 19 + TypeScript      │ • Tauri v2 Desktop Engine    │
│ • Tailwind CSS v4            │ • Tokio Async Subprocesses   │
│ • Motion (Framer Motion)     │ • CLI Detector & Runner      │
│ • @beui Component Suite      │ • Manim Community Engine     │
│ • Monaco Editor              │ • FFmpeg Video Transcoding   │
│ • glimm WebGL Shader         │ • Project File Manager       │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: v18.0 or higher
- **Rust & Cargo**: Latest stable toolchain (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Python**: 3.10+ with Manim Community (`pip install manim`)
- **FFmpeg**: Required by Manim for video compilation

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lux0166/ManimForge.git
   cd ManimForge
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Tauri desktop application in development mode**:
   ```bash
   npm run tauri dev
   ```

4. **Build production binaries**:
   ```bash
   npm run tauri build
   ```

---

## 📂 Project Structure

```
ManimForge/
├── src/
│   ├── components/
│   │   ├── agents/          # ThinkingState, Tool Result, Agent Activity
│   │   ├── atoms/           # Button atoms & base primitives
│   │   ├── cards/           # ApprovalCard (Human-in-the-loop)
│   │   ├── chat/            # PromptBar, ChatPanel, Composer
│   │   ├── editor/          # Monaco Code Editor Panel
│   │   ├── inspector/       # Variable & Parameter Inspector
│   │   ├── navigation/      # ProximitySidebar Timeline Minimap
│   │   ├── palette/         # Math Snippet Palette
│   │   ├── preview/         # 60fps Video Player & Shader Canvas
│   │   └── storyboard/      # Storyboard Timeline controller
│   ├── lib/
│   │   ├── tauri-bridge.ts  # IPC communication with Rust backend
│   │   └── utils.ts         # Utility functions
│   ├── theme.css            # Custom design tokens & keyframes
│   └── App.tsx              # Root application layout
├── src-tauri/
│   ├── src/
│   │   ├── cli_detector.rs  # Auto-detection of installed CLI agents
│   │   ├── cli_runner.rs    # Subprocess execution & streaming
│   │   ├── manim_engine.rs  # Manim compilation & rendering pipeline
│   │   └── main.rs          # Tauri command registration
│   └── tauri.conf.json      # Window, security & bundle configuration
└── README.md
```

---

## 📄 License

This project is proprietary and licensed under the MIT License.

---

<div align="center">
Built with 💙 for the Mathematical Animation Community
</div>
