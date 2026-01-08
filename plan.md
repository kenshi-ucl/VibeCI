# VibeCI — Autonomous Code Engineer

**One-line:** An autonomous agent that writes, tests, debugs, and ships verified code changes with reproducible CI evidence and human-readable explanations.

**Goal:** Build a judge-optimized, production-quality Devpost submission that demonstrates an agentic Vibe Engineering workflow: *task → plan → code → run tests → diagnose → fix → re-run → verified PR + artifacts.*

---

## Why this will score highly

* **Technical Execution (40%)**: Full stack system, automated test-run loops, artifact generation (logs, diffs, screenshots), use of Gemini 3 agentic features and AI Studio Build/Antigravity for verification.  Show working code and CI.
* **Innovation/Wow (30%)**: Not just an LLM that writes code — it **proves** the code works autonomously and self-corrects. Include automated browser-based verification (Antigravity) and recorded failure→fix traces.
* **Impact (20%)**: Benefits developers and engineering teams (huge market) by reducing debugging time and increasing delivery confidence.
* **Demo (10%)**: Extremely visual flow (red tests → agent reasoning → green tests + PR + CI logs). Record a 60–90s demo highlighting this flow.

---

## High-level architecture

```
    User UI (task form)             CI/CD Dashboard               Demo Viewer
           |                              |                            |
           v                              v                            v
      Orchestrator Server ----------> Test Runner (containerized) --- Artifact Store
           |                                 ^                            |
           |                                 |                            v
      Gemini Agent (Planner & Reflector)    |--------------------> Browser Verification (Antigravity)
           |                                 |
           v                                 v
     Code Generator (templates + diff) -> Repo (feature branch) -> Run tests -> Diagnose
```

Components:

1. **Frontend** — simple React UI for submitting tasks and showing live trace & artifacts (optional but good for demo).
2. **Orchestrator Backend** — Node.js/Express or Python/Flask server to coordinate agent steps, store state, and call Gemini API.
3. **Gemini Agent Layer** — system prompts, short-term memory (in DB), Thought Signatures (reasoning checkpoints), tool-calls.
4. **Code Generator & Patcher** — templated code outputs, unified diff generator, commit automation to a test repo.
5. **Test Runner** — Dockerized runner that runs unit/integration tests and returns structured logs.
6. **Failure Analyzer** — takes test logs, creates a focused debugging task for Gemini to propose patches.
7. **Re-run Loop** — re-run tests after patch, repeat until pass or timeout.
8. **Antigravity / Browser Verifier** — run end-to-end integration checks inside an automated browser and capture screenshots.
9. **Artifact Store & Devpost Package Builder** — save diffs, logs, CI artifacts, screenshots, and export a ZIP for submission.

---

## Tech Stack (recommended)

* Backend: **Node.js** (TypeScript) or **Python** (FastAPI) — pick what you know best.
* Frontend: **React** (create-react-app or Vite) for demo UI.
* CI: **GitHub Actions** for continuous integration and demo reproducibility.
* Containerization: **Docker** for test runners and reproducible environments.
* Gemini API: use official Gemini 3 endpoints via AI Studio / API.
* Antigravity: use Build tab automation for browser verification flows.
* Repo & Hosting: GitHub + Vercel/Netlify for UI (optional).
* Artifact storage: GitHub Actions artifacts + S3-compatible or direct file store in app.
* Database: SQLite (dev) or small managed DB (Postgres) for state and Thought Signatures.
* Logging: structured JSON logs stored as artifacts.

---

## Agent design & prompts (practical templates)

### A. System-level intent (for Gemini)

```
You are VibeCI: an autonomous code engineer. Your goal: given a repo state and a task description, produce a minimal, well-tested code change that satisfies the task. You must:
- Propose a short Plan with steps.
- Generate one or more code patches (unified diff) and explain each change concisely.
- Provide unit/integration tests that fail before the change and pass after (or explain why passing isn't possible).
- If tests fail, analyze logs, generate focused follow-up actions, and attempt fixes.
- Keep responses structured as JSON with 'plan', 'patches', 'tests', 'explanation', and 'next_steps'.

Constrain outputs to 3 iterations per task by default. Always include a short human-readable summary and a long machine-readable trace (Thought Signature).
```

### B. Example user task prompt

```
Task: "Add email-based signup to the authentication service using the existing User model. Provide unit tests and ensure rate-limiting for signup attempts."
Repo context: (short summary of files and test output included)
```

### C. Output schema (force Gemini to use JSON)

```
{
  "plan": ["step 1", "step 2"],
  "patches": [{"file":"path/to/file", "diff":"--- ... +++ ..."}],
  "tests": [{"file":"tests/test_signup.py", "content":"def test_signup..."}],
  "explanation":"human-friendly explanation",
  "thought_signature":{"iteration":1, "reasoning_summary":"..."}
}
```

**Implementation note:** Use short-context summaries (file diffs + failing logs) rather than sending the entire repo; rely on Gemini's long-context window for larger contexts when needed.

---

## Example pseudocode: orchestration flow

```python
# Pseudocode (Python) for one iteration
repo_snapshot = clone_repo(repo_url, branch='feature/auto')
context = summarize_repo(repo_snapshot)
user_task = get_task_from_ui()
iteration = 0
while iteration < 3:
    prompt = build_prompt(context, user_task, last_test_output)
    ai_response = call_gemini(prompt)
    patches = ai_response['patches']
    apply_patches(repo_snapshot, patches)

    test_output = run_tests_in_docker(repo_snapshot)
    save_artifact(test_output)

    if test_output.passed:
        create_pr_and_report(repo_snapshot, ai_response)
        break
    else:
        analysis_prompt = build_diagnosis_prompt(test_output)
        ai_fix = call_gemini(analysis_prompt)
        apply_patches(repo_snapshot, ai_fix['patches'])
    iteration += 1

# After loop, collect logs, diffs, screenshots and produce final report.
```

---

## CI, Testing & Antigravity Integration

* **GitHub Actions**: workflow to run tests, build artifacts, and optionally run the same agent on push (demo reproducibility).
* **Test Runner**: each run executes inside a Docker container to ensure reproducibility; test logs are captured in structured JSON.
* **Antigravity**: write browser-based verification scripts (Playwright or Puppeteer) that run the live app (if UI) to verify E2E behaviors. Capture screenshots / DOM snapshots.
* Save all artifacts back to the submission artifact folder.

---

## Security, Terms & Safety (must-follow items)

* Do not ship any code that violates the hackathon rules (no medical advice, no disallowed content).
* Ensure you do not leak secrets: store API keys in GitHub Actions secrets and do not write them to logs.
* Respect rate limits and free tier constraints — prefer small demo repos so runs are cheap.
* For recording the demo, avoid showing real private data; use synthetic or anonymized data.

---

## Sprint plan (6 total milestones — 2 weeks/fast track or 4 weeks moderate)

**Sprint 0 (Prep, 1–2 days)**

* Pick tech stack (Node or Python)
* Create demo repo with a small failing test case (toy auth service or calculator with failing tests)
* Create project skeleton and GitHub repo

**Sprint 1 (Core agent orchestration, 3 days)**

* Implement Orchestrator that calls Gemini API with the system prompt
* Implement repo cloning & snapshot mechanism
* Simple UI endpoint to submit a task

**Sprint 2 (Code generation & apply patches, 3 days)**

* Implement patch apply (git commit automation)
* Implement generation of unified diffs and tests
* Run initial end-to-end: agent generates a patch and commits

**Sprint 3 (Automated testing loop, 4 days)**

* Implement Dockerized test runner and structured log capture
* Connect test output back into orchestration loop
* Implement 2–3 automatic iterations of fix → re-run

**Sprint 4 (Antigravity & verification, 3 days)**

* Add Playwright/Puppeteer verification flows (Antigravity)
* Capture screenshots and DOM snapshots as artifacts
* Add automated generation of a PR with diff, logs, and screenshots

**Sprint 5 (Polish, docs, Devpost package, 2–3 days)**

* Create demo video (90s), architecture diagram, README, and a one-page impact statement
* Finalize Devpost repo and submission materials

---

## Repo structure (recommended)

```
/ (root)
  /backend  # orchestrator + agent integration
  /agent_prompts  # canonical prompts, system messages
  /demo_repo  # sample repo the agent will work on (small, controlled)
  /test_runner  # docker images & test harness
  /antigravity  # browser verification scripts
  /frontend  # demo UI (optional)
  /scripts  # utility scripts for building artifacts
  README.md
  DEVPOST.md  # final submission text
```

---

## Demo script (60–90s)

1. 0–10s: Title card and one-line problem statement: “Add email signup and pass tests”
2. 10–25s: Show failing tests in CI (red) and the user pressing Run in UI
3. 25–45s: Show agent plan and 1–2 concise plan bullets (auto-generated) + patch applied
4. 45–60s: Show test runner re-run and green tests; show PR created with diff and artifact links
5. 60–90s: Show Antigravity screenshot of E2E flow and a short voiceover explaining impact & metrics

**Recording notes:** Use screen capture with terminal logs showing timestamps. Highlight the agent’s reasoning summary (not chain-of-thought) and artifact links.

---

## Devpost Submission Checklist (minimum required)

* Public GitHub repo with code and README (how to run locally).
* A 90-second demo video embedded in submission.
* Architecture diagram and short technical description (300–500 words).
* Link to live demo or reproducible GitHub Actions run (artifact links).
* Clear explanation of how Gemini 3 was used (system prompts, tool calls, Antigravity usage).
* Ethical and safety notes and verification that no disallowed content was used.

---

## Evaluation metrics to show in the submission

* **Autonomy score:** # of successful auto-fix iterations before human input
* **Fix rate:** % of tasks fully fixed autonomously in ≤3 iterations
* **Time saved:** average developer time saved (estimated from test runs)
* **Reproducibility:** # of demo runs that passed in CI (n=3) with same artifacts

---

## Risks & mitigation

* *Risk:* Agent produces brittle or insecure patches.
  *Mitigation:* Limit scope of demos to small, well-understood repos; add static analysis checks (lint, bandit) in CI.
* *Risk:* Gemini hallucinations or irrelevant patches.
  *Mitigation:* Use incremental diffs, run unit tests and static analysis; keep iterations small and anchored with failing logs.
* *Risk:* Time/resource constraints.
  *Mitigation:* Use minimal demo repo, caching, and Github Actions for reproducible runs.

---

## Final notes (for judges)

* Emphasize the verification artifacts: raw failing test logs, diffs, screenshots, and a short human-friendly summary of what the agent did.
* Include a short appendix in the Devpost explaining Thought Signatures (structured summary checkpoint after each iteration) and how they help auditing and reproducibility.
* Provide a `repro.sh` that runs the entire demo locally (clone repo, start test runner, call orchestrator for a recorded task).

---

## Agent Prompts & Schemas (READY TO USE)

Below are **drop-in prompt files and schemas** you can place directly into `agent_prompts/`. These are written to maximize autonomy, verification, and judge clarity while staying within hackathon rules.

---

### `agent_prompts/system.md`

```text
You are VibeCI, an autonomous code engineer operating in the Action Era.

MISSION
Given a repository snapshot and a task, you must produce a minimal, correct, and verifiable code change.

CORE PRINCIPLES
- Autonomy: operate without human intervention once started.
- Verification: every change must be validated via tests or browser checks.
- Minimalism: change as little code as necessary.
- Auditability: every step must produce artifacts (logs, diffs, screenshots).

ALLOWED ACTIONS
- Propose a plan.
- Generate unified diffs.
- Add or modify tests.
- Analyze test and runtime logs.
- Iterate fixes up to the configured limit.

CONSTRAINTS
- Do NOT provide chain-of-thought or hidden reasoning.
- Provide short reasoning summaries only.
- Never fabricate test results.
- If blocked, clearly state why and stop.

SUCCESS CRITERIA
- All required tests pass.
- Verification artifacts are produced.
- A human-readable summary is included.
```

---

### `agent_prompts/planner.md`

```text
You are the Planning module of VibeCI.

INPUTS
- Task description
- Repository summary

OUTPUT
Return a JSON array of atomic steps. Each step must be executable and verifiable.

RULES
- Steps must be ordered.
- Each step should have a clear success condition.
- Do not include implementation details.

OUTPUT FORMAT
{
  "plan": ["step 1", "step 2", "step 3"]
}
```

---

### `agent_prompts/patch_generator.md`

```text
You are the Patch Generator.

INPUTS
- Plan
- Relevant files

TASK
Generate minimal unified diffs that implement the plan.

RULES
- Only modify files necessary for the task.
- Preserve existing style and conventions.
- Each patch must be self-contained.

OUTPUT FORMAT
{
  "patches": [
    {
      "file": "path/to/file",
      "diff": "--- a/... +++ b/..."
    }
  ]
}
```

---

### `agent_prompts/test_generator.md`

```text
You are the Test Generator.

TASK
Create or update tests that:
- Fail before the patch
- Pass after the patch

RULES
- Use the project's existing test framework.
- Keep tests minimal and focused.

OUTPUT FORMAT
{
  "tests": [
    {
      "file": "tests/test_feature.py",
      "content": "def test_feature(): ..."
    }
  ]
}
```

---

### `agent_prompts/failure_analyzer.md`

```text
You are the Failure Analyzer.

INPUTS
- Test logs
- Runtime errors

TASK
Identify the root cause and propose corrective actions.

RULES
- Base analysis strictly on provided logs.
- Do not speculate beyond evidence.

OUTPUT FORMAT
{
  "analysis": "short diagnosis",
  "next_steps": ["fix X", "re-run tests"]
}
```

---

### `agent_prompts/fix_generator.md`

```text
You are the Fix Generator.

TASK
Generate corrective patches based on failure analysis.

RULES
- Address only the identified issue.
- Do not refactor unrelated code.

OUTPUT FORMAT
{
  "patches": [
    {
      "file": "path/to/file",
      "diff": "--- a/... +++ b/..."
    }
  ]
}
```

---

### `agent_prompts/thought_signature.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ThoughtSignature",
  "type": "object",
  "properties": {
    "iteration": { "type": "integer" },
    "summary": { "type": "string" },
    "artifacts": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["iteration", "summary"]
}
```

---

### `agent_prompts/final_report.md`

```text
You are generating the final human-facing report.

INCLUDE
- What was requested
- What was changed
- Verification evidence
- Limitations or remaining risks

FORMAT
Short paragraphs + bullet points. No raw logs.
```

