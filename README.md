# Context Memory Skill

An Agent Skill that gives a project a `Context/` directory: its memory, written as Markdown in the repository, so what a project knows survives the session that learned it.

## Why

Agents forget between sessions, and the memory a harness offers is keyed to one machine or one path, invisible in a diff, and lost on a move. A `Context/` directory is versioned with the code, readable by any agent or person, and travels with a clone. One fact has one owner, so two copies never drift apart in silence. And an agent that follows this skill saves what you tell it the first time, without being asked to remember.

## How it works

- `Context/` holds plans, decisions, status, research, and records. Rules for how an agent works stay in `AGENTS.md`, so knowledge and instructions never blur.
- Every document opens with frontmatter whose description says what it holds and when it is useful. A generated index in `Context/AGENTS.md` lists those descriptions, so an agent reads the index and opens only what the task needs.
- `Archive/` keeps history out of the active set without deleting it. `Context-Inbox/` is where people and helpers drop material for the agent that owns Context to file.
- A consolidation pass reads the whole active set and puts it back in order, and the generator says when one is due.

## Files

- `SKILL.md` contains the Context directory contract.
- `scripts/index.mjs` regenerates the active index, validates active frontmatter, warns when a directory or a description has outgrown its shape or a Context-Inbox is waiting, and says when a consolidation pass is due.
- `package.json` exposes the generator as a `bin`, so it runs from the repository without being installed.
- `AGENTS.md` is the maintenance contract for editing this skill, with the design notes behind each rule.

## Running the generator

With the skill on disk, as a submodule or in a global skills folder:

```bash
node <skill-root>/scripts/index.mjs <path-to-Context>
```

Without it on disk, straight from this repository:

```bash
npx --yes github:LeeorNahum/context-memory-skill <path-to-Context>
```

Both routes run the same script and need only Node. The remote route fetches from GitHub the first time on a machine. Run it with `--help` for the flags.

## Validation

```bash
node --check scripts/index.mjs
node scripts/index.mjs --help
```

## Install

```bash
git submodule add https://github.com/LeeorNahum/context-memory-skill.git .agents/skills/context-memory
```
