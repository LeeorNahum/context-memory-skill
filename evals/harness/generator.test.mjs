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
const page = (name, body) => `---\nname: ${name}\ndescription: What the project decided about ${name.toLowerCase()} and when to read it.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n\n${body}\n`;
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
  const mixed = project();
  mkdirSync(join(mixed, "Context-Inbox"));
  writeFileSync(join(mixed, "Context-Inbox/note.txt"), "a note\n");
  writeFileSync(join(mixed, "Context/Journal Archive.md"), "---\nname: Journal Archive\ndescription: Old entries.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n");
  const order = run(mixed).stderr.split("\n").filter((l) => l.startsWith("WARNING")).map((l) => (/pass is due/.test(l) ? "due" : /Drain it in this turn/.test(l) ? "inbox" : /imports this index/.test(l) ? "import" : "shape"));
  check("this turn's tasks print before the editorial findings, the due pass first", order.join(" ").startsWith("due inbox import shape"), order.join(" "));
  rmSync(mixed, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
}

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const doc = (name, { description = "What this file holds and when to read it.", created = "2026-01-01", modified = created } = {}) =>
  `---\nname: ${name}\ndescription: ${description}\ndate_created: ${created}\ndate_modified: ${modified}\n---\n\n# ${name}\n`;
const due = (out) => /consolidation pass is due/.test(out.stderr);
const commit = (root, date) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "commit", "-qm", "c"], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00`, GIT_COMMITTER_DATE: `${date}T12:00:00` } });

{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Status.md"), doc("Status", { created: TODAY }));
  const out = run(root);
  check("a directory created today has no pass due", out.status === 0 && !due(out));
  check("the marker of a new directory reads none", /last consolidation pass none, cadence 7 days/.test(read(join(root, "Context/AGENTS.md"))));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  const out = run(root);
  check("with no pass recorded, the cadence counts from the oldest document", due(out) && /oldest document here is \d+ day/.test(out.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  const stamped = run(root, "--consolidated=2026-01-10");
  check("recording a pass says so", /Recorded a consolidation pass on 2026-01-10 for /.test(stamped.stdout) && !/Recorded a consolidation pass/.test(run(root).stdout));
  check("a recorded pass with nothing changed after it never falls due", !due(run(root)));
  writeFileSync(join(root, "Context/Status.md"), doc("Status", { modified: "2026-01-11" }));
  const changed = run(root);
  check("a document modified after an old pass makes one due", due(changed) && /documents changed after it/.test(changed.stderr));
  writeFileSync(join(root, "Context/Status.md"), doc("Status"));
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", { created: "2026-01-12" }));
  check("a document created after an old pass makes one due", due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  const out = run(root, "--cadence=0");
  check("cadence 0 turns the calendar check off and is remembered", !due(out) && !due(run(root)) && /cadence 0 days/.test(read(join(root, "Context/AGENTS.md"))));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  run(root, "--consolidated=2026-02-03", "--cadence=30");
  run(root);
  check("the marker survives a plain run", /last consolidation pass 2026-02-03, cadence 30 days/.test(read(join(root, "Context/AGENTS.md"))));
  check("a pass dated in the future is refused", run(root, "--consolidated=2999-01-01").status === 1);
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Broken.md"), "# No frontmatter\n");
  const refused = run(root, "--consolidated");
  check("a pass is refused while frontmatter errors remain", refused.status === 1 && /refused/.test(refused.stderr) && /pass none/.test(read(join(root, "Context/AGENTS.md"))));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  mkdirSync(join(root, "Context/Suppliers"));
  writeFileSync(join(root, "Context/Suppliers/Lumen Co.md"), doc("Lumen Co", { description: "Prices and contacts for the LED supplier." }));
  const out = run(root);
  const index = read(join(root, "Context/AGENTS.md"));
  check("an entry is the path, an arrow, and the description", index.includes("\n- Suppliers/Lumen Co.md → Prices and contacts for the LED supplier.\n") && index.includes("\n- Status.md → Where the project stands and what happens next.\n") && !/\]\(</.test(index));
  check("the index says reading needs no skill and writing does", /this index and the documents it names are enough/.test(index) && /load the context-memory skill and record it/.test(index));
  check("the run reports the index size in tokens", /: 2 active document\(s\) in about \d+ tokens$/m.test(out.stdout));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  const long = "Holds a great deal. ".repeat(11).trim();
  writeFileSync(join(root, "Context/One.md"), doc("One", { description: long }));
  writeFileSync(join(root, "Context/Two.md"), doc("Two", { description: `${long} More.` }));
  writeFileSync(join(root, "Context/Mail.md"), doc("Mail", { description: "Threads with @vendor accounts." }));
  writeFileSync(join(root, "Context/Journal Archive.md"), doc("Journal Archive"));
  const out = run(root);
  check("long descriptions are reported in one line that names every one, longest first", out.stderr.split("\n").filter((l) => /description\(s\) run past 200/.test(l)).length === 1 && /2 description\(s\)/.test(out.stderr) && /Two\.md \(\d+\), One\.md \(\d+\)$/m.test(out.stderr));
  check("a description with an import-shaped word is reported", /Mail\.md: its path or description holds a word that starts with @/.test(out.stderr));
  check("an active file named as an archive is reported", /Journal Archive\.md: named as an archive but active/.test(out.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Saved Page.html"), "<!doctype html><title>Saved</title>");
  writeFileSync(join(root, "Context/Dashboard.html"), "<!--\n---\nname: Dashboard\ndescription: A filterable view of supplier quotes.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n-->\n<!doctype html>");
  const out = run(root);
  const index = read(join(root, "Context/AGENTS.md"));
  check("an HTML file with no frontmatter comment is an asset, not an error", out.status === 0 && !index.includes("Saved Page") && /left out 1 asset\(s\), 1 of them HTML with no frontmatter comment/.test(out.stdout));
  check("an HTML document with the comment is indexed", index.includes("- Dashboard.html → A filterable view of supplier quotes."));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Import.md"), "---\nname: Import\ndescription: An exported thread.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\nmetadata:\n  source: mail\n  labels:\n    - a\n    - b\nnotes: |\n  kept as it arrived\n---\n");
  const out = run(root);
  check("a metadata mapping, a list, and a block scalar under optional keys index cleanly", out.status === 0 && read(join(root, "Context/AGENTS.md")).includes("- Import.md → An exported thread."));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  for (let folder = 0; folder < 7; folder++) {
    mkdirSync(join(root, `Context/Topic ${folder}`));
    for (let n = 0; n < 12; n++) writeFileSync(join(root, `Context/Topic ${folder}/Document ${n}.md`), doc(`Document ${folder} ${n}`, { description: "Holds the notes for one part of the plan. ".repeat(4).trim() }));
  }
  const out = run(root);
  check("an index past 5000 tokens is reported as a session-start cost", /The index is about \d+ tokens, loaded at every session start, past 5000/.test(out.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  for (const mind of ["Alpha", "Beta"]) {
    mkdirSync(join(root, "Minds", mind, "Context"), { recursive: true });
    writeFileSync(join(root, "Minds", mind, "Context/Notes.md"), doc("Notes", mind === "Alpha" ? {} : { created: TODAY }));
    spawnSync("node", [GENERATOR, join(root, "Minds", mind, "Context")], { encoding: "utf8" });
  }
  const out = run(root, "--nested", "--consolidated");
  const summary = out.stderr.split("\n").find((l) => /nested Context director/.test(l)) ?? "";
  check("--nested names the nested directories with a pass due", /^WARNING: 1 nested Context directory has/.test(summary) && summary.includes(join("Minds", "Alpha", "Context")) && !summary.includes("Beta"));
  check("--consolidated records the named Context only", /pass none/.test(read(join(root, "Minds/Alpha/Context/AGENTS.md"))) && new RegExp(`pass ${TODAY}`).test(read(join(root, "Context/AGENTS.md"))));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  mkdirSync(join(root, "Context/Archive"));
  writeFileSync(join(root, "Context/Archive/Old Plan.md"), doc("Old Plan", { description: "The first plan." }));
  writeFileSync(join(root, "Context/AGENTS.md"), "Suppliers each get a file under Suppliers.\n");
  run(root);
  const first = read(join(root, "Context/AGENTS.md")) + read(join(root, "Context/Archive/AGENTS.md"));
  run(root);
  check("authored text above the block is kept and a second run is identical", first.startsWith("Suppliers each get a file under Suppliers.\n") && first === read(join(root, "Context/AGENTS.md")) + read(join(root, "Context/Archive/AGENTS.md")));
  check("an Archive folder gets an index of its own", read(join(root, "Context/Archive/AGENTS.md")).includes("- Old Plan.md → The first plan."));
  rmSync(root, { recursive: true, force: true });
}

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const stage = (root) => execFileSync("git", ["add", "-A"], { cwd: root });
const imports = (out) => /imports this index|does not import AGENTS\.md/.test(out.stderr);

{
  const root = project();
  run(root, "--consolidated=2026-01-10");
  stage(root);
  commit(root, "2026-01-12");
  check("a pass committed days after it ran leaves the repository quiet", !due(run(root)));
  writeFileSync(join(root, "Context/Status.md"), `${doc("Status")}\nAn edit that forgot the date.\n`);
  check("a tracked document edited without its date makes a pass due", due(run(root)));
  stage(root);
  commit(root, "2026-01-12");
  check("a commit after the one that recorded the pass makes a pass due", due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  run(root, "--consolidated=2026-01-10");
  stage(root);
  commit(root, "2026-01-10");
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", { created: "2026-01-10" }));
  stage(root);
  commit(root, "2026-01-10");
  check("a document committed later on the day of the pass makes one due", due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  run(root, "--consolidated=2026-01-10");
  stage(root);
  commit(root, "2026-01-10");
  writeFileSync(join(root, "Context/AGENTS.md"), `A filing convention.\n\n${read(join(root, "Context/AGENTS.md"))}`);
  mkdirSync(join(root, "Context/Archive"));
  writeFileSync(join(root, "Context/Archive/Old.md"), doc("Old"));
  stage(root);
  commit(root, "2026-01-12");
  check("index and Archive commits alone do not make a pass due", !due(run(root)));
  writeFileSync(join(root, "Context/Notes.md"), doc("Notes"));
  check("a file Git does not track is judged by its dates alone", !due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  stage(root);
  commit(root, "2026-01-05");
  run(root, "--consolidated=2026-01-10");
  writeFileSync(join(root, "Context/Status.md"), `${doc("Status")}\nTidied by the pass.\n`);
  check("a pass that is not committed yet is judged by the dates alone", !due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Status.md"), doc("Status", { modified: TODAY }));
  run(root, `--consolidated=${daysAgo(6)}`);
  check("six days after a pass nothing is due", !due(run(root)));
  run(root, `--consolidated=${daysAgo(7)}`);
  check("seven days after a pass a changed directory is due", due(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  check("no instruction file and no repository means no import warning", !imports(run(root)));
  writeFileSync(join(root, "AGENTS.md"), "# Project\n\nRead `@Context/AGENTS.md` first.\n\n```markdown\n@Context/AGENTS.md\n```\n");
  const missing = run(root);
  check("an import inside a code span or a fence does not count, and the line to add is named", /No instruction file imports this index/.test(missing.stderr) && missing.stderr.includes("reading @Context/AGENTS.md to") && missing.stderr.includes(join(root, "AGENTS.md")) && missing.stderr.includes("read Context/AGENTS.md before working"));
  writeFileSync(join(root, "AGENTS.md"), "# Project\r\n\r\n@Context/AGENTS.md\r\n");
  check("the import line in a CRLF AGENTS.md clears it", !imports(run(root)));
  for (const form of ["- @Context/AGENTS.md", "The index: @./Context/AGENTS.md"]) {
    writeFileSync(join(root, "AGENTS.md"), `# Project\n\n${form}\n`);
    check(`an import written as "${form}" counts`, !imports(run(root)));
  }
  writeFileSync(join(root, "AGENTS.md"), "# Project\n\n<!--\n@Context/AGENTS.md\n-->\n");
  check("an import inside an HTML comment does not count", imports(run(root)));
  writeFileSync(join(root, "AGENTS.md"), "# Project\n\n@Context/AGENTS.md\n");
  writeFileSync(join(root, "CLAUDE.md"), "# Claude\n");
  const unreached = run(root);
  check("a CLAUDE.md that does not import AGENTS.md is reported", /does not import AGENTS\.md/.test(unreached.stderr) && unreached.stderr.includes(join(root, "CLAUDE.md")));
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");
  check("a CLAUDE.md that imports AGENTS.md clears it", !imports(run(root)));
  writeFileSync(join(root, "AGENTS.md"), "# Project\n");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n@Context/AGENTS.md\n");
  check("the import line in CLAUDE.md clears it", !imports(run(root)));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  const out = run(root);
  check("a repository root with no instruction file is told to add one", imports(out) && out.stderr.includes(join(root, "AGENTS.md")));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = mkdtempSync(join(tmpdir(), "cm-gen-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  mkdirSync(join(root, "docs/Project Memory"), { recursive: true });
  writeFileSync(join(root, "docs/Project Memory/Status.md"), doc("Status", { created: TODAY }));
  const go = () => spawnSync("node", [GENERATOR, join(root, "docs/Project Memory"), "--force"], { encoding: "utf8" });
  writeFileSync(join(root, "AGENTS.md"), "# Project\n");
  const missing = go();
  check("a Context below the root is checked against the root file, with spaces escaped", missing.stderr.includes("@docs/Project\\ Memory/AGENTS.md") && missing.stderr.includes(join(root, "AGENTS.md")));
  writeFileSync(join(root, "AGENTS.md"), "# Project\n\n@docs/Project\\ Memory/AGENTS.md\n");
  check("the root file's import of a Context below it clears the warning", !imports(go()));
  check("the index names the folder its paths start from", read(join(root, "docs/Project Memory/AGENTS.md")).includes("under `docs/Project Memory/`"));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  writeFileSync(join(root, "AGENTS.md"), "# Workspace\n\n@Context/AGENTS.md\n");
  mkdirSync(join(root, "Minds/Alpha/Context"), { recursive: true });
  writeFileSync(join(root, "Minds/Alpha/Context/Notes.md"), doc("Notes", { created: TODAY }));
  writeFileSync(join(root, "Minds/Alpha/AGENTS.md"), "# Alpha\n");
  const go = () => spawnSync("node", [GENERATOR, join(root, "Minds/Alpha/Context")], { encoding: "utf8" });
  const missing = go();
  check("a nested Context is checked against the instruction file beside it", missing.stderr.includes("reading @Context/AGENTS.md to") && missing.stderr.includes(join(root, "Minds", "Alpha", "AGENTS.md")));
  writeFileSync(join(root, "Minds/Alpha/AGENTS.md"), "# Alpha\n\n@Context/AGENTS.md\n");
  check("the nested instruction file's import clears it", !imports(go()));
  check("a nested index names its folder from the file that imports it", read(join(root, "Minds/Alpha/Context/AGENTS.md")).includes("under `Context/`"));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/AGENTS.md"), "Suppliers each get a file under Suppliers.\n\n<!-- context-memory: last consolidation pass 2026-02-03, cadence 30 days -->\n<!-- BEGIN context-memory index (generated, do not edit) -->\n\n# Context Index\n\nFollow any durable project instructions outside this generated block.\n\n- [Status](<Status.md>) → Where the project stands and what happens next.\n\n<!-- END context-memory index -->\n");
  run(root);
  const index = read(join(root, "Context/AGENTS.md"));
  check("an index in the linked entry format is rewritten with its authored text and marker kept", index.startsWith("Suppliers each get a file under Suppliers.\n") && /pass 2026-02-03, cadence 30 days/.test(index) && index.includes("\n- Status.md → Where the project stands") && !index.includes("](<"));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/Broken Dashboard.html"), "<!doctype html>\n<!--\n---\nname: Dashboard\ndescription: A view of quotes.\n---\n-->\n");
  writeFileSync(join(root, "Context/Saved Script.html"), "<!doctype html>\n<script>\nconst page = {\nname: 'x',\ndescription: 'y',\n};\n</script>\n");
  writeFileSync(join(root, "Context/Archive Policy.md"), doc("Archive Policy"));
  mkdirSync(join(root, "Context/@team"));
  writeFileSync(join(root, "Context/@team/Notes.md"), doc("Notes"));
  const out = run(root);
  check("an HTML document whose frontmatter comment is broken is still an error", out.status === 1 && /Broken Dashboard\.html: missing frontmatter block/.test(out.stderr));
  check("a saved page whose script has name and description lines stays an asset", !/Saved Script\.html/.test(out.stderr));
  check("a document about archiving is not taken for an archive", !/Archive Policy\.md: named as an archive/.test(out.stderr));
  check("a path that starts a segment with @ is reported", /@team\/Notes\.md: its path or description holds a word that starts with @/.test(out.stderr));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context/Supplier Notes"));
  mkdirSync(join(root, "Context/Archive"));
  mkdirSync(join(root, "docs"));
  writeFileSync(join(root, "Context/Supplier Notes/Acme Call.md"), page("Acme Call", "## Price\n\nSee [Status](../Status.md)."));
  writeFileSync(join(root, "Context/Plan.md"), page("Plan", [
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
  writeFileSync(join(root, "Context/R&D.md"), page("R&D", "Research notes."));
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
  writeFileSync(join(root, "Context/Plan.md"), page("Plan", "See [gone](Gone.md)."));
  const out = run(root, "--check");
  const wrote = ["Context/AGENTS.md", "Context/Archive/AGENTS.md", ".gitignore"].filter((f) => existsSync(join(root, f)));
  check("--check reports and writes nothing", out.status === 0 && unresolved(out).length === 1 && out.stdout.includes("Wrote nothing") && out.stderr.includes("missing or out of date") && wrote.length === 0, wrote.join(", "));
  check("--check sends a due pass to the owning session and does not order one", out.stderr.includes("A consolidation pass is due") && out.stderr.includes("Tell the session that owns this Context.") && !out.stderr.includes("Start it in this turn"));
  const refused = run(root, "--check", "--consolidated");
  check("--check refuses to record a pass", refused.status === 1 && !existsSync(join(root, "Context/AGENTS.md")));
  run(root);
  writeFileSync(join(root, "Context/Plan.md"), page("Plan", "Nothing linked."));
  rmSync(join(root, "Context/Status.md"));
  const stale = run(root, "--check");
  check("a stale generated index is called out of date, not a broken link", unresolved(stale).length === 0 && stale.stderr.includes("missing or out of date"));
  rmSync(root, { recursive: true, force: true });
}

// Where the import check, the path-only index, and the link check meet.
{
  const root = project();
  writeFileSync(join(root, "AGENTS.md"), "# Project\n\n`Context/` is this project's memory. If no Context Index is in your context, read `Context/AGENTS.md` before working here.\n\n@Context/AGENTS.md\n");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n");
  const out = run(root);
  check("the import line and its fallback sentence are not read as links", unresolved(out).length === 0 && !imports(out));
  rmSync(join(root, "Context/Status.md"));
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan"));
  check("a path-only index entry for a document that is gone is not a broken link", unresolved(run(root)).length === 0 && !read(join(root, "Context/AGENTS.md")).includes("Status.md"));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  writeFileSync(join(root, "Context/AGENTS.md"), "<!-- context-memory: last consolidation pass none, cadence 7 days -->\n<!-- BEGIN context-memory index (generated, do not edit) -->\n\n# Context Index\n\n- [Gone](<Gone.md>) → A document that was removed.\n- [Status](<Status.md>) → Where the project stands and what happens next.\n\n<!-- END context-memory index -->\n");
  const checked = run(root, "--check");
  check("an index still in the linked format is called out of date under --check, not a broken link", unresolved(checked).length === 0 && checked.stderr.includes("missing or out of date") && read(join(root, "Context/AGENTS.md")).includes("[Gone](<Gone.md>)"));
  check("a plain run rewrites it without reporting its old links", unresolved(run(root)).length === 0 && !read(join(root, "Context/AGENTS.md")).includes("]("));
  rmSync(root, { recursive: true, force: true });
}
{
  const root = project();
  mkdirSync(join(root, "Context-Inbox"));
  writeFileSync(join(root, "Context-Inbox/note.txt"), "a note\n");
  writeFileSync(join(root, "Context/Plan.md"), doc("Plan", { description: "The plan. See [gone](Gone.md)." }) + "\nSee [gone](Gone.md).\n");
  const out = run(root, "--check");
  const lines = out.stderr.split("\n").filter((l) => l.startsWith("WARNING"));
  check("--check reports the import, the inbox, and the due pass to the owning session and orders nothing", out.status === 0 && imports(out) && /Tell the session that owns this Context to drain it/.test(out.stderr) && !/Drain it in this turn|Start it in this turn/.test(out.stderr) && !existsSync(join(root, "Context/AGENTS.md")) && !existsSync(join(root, ".gitignore")));
  check("--check reports the index size and says it wrote nothing", /Wrote nothing \(--check\), so what follows goes to the session that owns this Context\. Read .*: 2 active document\(s\) in about \d+ tokens/.test(out.stdout));
  const kinds = lines.map((l) => (/pass is due/.test(l) ? "due" : /holds 1 file/.test(l) ? "inbox" : /imports this index/.test(l) ? "import" : /the link to|listed above/.test(l) ? "link" : "other"));
  check("this turn's tasks still print before the link findings", kinds.join(" ").startsWith("due inbox import") && kinds.indexOf("link") > kinds.indexOf("import"), kinds.join(" "));
  rmSync(root, { recursive: true, force: true });
}
{
  const workspace = mkdtempSync(join(tmpdir(), "cm-gen-"));
  const root = project({ root: join(workspace, "lamp") });
  mkdirSync(join(workspace, "storefront"));
  writeFileSync(join(workspace, "storefront/Notes.md"), "See [status](../lamp/Context/Status.md).\n");
  run(root, `--links=${join(workspace, "storefront")}`, "--consolidated=2026-01-10");
  stage(root);
  commit(root, "2026-01-10");
  const index = read(join(root, "Context/AGENTS.md"));
  const quiet = run(root);
  check("a pass recorded beside a remembered --links folder is read back and stays quiet", /pass 2026-01-10, cadence 7 days -->\n<!-- context-memory: also check links in <..\/..\/storefront> -->/.test(index) && !due(quiet) && index === read(join(root, "Context/AGENTS.md")));
  writeFileSync(join(root, "Context/Status.md"), doc("Status") + "\nSee [gone](Gone.md).\n");
  const refused = run(root, "--consolidated");
  check("a pass refused for a broken link prints no record line and keeps the old date", refused.status === 1 && !/Recorded a consolidation pass/.test(refused.stdout) && /pass 2026-01-10/.test(read(join(root, "Context/AGENTS.md"))));
  rmSync(workspace, { recursive: true, force: true });
}
{
  const root = project({ git: false });
  mkdirSync(join(root, "Context/Archive"));
  writeFileSync(join(root, "Context/Archive/Old Plan.md"), doc("Old Plan", { description: "The first plan." }) + "\nSee [status](../Status.md) and [gone](<../Gone Plan.md>).\n");
  const lines = unresolved(run(root));
  check("an Archive index of plain paths adds no links, and an archived document's own broken link is reported", lines.length === 1 && lines[0].includes("Archive/Old Plan.md") && read(join(root, "Context/Archive/AGENTS.md")).includes("- Old Plan.md → The first plan."), lines.join(" | "));
  rmSync(root, { recursive: true, force: true });
}
{
  const workspace = mkdtempSync(join(tmpdir(), "cm-gen-"));
  const root = project({ root: join(workspace, "lamp") });
  writeFileSync(join(root, "README.md"), "Read [the index](Context/AGENTS.md) first.\n");
  check("under --check a link to an index that is not written yet does not resolve", unresolved(run(root, "--check")).length === 1);
  run(root);
  mkdirSync(join(workspace, "storefront"));
  writeFileSync(join(workspace, "storefront/Notes.md"), "See [a retired plan](<../lamp/Context/Retired Plan.md>).\n");
  const once = run(root, "--check", `--links=${join(workspace, "storefront")}`);
  check("--check with --links reads the folder for this run and does not call a current index out of date", unresolved(once).length === 1 && !once.stderr.includes("missing or out of date") && !read(join(root, "Context/AGENTS.md")).includes("also check links in"));
  rmSync(workspace, { recursive: true, force: true });
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${!r.ok && r.detail ? ` (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
if (failed) process.exit(1);
