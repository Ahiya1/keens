# Keens (2L) — systems that build systems

**⭐ CURRENT VERSION** — Recursive orchestration for agents/tasks/pipelines with observability and clean ops.

---

## What is Keens?

**Keens** (also known as **2L** - "Two Level" or "Let systems build systems") is the current, production-ready recursive orchestration engine that allows systems to build and manage other systems autonomously.

### Core Concepts

- **🔄 Recursive Orchestration** - agents that spawn agents, tasks that spawn tasks
- **🤖 Autonomous Development** - AI agents that build, test, and deploy code
- **👁️ Observability** - full visibility into agent behavior and decisions
- **🧘 Clean Operations** - calm, repeatable, debuggable system design

---

## Philosophy

> "Let systems build systems."

Keens embodies the **Method** - it makes building calm and repeatable. Every project built with Keens follows the same clean patterns, whether it's a simple todo app or a complex multi-agent system.

---

## Architecture

Keens uses **Claude Sonnet 4** with:
- 1M context window for full codebase awareness
- Extended thinking blocks for complex reasoning
- Recursive agent spawning for specialized tasks
- Phase-driven execution: `EXPLORE → PLAN → FOUND → SUMMON → COMPLETE`

---

## Evolution

The method evolved through several iterations:

**a2 → a2s → a2s2 → keen → keens** (current)

Each version refined the orchestration patterns, culminating in the current Keens implementation.

---

## Usage

```bash
# Install globally
npm install -g keen

# Or link for development
cd /path/to/keens && npm link

# Login
keen login

# Build something
keen breathe "Build a REST API with Express and TypeScript"

# Interactive mode
keen converse
```

---

## Real-World Applications

Keens has been used to build:
- ✅ **SelahOS** - presence-first operating system
- ✅ **Mirror of Dreams** - reflective journaling engine
- ✅ **Wealth** - conscious finance tracker

All built using the 2L method: from vision to deployment in days, not weeks.

---

## Status

✅ **Production ready** — actively used for real projects.

_Part of the Method + Mission framework._
