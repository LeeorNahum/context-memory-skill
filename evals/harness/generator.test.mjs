// Contract tests for scripts/index.mjs, run in throwaway folders. No agent and no network.
// Usage: node evals/harness/generator.test.mjs
// Exits 1 when any check fails, and prints one line per check.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GENERATOR = resolve(dirname(fileURLToPath(import.meta.url)), "../../scripts/index.mjs");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

function project({ git = true, root = mkdtempSync(join(tmpdir(), "cm-gen-")) } = {}) {
  mkdirSync(join(root, "Context"), { recursive: true });
  writeFileSync(join(root, "Context/Status.md"), "---\nname: Status\ndescription: Where the project stands and what happens next.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n\n# Status\n");
  if (git) execFileSync("git", ["init", "-q"], { cwd: root });
  return root;
}
const run = (root, ...flags) => spawnSync("node", [GENERATOR, join(root, "Context"), ...flags], { encoding: "utf8" });
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const doc = (name, body) => `---\nname: ${name}\ndescription: What the project decided about ${name.toLowerCase()} and when to read it.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n\n${body}\n`;
const unresolved = (out) => out.stderr.split(/\r?\n/).filter((l) => l.includes(": the link to "));
const ignoreLines = (root) => read(join(root, ".gitignore")).split(/\r?\n/).filter((l) => /^\/?Context-Inbox\/?$/.test(l.trim())).length;

{
  const root = project();
  const first = run(root);
  check("fresh repository gets Context-Inbox/ in .gitignore", first.status === 0 && ignoreLines(root) === 1 && /Added Context-Inbox\//.test(first.stdout));
  const before = read(join(root, "Context/AGENTS.md")) + read(join(root, ".gitignore"));
  run(root);
  check("second run changes nothing", before === read(join(root, "Context/AGENTS.md")) + read(join(root, ".gitignore")));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, ".gitignore"), "node_modules/");
  run(root);
  check("rule appended on its own line to a .gitignore with no trailing newline", read(join(root, ".gitignore")) === "node_modules/\nContext-Inbox/\n");
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, ".gitignore"), "Context-Inbox/probe.md\n");
  const out = run(root);
  check("a rule for one file in the inbox does not count, so the folder rule is added", out.status === 0 && ignoreLines(root) === 1);
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, ".git/info/exclude"), "Context-Inbox/\n");
  run(root);
  check("a local exclude alone still gets a repository rule", ignoreLines(root) === 1);
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, ".gitignore"), "Context-Inbox/\n!Context-Inbox/\n");
  const out = run(root);
  check("an overriding rule is reported, not duplicated", ignoreLines(root) === 1 && /overrides it/.test(out.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context-Inbox"));
  writeFileSync(join(root, "Context-Inbox/note.txt"), "a note\n");
  execFileSync("git", ["add", "-A"], { cwd: root });
  const out = run(root);
  check("tracked inbox files are reported", /already tracked by Git/.test(out.stderr));
  const refused = run(root, "--consolidated");
  check("a pass is refused while the inbox holds files", refused.status === 1 && /refused/.test(refused.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  run(root);
  check("outside a Git repository no .gitignore is written", !existsSync(join(root, ".gitignore")));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context/Archive/Old"), { recursive: true });
  writeFileSync(join(root, "Context/Archive/Old/Plan.md"), "---\nname: Plan\ndescription: An old plan.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n");
  run(root);
  const index = read(join(root, "Context/AGENTS.md"));
  check("Archive documents stay out of the active index", /Status\.md/.test(index) && !/Plan\.md/.test(index));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  const out = run(root);
  check("a missing pass is due and says to start it now", /A consolidation pass is due/.test(out.stderr) && /Start it in this turn/.test(out.stderr) && /Only the user can defer it/.test(out.stderr));
  run(root, "--consolidated");
  const after = run(root);
  check("a recorded pass clears the due warning", !/consolidation pass is due/.test(after.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context/Supplier Notes"));
  mkdirSync(join(root, "Context/Archive"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "Context/Supplier Notes/Acme Call.md"), doc("Acme Call", "## Price\n\nSee [Status](../Status.md)."));
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", [
    "Read [the call](<Supplier Notes/Acme Call.md>), [its price](<Supplier Notes/Acme Call.md#price>), and [the same file](Supplier%20Notes/Acme%20Call.md).",
    "[A site](https://example.com/missing.md), [mail](mailto:a@example.com), [this page](#plan), and `[code](<Gone In Code.md>)` are not checked.",
    "```",
    "[fenced](<Gone In Fence.md>)",
    "```",
    "A dead one: [old quote](<Supplier Notes/Bolt Call.md>).",
    "Wrong case: [status](status.md).",
    "Split over lines: [the call](",
    "<Supplier Notes/Acme Call.md>",
    ") resolves and [a gone one](",
    "<Gone Split.md>",
    ") does not.",
    "[A title](<Supplier Notes/Acme Call.md> \"the (first) call\"), [an entity](R&amp;D.md), and [an escape](R\\&D.md) resolve. [Nested](Gone(a(b)).md) does not.",
    "A comment mark in code, `<!--`, does not hide [a gone link](<Gone After Code.md>) before `-->`, and [an escaped entity](R\\&amp;D.md) is not decoded.",
    "",
    "    [indented code](<Gone Indented.md>)",
    "",
    "<div>",
    "[an HTML block](<Gone Html.md>)",
    "</div>",
    "",
    "- A list item",
    "",
    "    [a paragraph under it](<Gone Under List.md>)",
    "A stray ](<Gone Stray.md>) and <!-- [a comment](<Gone Comment.md>) --> are not links.",
  ].join("\n")));
  writeFileSync(join(root, "Context/R&D.md"), doc("R&D", "Research notes."));
  writeFileSync(join(root, "Context/Archive/Old Plan.md"), "An archived note with [a moved file](<../Moved Away.md>).\n");
  writeFileSync(join(root, "docs/Ordering.md"), "Read [the plan](../Context/Plan.md), [the old build steps](<../Context/Build Steps.md>), [an inbox note](<../Context-Inbox/Call Notes.md>), and [something else](<Missing Elsewhere.md>).\n");
  const out = run(root);
  const lines = unresolved(out);
  check("a broken link inside Context is reported with its file and line", lines.some((l) => l.includes("Plan.md:13: the link to Supplier Notes/Bolt Call.md does not resolve.")), lines.join(" | "));
  check("a broken link in an archived document is reported", lines.some((l) => l.includes("Archive/Old Plan.md:1: the link to ../Moved Away.md")));
  check("a broken link into Context from outside it is reported", lines.some((l) => l.includes("../docs/Ordering.md:1: the link to ../Context/Build Steps.md")));
  check("a link from outside to a drained inbox item is reported", lines.some((l) => l.includes("../docs/Ordering.md:1: the link to ../Context-Inbox/Call Notes.md")));
  check("a letter-case mismatch is reported with the name on disk", lines.some((l) => l.includes("Plan.md:14: the link to status.md does not resolve. On disk the name is Status.md")));
  check("a link split over lines and one with nested parentheses are read", lines.some((l) => l.includes("Plan.md:17: the link to Gone Split.md")) && lines.some((l) => l.includes("Plan.md:20: the link to Gone(a(b)).md")));
  check("links with spaces, an anchor, a title, an escape, or encoding pass, and addresses, code, HTML, and outside links that point elsewhere are left alone", lines.length === 10 && lines.some((l) => l.includes("Plan.md:31: the link to Gone Under List.md")) && out.stderr.includes("10 Markdown link(s) listed above"), lines.join(" | "));
  check("unresolved links are warnings, not errors", out.status === 0);
  const refused = run(root, "--consolidated");
  check("a pass is refused while a link does not resolve", refused.status === 1 && refused.stderr.includes("--consolidated refused: 10 Markdown link(s)") && read(join(root, "Context/AGENTS.md")).includes("last consolidation pass none"));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, "README.md"), "Read [the index](Context/AGENTS.md) first.\n");
  check("a link to the index resolves on the run that first writes it", unresolved(run(root)).length === 0);
  mkdirSync(join(root, ".rules"));
  writeFileSync(join(root, ".rules/Review.md"), "Read [the pricing notes](<../Context/Pricing Notes.md>) first.\n");
  const hidden = unresolved(run(root));
  check("a link into Context from a hidden folder is reported", hidden.length === 1 && hidden[0].includes("../.rules/Review.md:1"), hidden.join(" | "));
  rmSync(root, { recursive: true, force: true });
}
{
  const workspace = mkdtempSync(join(tmpdir(), "cm-gen-"));
  const root = project({ root: join(workspace, "lamp") });
  mkdirSync(join(workspace, "storefront"));
  writeFileSync(join(workspace, "storefront/Notes.md"), "See [the retired plan](<../lamp/Context/Retired Plan.md>) and [another](<Not Ours.md>).\n");
  check("a folder outside the project is not read until --links names it", unresolved(run(root)).length === 0);
  const named = unresolved(run(root, `--links=${join(workspace, "storefront")}`));
  check("--links reads a named folder for links into this Context", named.length === 1 && named[0].includes("../../storefront/Notes.md:1: the link to ../lamp/Context/Retired Plan.md"), named.join(" | "));
  const index = read(join(root, "Context/AGENTS.md"));
  const again = unresolved(run(root));
  check("the --links folder is remembered and a plain run changes nothing", index.includes("also check links in <../../storefront>") && again.length === 1 && index === read(join(root, "Context/AGENTS.md")));
  rmSync(join(workspace, "storefront"), { recursive: true, force: true });
  check("a remembered folder that no longer exists is reported", /The --links folder .* does not exist/.test(run(root).stderr));
  run(root, "--links=none");
  check("--links=none forgets the folders", !read(join(root, "Context/AGENTS.md")).includes("also check links in"));
  const own = run(root, `--links=${root}`);
  check("--links does not remember the project folder, which is always read", own.stdout.includes("is already read") && !read(join(root, "Context/AGENTS.md")).includes("also check links in"));
  rmSync(workspace, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context/Archive"));
  writeFileSync(join(root, "Context/Archive/Old.md"), "Old.\n");
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", "See [gone](Gone.md)."));
  const out = run(root, "--check");
  const wrote = ["Context/AGENTS.md", "Context/Archive/AGENTS.md", ".gitignore"].filter((f) => existsSync(join(root, f)));
  check("--check reports and writes nothing", out.status === 0 && unresolved(out).length === 1 && out.stdout.includes("Wrote nothing") && out.stderr.includes("missing or out of date") && wrote.length === 0, wrote.join(", "));
  check("--check sends a due pass to the owning session and does not order one", out.stderr.includes("A consolidation pass is due") && out.stderr.includes("Tell the session that owns this Context.") && !out.stderr.includes("Start it in this turn"));
  const refused = run(root, "--check", "--consolidated");
  check("--check refuses to record a pass", refused.status === 1 && !existsSync(join(root, "Context/AGENTS.md")));
  run(root);
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", "Nothing linked."));
  rmSync(join(root, "Context/Status.md"));
  const stale = run(root, "--check");
  check("a stale generated index is called out of date, not a broken link", unresolved(stale).length === 0 && stale.stderr.includes("missing or out of date"));
  rmSync(root, { recursive: true, force: true });
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${!r.ok && r.detail ? ` (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
if (failed) process.exit(1);
