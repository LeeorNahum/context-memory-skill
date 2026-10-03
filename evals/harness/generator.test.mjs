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

function project({ git = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cm-gen-"));
  mkdirSync(join(root, "Context"));
  writeFileSync(join(root, "Context/Status.md"), "---\nname: Status\ndescription: Where the project stands and what happens next.\ndate_created: 2026-01-01\ndate_modified: 2026-01-01\n---\n\n# Status\n");
  if (git) execFileSync("git", ["init", "-q"], { cwd: root });
  return root;
}
const run = (root, ...flags) => spawnSync("node", [GENERATOR, join(root, "Context"), ...flags], { encoding: "utf8" });
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
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

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
if (failed) process.exit(1);
