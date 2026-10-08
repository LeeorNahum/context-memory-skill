---
name: "context-memory"
description: "Use for any work in a project where a Context directory exists, the user asks for one, or the project's instructions call for one, from investigation and routine edits to handoffs between sessions, even when nobody asks to save or remember anything. Captures and organizes the knowledge a project needs across turns and sessions, kept as what is true now: decisions, preferences, opinions, plans, next steps, current state, and discoveries. Also use to create, file, index, audit, tidy, or consolidate that Context, to drain a Context-Inbox directory or act on a due consolidation pass, and whenever a harness offers its own memory, recall, or auto-save store for that project's knowledge. Not for personal reminders or preferences that span unrelated projects. Code documentation, READMEs, and comments stay with the source, but work on them still triggers capture of project knowledge."
metadata:
  author: "Leeor Nahum"
  version: "4.0.0"
---

# Context Memory

`Context/` is the project's memory: what it knows that is not code, as plans, research, decisions, rationale, status, schedules, references, and records. It is project knowledge, not a second instruction hierarchy.

Topical documents state facts, opinions, constraints, decisions, and plans directly. Rules that govern how an agent works across tasks, including how the user wants to be worked with, belong in the nearest applicable `AGENTS.md`, where every session loads them. They do not go in a topical document, in the authored part of `Context/AGENTS.md`, or in a harness memory store. A plan, checklist, decision, or runbook may still contain instructions when those instructions are the subject of the document.

## Where This Skill Applies

This skill governs a project when a `Context/` directory in this format already exists there, when the user asks for one, or when the project's instructions call for one, whatever file carries them. Being installed is not one of those signals: availability in a catalog, a global skills folder, or a remote library does not make the skill apply, and a project with none of these signals keeps whatever it already uses.

## Precedence Over Built-In Memory

Where this skill applies, `Context/` is the durable store for project knowledge and it supersedes any memory feature the harness provides. Do not write project knowledge into those. When a harness memory store already holds some, migrate each fact into its owning Context document and leave the harness store empty.

This governs durable project knowledge only. A preference that spans unrelated projects is not project knowledge, and this skill keeps no store for it. Write it as a rule in the `AGENTS.md` of each project where it applies.

## Reading

The index in `Context/AGENTS.md` lists every active document with when to read it. When it is already in your context, do not read the file again. Otherwise read it first. Open only the documents whose paths and descriptions match the task, and search within the relevant topic when more than one owner is plausible. Looking something up needs nothing else from this skill and no generator run.

## Capture

Write project knowledge into its owning document in the same turn, unasked, whether it comes from the user, the work, or a source. Saying it once is the request, and nobody has to say save, note, or remember. Preserve what affects how the work continues or would otherwise need rediscovery:

- Decisions, preferences, opinions, and constraints, with their reasons, and confirmed approaches recorded as readily as changed ones.
- Plans and next steps, with their timing and dependencies.
- Changes in the state of the work: what is done, what is waiting and on whom, what is due, and where anything made outside the repository lives.
- Discoveries from the work or a source, with a reference where it supports later verification.

**State what is true now.** When the user corrects or changes something, rewrite the owning statement so the document reads as if it had always been right, and remove the old value from every active document that states it as current. Reconcile what depended on the old value as this section's rule for a changed state, decision, or plan says, and where its new value is not known, mark it unconfirmed without citing the old value. Do not record the correction as an event, and do not keep the old value beside the new one. Keep an earlier value only when a later reader needs the history itself, such as the reason a plan moved, and leave dated records and archived text as they were written. In a Git repository, history holds what a document said before.

Capture what the work established rather than narrating the turn. A log belongs in Context when its history is useful later in its own right, such as a record of runs, submissions, or contacts. When an event recurs, or the user says how to handle one, write the rule where the next run will read it, not only the log entry.

**Never record a guess as the user's decision.** Keep proposals apart from agreed plans, attempts apart from finished work, and inferences apart from confirmed facts. Write a choice as decided only when the user decided it. A tentative remark is recorded as open, in the user's words. A reading of what the user meant is marked as the agent's reading, and an instruction relayed by another agent is attributed to that agent. Name who takes every pending step, so a step the user said they will take is never left for the next session to take. Call the user by a name only when the project's own files give one, never one taken from a skill, a tool, or the machine.

Before ending a turn on a question or a hold, write what the user already decided in it. After a message that carries several items, check each one against its owner before reporting it saved. A turn that adds or changes no such knowledge needs no capture update.

Update the owning document rather than adding a duplicate. When a state, decision, or plan changes, search the relevant documents for statements and procedures that depend on it and reconcile them in the same turn, keeping the current fact in one owner and linking to it elsewhere. Delete what turns out to be wrong. When the user says to remove something, remove it. Record a standing rule against it only if it keeps returning.

## Delegation

The session that works with the user owns capture. A worker does not need this skill to do its task. When a worker's task depends on project knowledge, its brief names the Context documents to read, or tells it to start from the index. A worker returns what it learned in its report, and the session that briefed it files that in the same turn. When a brief does have a worker write to Context, the brief names this skill, and whoever holds the result runs the generator afterwards, so no index is left stale.

## Filing

- One current fact has one owner. Other documents link to it.
- Organize by the project's real subjects. Before adding a file, decide which subfolder owns it, and create that subfolder in the same change when the subject has enough files to read as a group. Root-level files are reserved for project-wide owners such as current status or a master plan.
- A status document states the present and is edited in place. A durable fact gets an owner of its own before it leaves status, and dated history goes to a log.
- Use Title Case for folders and markup filenames. Name evergreen files for the subject they own, not the temporary task that created them. Prefix time-anchored records with `YYYY-MM-DD `, followed by the subject. A date alone is not a name.
- Aim for roughly 4 to 12 active markup files in a directory, and no more than 8 at the root. More than 12 triggers an organization review, and more than 20 means the directory needs clearer subtopics unless it is an intentional chronological or generated collection. Three or four levels of meaningful subdirectories are healthy. Folders are for filing: they give a new fact an obvious home and keep one subject's files together when a subject is renamed, split, or archived.
- File count and description length are the cost paid at every session start, because every active description sits in the index. Document length is paid only by a reader who needs it.
- Write Markdown. Images, PDFs, saved pages, and other assets sit beside the document that owns them.
- Anything the user hands over to be saved, by whatever route, is filed in the form its content needs: text that arrived as a picture becomes text, pieces of one record that were split only by how they arrived become one document, and pieces that are separate on purpose stay separate.
- Before moving, renaming, or archiving a document, or filing one out of `Context-Inbox/`, the folder beside `Context/` where others drop material to be filed, search for its path and its filename across the whole project, not only Context, and in every other project that links into this Context, such as a sibling repository or a parent workspace. In the same change, retarget every link and correct every statement of where the document is, or that it still waits in the inbox. A link whose target is gone for good becomes plain text or a code span.
- The authored part of `Context/AGENTS.md`, above the generated block, holds this directory's filing conventions only: where a kind of document goes, how it is named, how a recurring source from the inbox is filed. Write one when a convention would otherwise be reinvented, keep it to a few lines, change it when the directory changes, and follow it when filing.

Read the [structure reference](references/structure.md) before creating a Context directory, adding a second one inside a project, moving or closing a project, splitting or merging a document, writing an HTML document, or filing a document that arrives with frontmatter of its own.

## Frontmatter

Every active Markdown file begins with:

```yaml
---
name: <Title Case Document Name>
description: <one line saying what the file holds and when it is useful>
date_created: YYYY-MM-DD
date_modified: YYYY-MM-DD
---
```

Descriptions are selection metadata. They name what the file holds and when it is useful, on one line, aiming under 200 characters and never over 1024, and they do not summarize the findings. The body owns the actual information.

`name` matches the document, `date_created` is the day the document entered Context and never changes, and `date_modified` changes when the body's content changes, so it says when the document's knowledge last changed. A move, a rename, a retargeted link, a note that the document was superseded or archived, or an edit to the description alone is not a content change. The date an event happened belongs in the filename prefix and the body, not in these two fields.

When a document records a time of day, write it in RFC 3339 with its UTC offset, in the shape `YYYY-MM-DDThh:mm:ss+hh:mm`.

## The Generator

Run the generator once at the end of a turn that changed active Context. It is one zero-dependency Node script, and both routes below run the same file:

```bash
# Skill not on disk (served from a remote library)
npx --yes github:LeeorNahum/context-memory-skill <path-to-Context>

# Skill on disk (a repository .agents/skills install or a global skills folder)
node <skill-root>/scripts/index.mjs <path-to-Context>
```

Both routes need Node. The remote route also needs npm, Git, and network access.

The generated block lists each active markup file as one bullet: its path, an arrow, and its description. It omits archived material and assets, validates active frontmatter, and preserves authored text outside the guards.

The generator also checks links. It reads every inline Markdown link with a relative target under Context, Archive included. In the other Markdown files of the folder that holds Context it reads only the links that point into this Context or its inbox, because those are the ones a move, an archive, or a drain breaks. `--links=<folder>` adds any other folder that links in, such as the rest of the project when Context sits in a subfolder, a sibling repository, or a parent workspace, and is remembered for that Context. `--check` reports without writing anything, for a Context this session is reviewing and not editing, and what it reports goes to the session that owns that Context. `--help` lists the other flags.

A whole-directory cleanup means an editorial audit, not only index regeneration. When the user asks for an audit, a tidy, a consolidation, or an inbox drain, follow the [upkeep reference](references/upkeep.md).

## Generator Warnings

**The generator's warnings are work, not notes.** A warning is a task, started in the turn that saw it or handed to the consolidation pass that turn starts, and only the user can defer one. Reading one and continuing is how a directory becomes unusable while every individual turn looks fine. Each warning names its fix. The ones that need more than that:

- **The index is not imported.** Add the import line the warning names to the instruction file it names, so the index loads at session start instead of depending on an agent choosing to open it. The [structure reference](references/structure.md) has the lines to add.
- **A link does not resolve.** Point it at where its file is now, or unlink it as Filing says when the file is gone for good. In a project this session may not edit, report it to the user with its file and line.
- **Context-Inbox is waiting.** Drain it by the [upkeep reference](references/upkeep.md).
- **A consolidation pass is due.** Start it in this turn. Hand it to a fresh background subagent when the harness offers one, with the Context path, this skill, its [upkeep reference](references/upkeep.md), and the generator's other warnings, because the working session's context is full of its own task and the pass needs a clear view of the whole directory. Keep working, and leave the files the pass is editing and the warnings handed to it alone. When it reports, review it before it is committed: read the diff, not only the summary, and for each line the pass removed from an active document, confirm the fact is stale or find it in the tree. Restore what was lost. Without background subagents, run the pass before finishing the turn. Never record a pass that was not run.

## Archive

`Context/Archive/`, or an `Archive/` folder beside the documents it serves, preserves superseded, completed, or fully synthesized material that remains useful for provenance but is not current guidance. It is never in the active index. Archiving is not deletion and is not summarizing, so it is cheap and should not be agonized over. What it buys is an active surface small enough to read, which is the scarce thing. Retire aggressively from the active set and delete almost nothing.

Reconsider archival status when a phase closes, a decision is superseded, a one-time runbook is completed, a source is fully synthesized, or a newer owner absorbs the material. In a Git repository, when the only question is what a current document said before, history answers it, so update the document in place rather than archiving a copy of it. Read the [upkeep reference](references/upkeep.md) before moving anything into Archive or rolling the old entries out of a log.

## Validation

Before finishing a turn that changed Context or the state of the work:

- Check the handoff by reading the repository as a fresh agent would, with only the repository and the word "continue": it can find the current state, the intended next steps, the constraints, and the open questions without this conversation. Save what is missing, reconcile what the turn made stale, and record an unresolved question as unresolved.
- Confirm nothing is recorded as the user's decision that the user did not decide.
- Confirm current facts and opinions have one active owner, and that no document still states a value the turn replaced.
- Confirm rules for how an agent works live in `AGENTS.md`, not in Context, and document-specific procedures remain with their subject.
- Confirm edited frontmatter matches the current purpose, and local links and active wiki links resolve. The generator checks inline Markdown links, in Context and into it from the folders it reads. Wiki links and reference-style links are checked by hand.
- Confirm directory density was reviewed rather than preserved by inertia.
- When Context changed, run the generator, fix frontmatter errors, and confirm every warning was acted on, handed to a running consolidation pass, or deferred by the user.
