# Eval Harness

Tests the context-memory skill two ways. `generator.test.mjs` checks the generator's contract in throwaway folders. The rest runs clean-room agent sessions on the prompts in `../evals.json`, each in a copy of a fixture project from `../fixtures`, grades what each session left behind, and packages it blind for critics. Maintainer-only. The skill's `AGENTS.md` says when to run it and what counts as a pass.

## Needs

- The `claude` CLI signed in, for Claude Opus sessions, and the `codex` CLI signed in, for GPT Sol sessions.
- Python 3.11 or later, Git, and Node.js 20 or later.

## Generator contract

`node generator.test.mjs` runs in seconds, needs no agent, and exits 1 on any failure. Run it after every change to `scripts/index.mjs`.

## Agent sessions

1. Pick a run folder outside the home folder and every Git repository, with no spaces in its path, and export it as `EVAL_ROOT`. `run.py` refuses anything else, because a session there could discover the owner's own skills.
2. Snapshot the skill twice under `EVAL_ROOT`: as last committed (`git archive HEAD | tar -x -C "$EVAL_ROOT/skill-old/context-memory"`) and as changed (`SKILL.md`, `package.json`, and `scripts/` copied into `$EVAL_ROOT/skill-new/context-memory`).
3. Write a jobs file with one line per session, `<round>-<eval name>-<arm>-<model> <eval name> <opus|sol> <snapshot folder> 1200`, naming the arms `old` and `new`, for every eval with both models and both arms.
4. `python batch.py <jobs file> 6` runs them, six at a time. Each session runs until its process exits or the timeout passes, so work it hands to a background agent counts.
5. `python grade.py <jobs file> <round>` grades every check assertion, marks a missing or unfinished session as failing, and writes a blind package per eval under `$EVAL_ROOT/judge/<round>-<eval>`, with the whole resulting project, the diff, and the final reply for each letter.
6. Read each `key.json` yourself and give `CRITIC.md` to two critics per eval, each told the letters it judges: a GPT critic for the Claude-built letters and a Claude critic for the GPT-built ones. They grade the semantic assertions and list blocking findings.
7. Answer every blocking finding against a new session in writing, resume the critic with the answers, and record how each settled in `critic-answers.json` in that judge folder.
8. `python compare.py <jobs file> <round>` exits 0 only when the pass bar in `AGENTS.md` holds.
9. Delete `EVAL_ROOT`. Each session's `cfg` folder holds a copy of the CLI's credentials.

Each session gets a config folder of its own holding only the credentials, so the owner's instruction files, memory, plugins, and MCP servers are not configured for it. This is configuration isolation, not a file-system sandbox: the prompt keeps each session in its working folder, and the session records show what it read.
