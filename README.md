# Context Memory Skill

An Agent Skill that gives a project a `Context/` directory: its memory, written as Markdown in the repository, so what a project knows survives the session that learned it.

## Why

Agents forget between sessions, and the memory a harness offers is keyed to one machine or one path, invisible in a diff, and lost on a move. A `Context/` directory is versioned with the code, readable by any agent or person, and travels with a clone. One fact has one owner, so two copies never drift apart in silence. And an agent that follows this skill writes down what it decides, learns, and plans as it works, without being asked to remember, so a fresh session can pick up where the last one stopped.

## How it works

- `Context/` holds plans, decisions, status, research, and records, each stated as what is true now. Rules for how an agent works stay in `AGENTS.md`, so knowledge and instructions never blur.
- Every document opens with frontmatter whose description says what it holds and when it is useful. A generated index in `Context/AGENTS.md` lists those descriptions, and the project's `AGENTS.md` imports it. A harness that follows imports starts every session with the index, and any other is told to read it first. Either way an agent opens only what the task needs.
- `Archive/` keeps history out of the active set without deleting it. `Context-Inbox/` is where people and helpers drop material for the agent that owns Context to file.
- A consolidation pass reads the whole active set and puts it back in order, and the generator says when one is due.

## Install

Put the skill where your agent harness looks for skills. As a Git submodule in the cross-tool folder:

```bash
git submodule add https://github.com/LeeorNahum/context-memory-skill.git .agents/skills/context-memory
```

Some harnesses read a folder of their own instead, so check where yours looks. Then ask your agent to set up a Context directory for the project. It creates the folder, writes the first documents, and adds the import to `AGENTS.md`.

## Files

- `SKILL.md` contains the Context directory contract: reading, capture, filing, the index, and validation.
- `references/structure.md` covers setting up a Context directory and reshaping its documents.
- `references/upkeep.md` covers Archive, the inbox, and the consolidation pass.
- `scripts/index.mjs` regenerates the active index and reports what needs attention in the directory.
- `AGENTS.md` is the maintenance contract for editing this skill, with the design notes behind each rule.

## Running the generator

Straight from this repository, with nothing on disk:

```bash
npx --yes github:LeeorNahum/context-memory-skill <path-to-Context>
```

With the skill on disk:

```bash
node <skill-root>/scripts/index.mjs <path-to-Context>
```

Both routes run the same script and need Node. The remote route also needs npm, Git, and network access. Run it with `--help` for the flags.
