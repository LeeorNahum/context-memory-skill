# AGENTS.md

Rules for editing the **context-memory** skill. User-facing guidance lives in `SKILL.md`. `README.md` is the human skim layer.

## File roles

| File | Role |
| --- | --- |
| `SKILL.md` | Context ownership, capture, organization, frontmatter, indexing, Archive, Context-Inbox, and consolidation |
| `scripts/index.mjs` | Regenerates the compact active index, validates active frontmatter, warns on shape, density, and Markdown links that do not resolve, and reports when a consolidation pass is due |
| `README.md` | Short human summary that sells the idea |
| `AGENTS.md` | This maintenance contract and the design notes behind the rules |
| `evals/` | Behavioral test prompts with their assertions, the fixture project they run in, and the clean-room harness. Maintainer-only, never installed with the skill |

## Design notes

Each rule in `SKILL.md` exists for one of these reasons. An edit that weakens a rule must answer its reason.

- Context replaces harness memory because one fact kept in two stores drifts silently, and harness memory is keyed to a machine or a path and does not move with the repository.
- Agents save unasked because a user should not have to say "remember this". Capture covers plans, changes in state, and discoveries, not only stated views, because a session that recorded every opinion but not the plan still leaves the next session unable to continue. The description names any work in an eligible project, not only work that turns out to matter, so the skill is already loaded when a fact needs saving rather than after, and a turn with nothing durable simply writes nothing.
- Capture keeps knowledge, not a log of actions, and keeps proposals, attempts, and inferences apart from what was agreed, finished, and confirmed, so broad loading does not fill Context with noise or turn a suggestion into a decision.
- A changed fact is reconciled across the documents that depend on it in the same turn, because updating one owner while a plan or routine elsewhere still states the old fact leaves the handoff wrong until the next consolidation pass.
- The handoff test gives the fresh agent only the repository, never the next step, because the next step is exactly what an unrecorded plan loses. It checks whether the knowledge can be found, not whether another agent would make identical choices.
- Knowledge lives in Context and agent rules live in `AGENTS.md`, so instructions never scatter across topical documents.
- One fact has one owner and other documents link to it, so an update happens in one place.
- The index lists every active description because an agent cannot search for a document it does not know exists. The index is paid on every load, so the skill caps file count and description shape, not document length.
- Descriptions choose what to read. They are not summaries, so they stay short and change only when a document's subject changes.
- Markdown is the default because it is the cheapest format to read and diff. The HTML rule exists for the one case where presentation is the point.
- Archive moves material without rewriting it and is never in the active index, at any depth, because archiving must be cheap for agents to archive often. Archive holds whole documents someone opens on purpose. Updating a current document in place is not deletion, because in a Git repository history keeps what it said before, so "delete almost nothing" is about knowledge, not about old wording.
- Context-Inbox exists because people and helpers avoid moving or deleting files, and filing needs the one agent that knows which document owns each fact. The name says the workflow: things arrive, get filed, and the box empties.
- Consolidation is triggered by the generator's cadence because the generator runs after every Context change and its warnings are already work. A pass that depends on someone remembering does not happen. A waiting Context-Inbox is reported as its own drain task rather than as a pass, so an inbox that fills every run does not demand a whole-directory audit every run.
- A due consolidation pass starts in the turn that sees it, in a fresh background subagent when one is available, because agents that were allowed to defer a pass with a reason deferred it every time, and a working session full of its own task is the wrong context to audit a whole directory. Only the user defers one.
- The generator adds `Context-Inbox/` to the repository's `.gitignore` itself, because agents asked to do it by hand kept missing it and the fix is mechanical, idempotent, and owned by this convention.
- A move is finished only when everything that pointed at the old place points at the new one, and most of what points at a Context document lives outside Context: instruction files, work folders, and other repositories. A pass scoped to the directory leaves links from outside broken, and regenerating the index alone does not show it, so the rule names the whole project and the projects that link in, and the generator checks links instead of trusting the search.
- The link check reads all of Context but only inbound links outside it, because the skill owns Context and the links into it, not the rest of the tree. The folder that holds Context is read without being asked, hidden folders included, since a flag an agent must remember is a check that does not run, and any other folder is named once with `--links` and remembered for the same reason. Letter case must match, so a rename that only changes case is caught on a file system that would hide it. Reference-style definitions are not read, because a transcript line shaped like `[Name]: word` would be reported as a broken link.
- A pass is refused while a link does not resolve, as it is for a waiting inbox, because both mean the pass is not finished. A link whose target is gone is unlinked, so the refusal has a way out wherever the session may edit, and elsewhere the user decides.
- A pass keeps what the text says: every fact and pending step, the wording of a step as a step, and who a statement belongs to. Rewriting for order tends to turn a pending step into a status sentence, an inference into the source's claim, and a partial move into a note that claims the whole.
- `date_modified` says when a document's knowledge last changed. A pass that retargets links or marks records superseded touches most files, and bumping the date for that makes every document look equally fresh.
- `--check` writes nothing, so a reviewer or a session that does not own a Context can run the same checks without changing it.
- Generator findings are warnings, not errors, apart from invalid frontmatter, a refused pass record, and a bad invocation. A hard failure gets bypassed, so a warning names the action and when it starts instead of failing the run.
- The generator has no dependencies, gives the same output every run, and knows only its current name. A rename is finished by hand in every repository rather than carried as compatibility in the script, because the script has one user and compatibility never leaves.

## Editing

- Bump `metadata.version` by the release-versioning skill's rules for skills.
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

## Behavioral testing

A change to what the skill asks an agent to do, or to what the generator does, is proven before it is committed. Hold the whole change to the monolith-audit skill.

1. Run `node evals/harness/generator.test.mjs` after any change to the generator, and add a case for every branch the change adds.
2. Find the evals in `evals/evals.json` whose prompt exercises the change, and make sure an assertion decides it. A structural fact (a file, a CSV row, a marker, an ignore rule) is a `check` with a function in `evals/harness/grade.py`. A question of meaning (whether a decision is recorded as decided, whether a stale line remains) is `semantic` and graded by the critics. When no eval exercises the change, add one: a request a real person would type in the fixture project, never mentioning memory, Context, or the rule, with a fixture overlay in `evals/fixtures` when the base project cannot show it. Keep a restraint eval beside every kind of capture, so a broader rule is measured against noise as well as against misses.
3. Snapshot the skill as last committed and as changed, and run every eval with both snapshots and both models, following `evals/harness/README.md`. The suite is small enough to run whole on every change, which also catches a change that helps one rule and hurts another.
4. Grade with `grade.py`, have the critics grade the semantic assertions blind as `evals/harness/CRITIC.md` describes, answer every blocking finding in writing, and resume each critic until it withdraws or holds each one.
5. Pass when `compare.py` exits 0: every session finished, every new session passes every assertion, no assertion that every last-committed session passed fails in a new session, and every blocking finding against a new session is withdrawn.
6. When it fails, make the rule something an agent can check against its own work, such as a test it runs, a file it writes, or a line the generator prints, and run again. After four rounds, report what still fails instead of committing it.
7. Leave the change uncommitted for the owner's review, with a proposed commit message naming the evals run and the pass counts per snapshot. Delete the run folder, which holds copied credentials.

A single prompt cannot reproduce a long session that drifts across many tasks, so these evals measure whether the rules fire and what they write, not every way a long session forgets. Sections with no eval yet: the rules for what a pass may reword, a pass as its own commit with a list of moves, frontmatter on a source filed into Archive, what counts as a change for `date_modified`, precedence over a harness's own memory, Reading Discipline, Markup, Directory Density, splitting a document, log rollover into Archive, and nested Context directories.

## Before finishing

- `SKILL.md` and `README.md` describe the same behavior, and `SKILL_NAME` in the script equals the frontmatter `name`, so new guards carry the current name.
- The version was bumped as the release-versioning skill requires.
- Script syntax, help, scratch generation, Archive exclusion at every depth, and two-pass idempotency pass.
- The consolidation marker survives a plain run, is read back on the next run, and `--consolidated` is refused while errors, Context-Inbox files, or unresolved links remain.
- A broken link is reported inside Context, in Archive, and from outside into Context or its inbox, a link with spaces in angle brackets resolves, `--links` is remembered, and `--check` leaves the folder untouched.
- A frontmatter block with a `metadata:` mapping, a list, or a block scalar under an optional key indexes cleanly.
- The index uses one linked bullet per active document followed by an arrow and its description, and contains no individual assets.
- Directory-density guidance supports useful depth without creating empty hierarchy.
- No repeated Archive or Context-Inbox explanation bloats the skill.
- No em dashes or prose-joining semicolons were introduced.
