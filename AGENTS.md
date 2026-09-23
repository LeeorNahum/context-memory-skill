# AGENTS.md

Rules for editing the **context-memory (CM)** skill. User-facing guidance lives in `SKILL.md`. `README.md` is the human skim layer.

## File roles

| File | Role |
| --- | --- |
| `SKILL.md` | Context ownership, capture, organization, frontmatter, indexing, Archive, Context-Inbox, and consolidation |
| `scripts/index.mjs` | Regenerates the compact active index, validates active frontmatter, warns on shape and density, and reports when a consolidation pass is due |
| `README.md` | Short human summary that sells the idea |
| `AGENTS.md` | This maintenance contract and the design notes behind the rules |

## Design notes

Each rule in `SKILL.md` exists for one of these reasons. An edit that weakens a rule must answer its reason.

- Context replaces harness memory because one fact kept in two stores drifts silently, and harness memory is keyed to a machine or a path and does not move with the repository.
- Agents save stated views unasked because a user should not have to say "remember this". The description carries that trigger because it is the only part of the skill in context before the skill loads.
- Knowledge lives in Context and agent rules live in `AGENTS.md`, so instructions never scatter across topical documents.
- One fact has one owner and other documents link to it, so an update happens in one place.
- The index lists every active description because an agent cannot search for a document it does not know exists. The index is paid on every load, so the skill caps file count and description shape, not document length.
- Descriptions choose what to read. They are not summaries, so they stay short and change only when a document's subject changes.
- Markdown is the default because it is the cheapest format to read and diff. The HTML rule exists for the one case where presentation is the point.
- Archive moves material without rewriting it and is never in the active index, at any depth, because archiving must be cheap for agents to archive often. Archive holds whole documents someone opens on purpose. Updating a current document in place is not deletion, because in a Git repository history keeps what it said before, so "delete almost nothing" is about knowledge, not about old wording.
- Context-Inbox exists because people and helpers avoid moving or deleting files, and filing needs the one agent that knows which document owns each fact. The name says the workflow: things arrive, get filed, and the box empties.
- Consolidation is triggered by the generator's cadence because the generator runs after every Context change and its warnings are already work. A pass that depends on someone remembering does not happen. A waiting Context-Inbox is reported as its own drain task rather than as a pass, so an inbox that fills every run does not demand a whole-directory audit every run.
- Generator findings are warnings, not errors, apart from invalid frontmatter, a refused pass record, and a bad invocation. A hard failure gets bypassed, and a warning gets acted on.
- The generator has no dependencies, gives the same output every run, and knows only its current name. A rename is finished by hand in every repository rather than carried as compatibility in the script, because the script has one user and compatibility never leaves.

## Editing

- Bump `metadata.version` with semver whenever accepted behavior changes.
- Quote frontmatter string values and keep bullets capitalized and parallel.
- Use no em dashes and no prose-joining semicolons.
- Keep the skill opinionated without repeating one point in several sections. Rationale lives here, rules live in `SKILL.md`.
- Keep `SKILL.md` in the order an agent meets the work: when the skill applies, what it supersedes, how to read, how to write, how to maintain, how to finish.
- Judge guidance from the reader's real task, audience, and scale.
- Encourage meaningful subdirectories before a topic becomes a flat file pile.
- Keep the generator zero-dependency, compact, deterministic, and idempotent.
- Preserve the managed block guards, the consolidation marker above them, and authored content outside them.
- Prefer editorial warnings over new hard gates.
- Keep the README to the idea and the durable behavior: why a Context directory, what the pieces are, how to run the generator. It never restates rules, thresholds, or flags that only `SKILL.md` and the script own, so it cannot drift from them.

## Before finishing

- `SKILL.md` and `README.md` describe the same behavior, and `SKILL_NAME` in the script equals the frontmatter `name`, so new guards carry the current name.
- The version changed if and only if accepted behavior changed.
- Script syntax, help, scratch generation, Archive exclusion at every depth, and two-pass idempotency pass.
- The consolidation marker survives a plain run, is read back on the next run, and `--consolidated` is refused while errors or Context-Inbox files remain.
- A frontmatter block with a `metadata:` mapping, a list, or a block scalar under an optional key indexes cleanly.
- The index uses one linked bullet per active document followed by an arrow and its description, and contains no individual assets.
- Directory-density guidance supports useful depth without creating empty hierarchy.
- No repeated Archive or Context-Inbox explanation bloats the skill.
- No em dashes or prose-joining semicolons were introduced.
