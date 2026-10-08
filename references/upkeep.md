# Upkeep

Archiving, draining the inbox, and the consolidation pass. An agent handed only this file for a pass also follows the skill's `SKILL.md`: its Filing and Frontmatter sections carry the thresholds this file names, and its Capture section carries the rule against recording a guess as the user's decision.

## Archive

The generator writes an index for each Archive folder at the edge of the active set, in that folder's `AGENTS.md`, listing everything beneath it, and nothing loads it until someone goes looking for history. Archive is not a trash folder: delete noise and exact duplicates, and before retiring a document, map every unique fact, opinion, rationale, and link in it and transfer each one that is still current to its active owner.

Archive what someone would open on purpose. Archived material keeps its detail, stays whole, and remains available to anyone who goes looking.

A move into Archive follows the skill's Filing rule for every move, so the search for the old path comes first. Inside the archived text, retarget a link that the move broke and change nothing else.

A record that only ever gains entries, such as a log, grows without end by design:

- Keep the entries a reader would actually reach for in the active document, and move older ones into `Archive/` split by period, named for the period they cover.
- Do it when entries have accumulated that nobody would reach for, not on a fixed schedule and not at a particular length.
- Leave a line in the active document saying where the earlier entries went.
- Never summarize an entry away during this move. It is a relocation, not a rewrite: archived history is cheap to keep and is the raw material for noticing patterns later.
- A durable fact that lives only in an archived entry gets a line in its active owner, because an archive answers only to someone who searches it.

## Context-Inbox

`Context-Inbox/` is an optional folder beside `Context/` where the user or a helper drops material for the agent that owns the Context to file. The rule for an inbox is zero. The agent that owns the Context does not use the inbox and files straight into Context. Every Git repository that holds a Context directory lists `Context-Inbox/` in its `.gitignore`, whether or not an inbox exists yet, and the generator adds the line when it is missing.

To drain it, inspect every item, move current knowledge into its active owner, preserve worthwhile history in Archive, discard only clear noise, then remove the empty folder. A source kept whole in Archive gets frontmatter as it is filed, so the Archive index can say what it holds. The inbox is one route among several, and filing from it is editorial: each item takes the form its content needs, as the skill's Filing section says of anything handed over to be saved.

A waiting inbox is a drain task on its own, reported every run until it is empty.

## Consolidation

A directory that is only written to during work drifts: statuses go stale, documents disagree, logs outgrow their readers, Context-Inbox fills, descriptions fall behind their bodies. A consolidation pass is a whole-directory editorial audit plus a Context-Inbox drain, done as its own pass rather than folded into other work.

### When One Is Due

The generator decides. It keeps the date of the last pass and the cadence in a comment above the index, and reports a pass as due once the cadence has elapsed and something in the directory changed after the last pass. The cadence is seven days unless `--cadence=<days>` set another for that directory. A directory with no recorded pass counts from its oldest document, so a new directory is not due.

Change is read from each document's `date_created` and `date_modified` and, in a Git repository, from commits and tracked edits after the commit that recorded the pass. Outside Git, where Context is not tracked, or while a pass has not been committed yet, only the dates speak: an edit that kept its old date, an edit made later on the day of the pass, and a deleted document go unseen, so keep `date_modified` honest there. A project's instructions may add a trigger and steps of their own on top.

### What A Pass Does

Read every active document, not only the ones the generator flagged, and put the directory back in order:

- **Ownership.** One current fact has one owner. Merge duplicates and settle copies that disagree. A contradiction is resolved when the evidence in Context settles it, and otherwise recorded in its owning document as unresolved.
- **Stale status.** A status document states the present. Remove finished items and dated sections that stack up, after giving each durable fact in them an owner.
- **Agent rules in topical documents.** Rules for how an agent works, including how the user wants to be worked with, move to the nearest applicable `AGENTS.md`, wherever they were found: a document about working with the user, the authored part of `Context/AGENTS.md`, or a harness memory store.
- **History.** Archive finished one-time briefs, completed runbooks, superseded plans, and log entries nobody would reach for.
- **Shape.** Fix descriptions that summarize or run long, directories past their density, filenames that say little, an active file named as an archive, a document in the wrong format for its use, and navigation that no longer leads a reader to an owner.
- **Links.** A pass reaches past the directory. It checks links into and out of the directory, covers the links and statements about this Context that live outside it, as the skill's Filing section requires for every move, and fixes every link the generator reports.
- **Inbox.** Drain it.

A pass changes how knowledge is organized, never what was decided: it records no decision, preference, or rule the user did not state. It corrects what is stale, and everything else it rewrites keeps its meaning. A rewritten passage keeps every fact and every pending step of the text it replaces, in the same place or in the document it moved to. A step stays worded as a step someone still has to take, and an inference stays marked as one and never becomes the source's own statement. A note saying material was moved, superseded, or finished must hold for all of that material, or say which part it covers.

### Recording It

- A pass covers one Context directory. Every Context directory the project declares gets a pass of its own. `--nested` regenerates each indexed Context directory up to two levels below the parent of the one named and lists the ones with a pass due.
- Record a finished pass by running the generator with `--consolidated`, as the last command of the pass and a command of its own, never added to a routine regeneration and never by editing the marker by hand. It applies to the Context named on the command line only, and is refused while that Context has frontmatter errors, a Context-Inbox with files, or a link that does not resolve. A pass stays unrecorded while a link the session may not fix is waiting on the user.
- Report what the pass changed: each document it moved with the old and the new path, what merged, what was archived, and every line removed from an active document with where its fact lives now.
- Where the project commits its work, a pass is a commit of its own, apart from new knowledge from the working session. An agent running a pass for another session leaves it uncommitted, and that session commits it after reviewing it as the skill's Generator Warnings section says.

