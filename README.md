# VibeCI — Autonomous Code Engineer

<p align="center">
  <img src="https://img.shields.io/badge/AI-Gemini%203%20Pro-blue?style=for-the-badge" alt="Gemini 3 Pro" />
  <img src="https://img.shields.io/badge/Framework-Node.js-green?style=for-the-badge" alt="Node.js" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge" alt="React" />
  <img src="https://img.shields.io/badge/Testing-Jest-C21325?style=for-the-badge" alt="Jest" />
</p>

An autonomous agent that **writes, tests, debugs, and ships** verified code changes with reproducible CI evidence and human-readable explanations.

## 🎯 What is VibeCI?

VibeCI is an AI-powered development assistant that takes a task description and autonomously:

1. **Plans** the implementation approach
2. **Generates** code patches
3. **Runs** tests to verify changes
4. **Diagnoses** failures and iterates on fixes
5. **Produces** verification artifacts (logs, diffs, screenshots)

All without human intervention until the task is complete.

## ✨ Key Features

- 🤖 **Fully Autonomous**: Task → Plan → Code → Test → Fix → Verified PR
- 🔄 **Self-Correcting**: Automatically analyzes test failures and generates fixes
- 📊 **Reproducible**: All actions produce artifacts (logs, diffs, screenshots)
- 🎨 **Modern UI**: Real-time trace viewer and artifact browser
- 🐳 **Containerized**: Docker-based test runner for isolation
- 🌐 **Browser Verification**: Playwright-based E2E testing

## 🏗️ Architecture

```
    User UI (React)                CI/CD Dashboard               Artifacts
           │                              │                          │
           ▼                              ▼                          ▼
      Orchestrator Server ────────► Test Runner (Docker) ───► Artifact Store
           │                              ▲                          │
           │                              │                          ▼
      Gemini Agent ◄──────────────────────┴────────────► Browser Verification
           │
           ▼
     Code Generator ──► Repo ──► Run Tests ──► Diagnose ──► Fix ──► Repeat
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API Key ([Get one here](https://aistudio.google.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vibeci.git
cd vibeci

# Install dependencies
npm install

# Install workspaces
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd demo_repo && npm install && cd ..

# Set your API key
export GEMINI_API_KEY=your_api_key_here
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Running the Demo

```bash
# Make the script executable
chmod +x scripts/repro.sh

# Run the full demo
./scripts/repro.sh
```

## 📁 Project Structure

```
vibeci/
├── backend/                 # Node.js/Express backend
│   └── src/
│       ├── services/        # Core services
│       │   ├── orchestrator.ts    # Main orchestration loop
│       │   ├── gemini.ts          # Gemini API integration
│       │   ├── git.ts             # Repository operations
│       │   ├── patcher.ts         # Diff application
│       │   ├── testRunner.ts      # Test execution
│       │   └── artifacts.ts       # Artifact storage
│       ├── routes/          # API endpoints
│       └── database/        # SQLite persistence
├── frontend/                # React/Vite frontend
│   └── src/
│       ├── components/      # UI components
│       │   ├── Dashboard.tsx
│       │   ├── TaskForm.tsx
│       │   ├── TraceViewer.tsx
│       │   └── ArtifactViewer.tsx
│       └── App.tsx
├── agent_prompts/           # AI agent prompts
├── demo_repo/               # Sample repo for demonstrations
├── test_runner/             # Docker test runner
├── antigravity/             # Playwright E2E tests
└── scripts/                 # Utility scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/vibeci.db
MAX_ITERATIONS=3
TEST_TIMEOUT=60000
```

## 📡 API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get task details |
| GET | `/api/tasks/:id/events` | Get task events |
| GET | `/api/tasks/:id/thoughts` | Get thought signatures |
| GET | `/api/tasks/:id/artifacts` | Get task artifacts |

### WebSocket

Connect to `ws://localhost:3001/ws` and subscribe to tasks:

```javascript
ws.send(JSON.stringify({ type: 'subscribe', taskId: 'task-id' }));
```

## 🧪 Demo Repository

The `demo_repo/` contains a simple authentication service with intentionally failing tests. The tests expect an `email signup` feature that is not implemented. VibeCI's job is to:

1. Analyze the failing tests
2. Understand what's needed
3. Implement the signup feature
4. Make all tests pass

## 📊 Evaluation Metrics

| Metric | Description |
|--------|-------------|
| **Autonomy Score** | # of successful auto-fix iterations before human input |
| **Fix Rate** | % of tasks fully fixed autonomously in ≤3 iterations |
| **Time Saved** | Average developer time saved (estimated) |
| **Reproducibility** | # of demo runs that passed with same artifacts |

## 🎥 Demo Video

[Watch the 90-second demo video](https://youtube.com/your-demo-link)

The demo shows:
1. Failing tests (red)
2. Agent planning and reasoning
3. Patches being applied
4. Tests passing (green)
5. Generated artifacts and report

## 🔒 Security & Safety

- API keys stored in environment variables (never committed)
- Limited scope for demo (controlled repository)
- Static analysis checks in CI
- No medical advice or disallowed content

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, Vite, TypeScript
- **AI**: Google Gemini 3 Pro (gemini-3-pro-preview)
- **Database**: SQLite (better-sqlite3)
- **Testing**: Jest, Playwright
- **Git**: simple-git
- **Real-time**: WebSocket (ws)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Google Gemini team for the powerful AI capabilities
- The open-source community for the amazing tools

---

<p align="center">
  Built with ❤️ for the Gemini Hackathon
</p>
