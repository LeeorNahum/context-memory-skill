# Structure

How a Context directory is set up, where it lives, and how its documents are reshaped.

## Creating A Context Directory

1. Create `Context/` at the root of the project it describes, unless the user or the project's instructions name another place, such as a subfolder or a parent folder.
2. Write the first documents for the knowledge at hand, each with its frontmatter. Start with the owners the project needs now, not an empty hierarchy.
3. Add the import to the instruction file beside `Context/`, normally the project's root `AGENTS.md`, replacing any sentence there that only points at the index:

   ```markdown
   ## Context

   `Context/` is this project's memory. Its index loads through the import below. If no Context Index is in your context, read `Context/AGENTS.md` before working here.

   @Context/AGENTS.md
   ```

4. Run the generator. It writes the index, adds `Context-Inbox/` to the repository's `.gitignore`, and reports anything left to fix.

The import line stands alone on its line, outside any code span or fence, and a path with a space takes a backslash before the space. When `Context/` has no instruction file beside it, the line goes in the nearest one above it, with the path from that file. The sentence above it is the fallback, and both stay:

| Harness | What the two lines do |
| --- | --- |
| Follows `@path` imports in instruction files | Loads the index at session start, for the main session and for workers that load project instructions |
| Reads `AGENTS.md` as plain text | Sees the sentence and the path, and reads the index when it starts work |
| Reads an instruction file of its own in place of `AGENTS.md` | Needs that file to import `AGENTS.md`, or to carry the import line itself. The generator reports a `CLAUDE.md` that sits beside `AGENTS.md` without doing either, and cannot see a file that is missing |

Each import is paid at every session start, so an index worth importing is one kept small. The generator reports its size in tokens.

## More Than One Context Directory

- A parent workspace's Context describes the workspace, not the projects inside it, and the two never share an index.
- Additional Context directories inside one project exist only where the user or the project's instructions declare them, such as one per subtree that acts as its own agent. Each is indexed and consolidated on its own. Each is imported by the instruction file beside it, which loads the index for sessions that start in that subtree. A session that starts higher up reads it when it enters.
- The skill owns only Context directories, never the rest of the tree.

## Moving And Closing

A Context directory moves with its project. When a project moves, or a planning repository closes into a product repository, its Context goes along, into the successor's Context or its Archive, and the old place keeps only a pointer. A planning Context that is left behind is not an archive, it is a store nobody reads.

## Reshaping Documents

- Rename, split, merge, move, and retire material when ownership or reading needs change. Avoid keeping files together merely because the first folder layout already exists.
- Split a long document when it contains multiple owners, independently changing sections, or a reading path that requires repeated searching. Length alone is not the rule.
- Before splitting a document or merging it into another, map every unique fact, opinion, rationale, and link to its destination.

## HTML Documents

A Mermaid diagram inside a Markdown document is fine when it helps a reader. Use one self-contained HTML file, with inline CSS and JavaScript and no external dependencies, only for a surface whose value is presentation or interaction, such as a dashboard or a filterable comparison. It carries the same four frontmatter fields inside an opening HTML comment.

A saved web page or an export is evidence, not a document. Leave it exactly as it arrived, beside the document that owns it. The generator treats an HTML file with no frontmatter comment as an asset.

## Documents That Arrive With Frontmatter

A document that arrives with fields of its own, such as an imported or exported document, keeps the ones worth keeping and drops the noise: a few flat fields sit beside the required ones, and anything nested or numerous goes under a `metadata:` mapping. `date_created` is still the day the document entered Context. A date the document carried, such as when it was written or sent, goes in the filename prefix, the body, or `metadata:`.
