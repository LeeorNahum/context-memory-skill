---
name: "context-memory"
description: "Context Memory (CM). Use when creating, saving, organizing, or reorganizing a project's durable knowledge in a Context directory: plans, decisions, opinions, status, and records as Markdown. Use whenever the user states a decision, preference, opinion, or correction about the project, even without asking to save it, when the user says to save, note, remember, or document something, when reading or maintaining a Context directory or its index, when adding to a document in one, when a Context-Inbox directory needs draining, or when the user asks to tidy, audit, or consolidate a Context directory or the generator says a pass is due. Also use whenever a harness offers its own memory, recall, or auto-save store for project knowledge, because a Context directory supersedes it. Applies only where a Context directory exists or is called for. Not for personal reminders or preferences that span unrelated projects, and not for code documentation, READMEs, or comments that live with the source."
metadata:
  author: "Leeor Nahum"
  version: "3.1.0"
---

# Context Memory

`Context/` is the project's memory: what it knows that is not code, as plans, research, decisions, rationale, status, schedules, references, and records. It is project knowledge, not a second instruction hierarchy.

When the user states a decision, preference, opinion, constraint, or correction about the project, write it into its owning document in the same turn, unasked. Saying it once is the request. Record corrections and confirmed approaches alike, update the owning document rather than adding a duplicate, and delete what turns out to be wrong. When the user says to remove something, remove it. Record a standing rule against it only if it keeps returning.

Topical documents state facts, opinions, constraints, decisions, and plans directly. Rules that govern how an agent works across tasks belong in the nearest applicable `AGENTS.md`. A plan, checklist, decision, or runbook may still contain instructions when those instructions are the subject of the document.

## Where This Skill Applies

This skill governs a project when a `Context/` directory in this format already exists there, when the user asks for one, or when the project's instructions call for one, whatever file carries them. Being installed is not one of those signals: availability in a catalog, a global skills folder, or a remote library does not make the skill apply, and a project with none of these signals keeps whatever it already uses.

## Precedence Over Built-In Memory

Where this skill applies, `Context/` is the durable store for project knowledge and it supersedes any memory feature the harness provides. Do not write project knowledge into those. When a harness memory store already holds some, migrate each fact into its owning Context document and leave the harness store empty.

This governs durable project knowledge only. A harness memory that carries personal user preferences across unrelated projects is a different thing and is out of scope. That material does not belong in `Context/` either.

## Reading Discipline

Read `Context/AGENTS.md` first, then load only the active documents whose names and descriptions match the task. Search within the relevant topic when more than one owner is plausible.

A whole-directory cleanup means an editorial audit, not only index regeneration. Inspect active ownership, duplication, stale status, instruction leakage, format choice, directory density, navigation, and historical material.

## Core Structure

- `Context/` lives at the root of the project it describes unless the user or the project's instructions name another place, such as a subfolder or a parent folder. A parent workspace's Context describes the workspace, not the projects inside it, and the two never share an index.
- Additional Context directories inside one project exist only where the user or the project's instructions declare them, such as one per subtree that acts as its own agent. Each is indexed on its own. The skill owns only Context directories, never the rest of the tree.
- `Context/AGENTS.md` contains the generated active index, and the authored part above the guards holds this directory's own conventions: where a kind of document goes, how it is named, how a recurring source from the inbox is filed. Write one when a convention would otherwise be reinvented, keep it to a few lines, and change it when the directory changes. Read it before filing. The project's root instruction file points at it, or imports it where the harness supports imports, so the index loads without depending on an agent choosing to open it.
- Organize by the project's real subjects. Rename, split, merge, move, and retire material when ownership or reading needs change.
- Three or four levels of meaningful subdirectories are healthy. Avoid keeping files together merely because the first folder layout already exists.
- Root-level files are reserved for project-wide owners such as current status or a master plan.
- One current fact has one owner. Other documents link to it.
- A Context directory moves with its project. When a project moves, or a planning repository closes into a product repository, its Context goes along, into the successor's Context or its Archive, and the old place keeps only a pointer. A planning Context that is left behind is not an archive, it is a store nobody reads.
- Split a long document when it contains multiple owners, independently changing sections, or a reading path that requires repeated searching. Length alone is not the rule.

## Naming And Ownership

- Before adding a file, decide which subfolder owns it, and create that subfolder in the same change when the subject has enough files to read as a group.
- Use Title Case for folders and markup filenames.
- Prefix time-anchored records with `YYYY-MM-DD `, followed by the subject. A date alone is not a name.
- Name evergreen files for the subject they own, not the temporary task that created them.
- Before retiring or splitting a document, map every unique fact, opinion, rationale, and link to its destination.

## Markup

Write Markdown. A Mermaid diagram inside a Markdown document is fine when it helps a human reader. Use one self-contained HTML file, with inline CSS and JavaScript and no external dependencies, only for a surface whose value is presentation or interaction, such as a dashboard or a filterable comparison. Images, PDFs, and other assets sit beside the document that owns them.

## Frontmatter

Every active Markdown and HTML file begins with:

```yaml
---
name: <Title Case Document Name>
description: <one line saying what the file holds and when it is useful>
date_created: YYYY-MM-DD
date_modified: YYYY-MM-DD
---
```

HTML places the same fields inside an opening HTML comment.

Descriptions are selection metadata. They name what the file holds and when it is useful, on one line, aiming under 300 characters and never over 1024, and they do not summarize the findings. The body owns the actual information.

`name` matches the document, `date_created` is the day the document entered Context and never changes, and `date_modified` changes with the content. A move or rename is not a content change. The date an event happened belongs in the filename prefix and the body, not in these two fields.

A document that arrives with fields of its own, such as an imported or exported document, keeps the ones worth keeping and drops the noise: a few flat fields sit beside the required ones, and anything nested or numerous goes under a `metadata:` mapping.

When a document records a time of day, write it in RFC 3339 with its UTC offset, in the shape `YYYY-MM-DDThh:mm:ss+hh:mm`. The offset records the local time zone.

## The Index

Run the generator after active Context changes. It is one zero-dependency Node script, and both routes below run the same file:

```bash
# Skill on disk (a repository .agents/skills install or a global skills folder)
node <skill-root>/scripts/index.mjs <path-to-Context>

# Skill not on disk (served from a remote library)
npx --yes github:LeeorNahum/context-memory-skill <path-to-Context>
```

Node is the only requirement either way. The remote route fetches the script from its repository and needs network access the first time on a machine.

**The generator's warnings are work, not notes.** It reports the index size, flags frontmatter problems, warns when a directory exceeds the file counts below, when a description is shaped like a summary, when a filename is only a date, while a Context-Inbox directory is waiting to be drained, and when a consolidation pass is due by its cadence. A warning is a task to do in that pass, or to name explicitly as deferred with a reason. Reading one and continuing is how a directory becomes unusable while every individual pass looks fine.

`--consolidated` records a finished consolidation pass and `--cadence=<days>` sets and remembers how long one stays current, both for the Context named on the command line only. `--nested` also scans the folder that holds this Context, two levels deep, for other indexed Context directories and regenerates each, which is how a workspace of projects checks all of them in one command. `--help` has the details.

The generated block lists each active markup file as one linked bullet followed by an arrow and its description. It omits archived material and individual assets, validates active frontmatter, and preserves authored text outside the guards.

## Directory Density

Aim for roughly 4 to 12 active markup files in a directory, and fewer at the root, which holds only project-wide owners. More than 12 triggers an organization review. More than 20 means the directory needs clearer subtopics unless it is an intentional chronological or generated collection. File count is the cost paid on every load, because every active description sits in the index. Document length is paid only by a reader who needs it.

## Archive

`Context/Archive/`, or an `Archive/` folder beside the documents it serves, preserves superseded, completed, or fully synthesized material that remains useful for provenance but is not current guidance. Every Archive folder is omitted from the active index. Each Archive folder at the edge of the active set gets an index of its own, in its own `AGENTS.md`, listing everything beneath it, and nothing loads it until someone goes looking for history. Archive is not a trash folder: delete noise and exact duplicates, and transfer every still-current fact or opinion before moving a mixed document.

Reconsider archival status when a phase closes, a decision is superseded, a one-time runbook is completed, a source is fully synthesized, or a newer owner absorbs the material. Archive what someone would open on purpose. In a Git repository, when the only question is what a current document said before, history answers it, so update the document in place rather than archiving a copy of it.

A record that only ever gains entries, such as a log, grows without end by design:

- Keep the entries a reader would actually reach for in the active document, and move older ones into `Archive/` split by period, named for the period they cover.
- Do it when entries have accumulated that nobody would reach for, not on a fixed schedule and not at a particular length.
- Leave a line in the active document saying where the earlier entries went.
- Never summarize an entry away during this move. It is a relocation, not a rewrite: archived history is cheap to keep and is the raw material for noticing patterns later.

Archiving is not deletion and is not summarizing, so it is cheap and should not be agonized over. Archived material keeps its detail, stays whole, and remains available to anyone who goes looking. What it buys is an active surface small enough to read, which is the scarce thing. Retire aggressively from the active set and delete almost nothing.

## Context-Inbox

`Context-Inbox/` is an optional folder beside `Context/` where the user, a helper, or an in-progress organization pass drops material for the agent that owns the Context to file. The rule for an inbox is zero. The agent that owns the Context does not use the inbox and files straight into Context. When the inbox exists in a Git repository, add it to `.gitignore` before placing files there. Inspect every item, move current knowledge into its active owner, preserve worthwhile history in Archive, discard only clear noise, then remove the empty folder. The inbox is a convention, not a gate: anything the user hands over to be saved, by whatever route, is filed the same way. Filing is editorial. Keep each item in the form its content needs, so text that arrived as a picture becomes text, pieces of one record that were split only by how they arrived become one document, and pieces that are separate on purpose stay separate.

## Consolidation

A directory that is only written to during work drifts: statuses go stale, documents disagree, logs outgrow their readers, Context-Inbox fills, descriptions fall behind their bodies. A consolidation pass is the whole-directory editorial audit from Reading Discipline plus a Context-Inbox drain, done as its own pass rather than folded into other work, and recorded by running the generator with `--consolidated`. A contradiction is resolved when the evidence in Context settles it, and otherwise recorded in its owning document.

The generator decides when one is due. It keeps the date of the last pass and the cadence in a comment above the index and warns once the cadence has elapsed, seven days unless `--cadence` set another for that directory. A waiting Context-Inbox is a drain task on its own, reported every run until it is empty, and a pass cannot be recorded while it holds files. A project's instructions may add a trigger and steps of their own on top.

## Validation

Before finishing:

- Run the generator and fix active frontmatter errors.
- Confirm edited frontmatter matches the current purpose.
- Confirm current facts and opinions have one active owner.
- Confirm agent-wide rules live in `AGENTS.md` and document-specific procedures remain with their subject.
- Confirm local links and active wiki links resolve.
- Confirm directory density was reviewed rather than preserved by inertia.
- Confirm every generator warning was acted on or explicitly deferred with a reason.
- Confirm Context-Inbox is gone after a drain.
