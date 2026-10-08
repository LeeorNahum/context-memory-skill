"""Grade the check assertions of context-memory eval sessions, and package each eval for the critics.

Usage: python grade.py <jobs file> <round>
Environment: EVAL_ROOT, the run folder run.py used.

Every job in the jobs file of that round must have a session folder. A missing or unfinished session
is graded as failing every assertion. Each check assertion in ../evals.json maps to a function here
by its id, and an assertion with no function fails. Changes are read against the baseline commit
run.py recorded, so a session that commits its own work is still graded on it.

Writes EVAL_ROOT/grades-<round>.json and prints one line per session. Writes one blind package per
eval under EVAL_ROOT/judge/<round>-<eval>/: prompt.txt, semantic.json (the semantic assertions),
and per letter answer.txt, diff.txt, and project/ (the whole resulting project without .git or the
installed skill), with key.json beside them. An existing package folder is never overwritten.
"""
import csv, html, io, json, os, pathlib, random, re, shutil, subprocess, sys, urllib.parse
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
SPEC = json.loads((HERE.parent / 'evals.json').read_text(encoding='utf-8'))
EVALS = {e['name']: e for e in SPEC['evals']}
ROOT = pathlib.Path(os.environ.get('EVAL_ROOT', '')).resolve()
SKIP = ('.claude/', '.agents/', '.git/')
MISSPELLED = ('rechargable', 'recieve')


def git(work, *args):
    return subprocess.run(['git', *args], cwd=work, capture_output=True, text=True)


def index_parts(text):
    """The authored text, the marker, and the (path, description) entries of a Context index, in either entry format."""
    authored = re.split(r'<!-- (?:context-memory:|BEGIN )', text)[0].strip()
    marker = re.search(r'last consolidation pass \S+ cadence \d+ days', text.replace(',', ''))
    entries = {(m.group(1) or m.group(2), m.group(3)) for m in re.finditer(r'(?m)^- (?:\[.*?\]\(<(.*?)>\)|(.+?)) → (.*)$', text)}
    return authored, marker.group(0) if marker else None, entries


def changed(work, baseline):
    names = git(work, 'diff', '--name-only', baseline).stdout.splitlines()
    # Ignored files count too, so a restraint eval sees an inbox the session created and ignored.
    names += git(work, 'ls-files', '--others').stdout.splitlines()
    out = {n.strip().strip('"') for n in names if n.strip() and not n.strip('"').startswith(SKIP)}
    # A regenerated index that lists the same documents in another entry format is not a change
    # to the project's knowledge, so a snapshot with an older generator is graded on what it wrote.
    index = 'Context/AGENTS.md'
    if index in out and index_parts(git(work, 'show', f'{baseline}:{index}').stdout) == index_parts(read(work, index)):
        out.discard(index)
    return sorted(out)


def read(work, rel):
    p = work / rel
    return p.read_text(encoding='utf-8', errors='replace') if p.is_file() else ''


def active(work):
    ctx = work / 'Context'
    if not ctx.is_dir():
        return {}
    return {str(p.relative_to(work)).replace('\\', '/'): p.read_text(encoding='utf-8', errors='replace')
            for p in ctx.rglob('*') if p.is_file() and p.suffix in ('.md', '.html') and p.name != 'AGENTS.md'
            and 'Archive' not in p.relative_to(ctx).parts}


def archived_text(work):
    ctx = work / 'Context'
    return '\n'.join(p.read_text(encoding='utf-8', errors='replace') for p in ctx.rglob('*')
                     if p.is_file() and 'Archive' in p.relative_to(ctx).parts) if ctx.is_dir() else ''


def bom(work):
    return {r['part'].strip().lower(): r for r in csv.DictReader(io.StringIO(read(work, 'bom.csv')))}


def enclosure(work):
    return next((r for k, r in bom(work).items() if k.startswith('enclosure')), None)


def own_ignore(work):
    """Whether a .gitignore inside the repository, not a local or global exclude, ignores Context-Inbox."""
    r = git(work, 'check-ignore', '--no-index', '-v', 'Context-Inbox/')
    if r.returncode != 0:
        return False
    source = r.stdout.split(':')[0].replace('\\', '/')
    return pathlib.PurePosixPath(source).name == '.gitignore' and not source.startswith('.git/') and not re.match(r'^([A-Za-z]:)?/', source)


def readme_clean(work):
    t = read(work, 'README.md')
    return 'Trailhead Lamp' in t and 'camping lamp' in t and not any(w in t for w in MISSPELLED)


def has_frontmatter(text):
    m = re.match(r'---\r?\n(.*?)\r?\n---', text, re.S)
    return bool(m) and all(re.search(rf'(?m)^{k}:\s*\S', m.group(1)) for k in ('name', 'description', 'date_created', 'date_modified'))


def stale_bolt_date(docs):
    past = re.compile(r'cancel|no longer|was |previous|earlier|void|instead|replac|dropped|supersed|fell through|could not|can.t', re.I)
    return any('2026-10-12' in line and 'Bolt' in line and not past.search(line) for t in docs.values() for line in t.splitlines())


def links(work, rel):
    """Each relative inline Markdown link in a file as (target, the path it resolves to), with code and comments left out."""
    kept, fenced = [], False
    for line in read(work, rel).splitlines():
        if re.match(r'[\s>]*(```|~~~)', line):
            fenced = not fenced
        elif not fenced:
            kept.append(line)
    text = re.sub(r'<!--.*?-->|`[^`\n]*`', '', '\n'.join(kept), flags=re.S)
    found = []
    # A destination in angle brackets or with nested parentheses, then an optional title, across at most a line break each.
    for m in re.finditer(r'\]\(\s*(?:<([^<>\n]*)>|((?:[^()\s]|\((?:[^()\s]|\((?:[^()\s]|\([^()\s]*\))*\))*\))+))(?:\s+(?:"[^"]*"|\'[^\']*\'))?\s*\)', text):
        raw = m.group(1) if m.group(1) is not None else m.group(2)
        target = html.unescape(re.sub(r'\\([!-/:-@\[-`{-~])', r'\1', raw)).split('#')[0].strip()
        if target and not re.match(r'[A-Za-z][A-Za-z0-9+.-]*:|/', target):
            paths = [(work / rel).parent / t for t in (target, urllib.parse.unquote(target))]
            found.append((target, next((p for p in paths if p.exists()), paths[0])))
    return found


def dangling(work):
    """Relative Markdown links anywhere in the project whose target does not exist, as 'file -> target'."""
    files = [str(p.relative_to(work)).replace('\\', '/') for p in work.rglob('*.md')]
    return [f'{f} -> {t}' for f in files if not f.startswith(SKIP) for t, p in links(work, f) if not p.exists()]


def links_to_archived_steps(work):
    return any(p.is_file() and 'Archive' in p.resolve().relative_to(work.resolve()).parts and 'Solder the LED module' in p.read_text(encoding='utf-8', errors='replace')
               for _, p in links(work, 'docs/Assembly Notes.md') if p.exists() and work.resolve() in p.resolve().parents)


def skill_read(base):
    """Whether the session record shows the skill's SKILL.md being opened, by a skill tool call or by a
    read or shell command that names the file. The list of installed skills a session starts with is not a read."""
    for line in read(base, 'session.jsonl').splitlines():
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        calls = [c for c in (d.get('message') or {}).get('content') or [] if isinstance(c, dict) and c.get('type') == 'tool_use'] if d.get('type') == 'assistant' else []
        for c in calls:
            arg = json.dumps(c.get('input'))
            if (c.get('name') == 'Skill' and 'context-memory' in arg) or re.search(r'context-memory[\\/]+SKILL\.md', arg):
                return True
        item = d.get('item') or {}
        if d.get('type', '').startswith('item.') and re.search(r'context-memory[\\/]+SKILL\.md', json.dumps(item)):
            return True
    return False


def imports_index(work):
    return any(l.strip() == '@Context/AGENTS.md' for f in ('AGENTS.md', 'CLAUDE.md') for l in read(work, f).splitlines())


def sanitize(text):
    text = re.sub(r'[A-Za-z]:[\\/][^\s"\'`]*?skill-(old|new)[\\/]+context-memory', '<skill>', text)
    return text.replace(str(ROOT), '<run>').replace(str(ROOT).replace('\\', '/'), '<run>')


def answer(base, model):
    if model == 'sol':
        return read(base, 'last-message.txt')
    for line in reversed(read(base, 'session.jsonl').splitlines()):
        if '"type":"result"' in line:
            try:
                return json.loads(line).get('result') or ''
            except json.JSONDecodeError:
                return ''
    return ''


def checks(work, base, ch, session_dates):
    enc = enclosure(work)
    led = bom(work).get('led module')
    gitignore_lines = [l.strip() for l in read(work, '.gitignore').splitlines()]
    docs = active(work)
    index = read(work, 'Context/AGENTS.md')
    return {
        'plan-handoff-01': lambda: bool(enc) and 'bolt' in enc['supplier'].lower() and 'black' in enc['part'].lower() and enc['unit_cost'].strip() in ('6.10', '6.1'),
        'edit-hides-decision-01': lambda: readme_clean(work) and not re.search(r'three brightness|3 brightness', read(work, 'README.md'), re.I),
        'typo-only-01': lambda: readme_clean(work),
        'typo-only-02': lambda: not any(f.startswith(('Context/', 'Context-Inbox/')) for f in ch),
        'general-question-02': lambda: all(f == '.gitignore' for f in ch) and all(l in ('', 'Context-Inbox/', '/Context-Inbox/') for l in gitignore_lines),
        'state-change-draft-01': lambda: (lambda d: 'Bolt' in d and bool(re.search(r'deposit', d, re.I)) and bool(re.search(r'invoice', d, re.I)) and bool(re.search(r'\?|please|could you|would you|send', d, re.I)))(read(work, 'drafts/bolt-invoice.txt')),
        'reconcile-dependents-01': lambda: bool(enc) and 'acme' in enc['supplier'].lower() and 'blue' in enc['part'].lower() and enc['unit_cost'].strip() in ('4.80', '4.8'),
        'reconcile-dependents-02': lambda: not stale_bolt_date(docs),
        'inbox-drain-01': lambda: not (work / 'Context-Inbox').exists(),
        'inbox-drain-02': lambda: own_ignore(work),
        'price-decision-01': lambda: '$39' in read(work, 'README.md') and 'Trailhead Lamp' in read(work, 'README.md'),
        'price-decision-02': lambda: own_ignore(work),
        'consolidation-due-01': lambda: bool(led) and led['unit_cost'].strip() == '1.05',
        'consolidation-due-02': lambda: any(f'last consolidation pass {d}' in index for d in session_dates),
        'consolidation-due-03': lambda: 'Context/Prototype Build Steps.md' not in docs and all(step in archived_text(work) for step in ('Solder the LED module to the driver board', 'Wire the battery through the charge controller', 'Fit everything in a 3D-printed test shell')),
        'create-context-01': lambda: '$35' in read(work, 'README.md') and 'Trailhead Lamp' in read(work, 'README.md'),
        'create-context-02': lambda: bool(docs) and 'BEGIN context-memory index' in index and 'END context-memory index' in index and all(pathlib.PurePosixPath(d).name in index and has_frontmatter(t) for d, t in docs.items()),
        'create-context-03': lambda: own_ignore(work),
        'log-entry-01': lambda: (lambda log: '**2026-09-18, CellWorks:** confirmed the 2000 mAh battery at $2.10 for 100 units.' in log and '**2026-09-05, Lumen Co:** sent LED module samples. Price $1.20 each.' in log and bool(re.search(r'PortParts.{0,300}500|500.{0,300}PortParts', log, re.S)) and '0.31' in log)(read(work, 'Context/Supplier Log.md')),
        'create-context-05': lambda: imports_index(work) and 'last consolidation pass none' in index,
        'correction-final-01': lambda: (lambda rows: any('2200' in k for k in rows) and not any('2000' in k for k in rows))(bom(work)),
        'correction-final-02': lambda: bool(docs) and not any('2000' in t for t in docs.values()),
        'tentative-idea-01': lambda: readme_clean(work),
        'tentative-idea-02': lambda: 'bom.csv' not in ch,
        'working-rule-01': lambda: 'AGENTS.md' in ch and any(re.search(r'\bBOM\b|bom\.csv|bill of materials', l, re.I) and re.search(r'\bOK\b|approv|confirm|go-ahead|wait for', l, re.I) for l in read(work, 'AGENTS.md').splitlines()),
        'working-rule-02': lambda: 'bom.csv' not in ch,
        'lookup-only-02': lambda: all(f == '.gitignore' for f in ch) and all(l in ('', 'Context-Inbox/', '/Context-Inbox/') for l in gitignore_lines),
        'lookup-only-03': lambda: not skill_read(base),
        'wire-import-01': lambda: (lambda t: 'Trailhead Lamp' in t and bool(re.search(r'warranty', t, re.I)) and bool(re.search(r'1[- ]year|one[- ]year', t, re.I)))(read(work, 'README.md')),
        'wire-import-02': lambda: imports_index(work),
        'change-keeps-log-01': lambda: any('2200' in k and r['unit_cost'].strip() in ('2.40', '2.4') for k, r in bom(work).items()),
        'change-keeps-log-02': lambda: (lambda log: '**2026-09-18, CellWorks:** confirmed the 2000 mAh battery at $2.10 for 100 units.' in log and '**2026-09-05, Lumen Co:** sent LED module samples. Price $1.20 each.' in log)(read(work, 'Context/Supplier Log.md')),
        'lookup-with-decision-02': lambda: any(re.search(r'warranty', t, re.I) and re.search(r'2[- ]year|two[- ]year', t, re.I) for t in docs.values()),
        'archive-linked-doc-01': lambda: 'Context/Prototype Build Steps.md' not in docs and all(step in archived_text(work) for step in ('Solder the LED module to the driver board', 'Wire the battery through the charge controller', 'Fit everything in a 3D-printed test shell')),
        'archive-linked-doc-02': lambda: links_to_archived_steps(work) and not dangling(work),
        'ineligible-project-01': lambda: '$29' in read(work, 'README.md') and 'Trailhead Lamp' in read(work, 'README.md'),
        'ineligible-project-02': lambda: not (work / 'Context').exists() and 'Context-Inbox' not in read(work, '.gitignore'),
    }


def main():
    jobs_file, rnd = sys.argv[1], sys.argv[2]
    labels = [l.split()[0] for l in pathlib.Path(jobs_file).read_text().splitlines() if l.strip() and not l.startswith('#')]
    labels = [l for l in labels if l.startswith(f'{rnd}-')]
    rows = []
    for label in labels:
        m = re.match(r'(\d+)-(.+)-(old|new|none)-(opus|sol)$', label)
        name, arm, model = m.group(2), m.group(3), m.group(4)
        base = ROOT / 'builds' / label
        work = base / 'work'
        result = json.loads(read(base, 'result.json') or '{}')
        ids = [a['id'] for a in EVALS[name]['assertions'] if a['kind'] == 'check']
        verdicts = {i: False for i in ids}
        ch, error = [], None
        if result.get('completed'):
            try:
                ch = changed(work, result['baseline'])
                stamps = [datetime.fromisoformat(result['started']), datetime.fromisoformat(result.get('finished') or result['started'])]
                # A session may date its work in local time or in UTC, so both count.
                dates = {d.strftime('%Y-%m-%d') for t in stamps for d in (t, t.astimezone(timezone.utc))}
                table = checks(work, base, ch, dates)
            except Exception as e:
                table, error = {}, repr(e)
            for i in ids:
                fn = table.get(i)
                try:
                    verdicts[i] = bool(fn()) if fn else False
                except Exception as e:
                    verdicts[i], error = False, repr(e)
        rows.append({'build': label, 'eval': name, 'arm': arm, 'model': model, 'completed': bool(result.get('completed')),
                     'timed_out': result.get('timed_out'), 'seconds': result.get('seconds'), 'skill_read': skill_read(base),
                     'changed': ch, 'checks': verdicts, 'error': error})
    (ROOT / f'grades-{rnd}.json').write_text(json.dumps(rows, indent=2), encoding='utf-8')
    for r in rows:
        fails = [k for k, v in r['checks'].items() if not v]
        state = 'MISSING' if not r['completed'] else ('PASS' if not fails else 'FAIL ' + ','.join(fails))
        print(f"{r['build']:46} skill={r['skill_read']!s:5} {state}{'  ' + r['error'] if r['error'] else ''}")
    rng = random.Random(f'{rnd}')
    for name in sorted({r['eval'] for r in rows}):
        folder = ROOT / 'judge' / f'{rnd}-{name}'
        if folder.exists():
            print(f'{folder} exists, left as is')
            continue
        sel = [r for r in rows if r['eval'] == name and r['completed']]
        rng.shuffle(sel)
        folder.mkdir(parents=True)
        (folder / 'prompt.txt').write_text(EVALS[name]['prompt'], encoding='utf-8')
        (folder / 'semantic.json').write_text(json.dumps([a for a in EVALS[name]['assertions'] if a['kind'] == 'semantic'], indent=2), encoding='utf-8')
        key = {}
        for i, r in enumerate(sel):
            letter = chr(ord('A') + i)
            base = ROOT / 'builds' / r['build']
            work = base / 'work'
            result = json.loads(read(base, 'result.json'))
            out = folder / letter
            shutil.copytree(work, out / 'project', ignore=shutil.ignore_patterns('.git', '.claude', '.agents'))
            diff = git(work, 'diff', '--no-color', result['baseline'], '--', '.', ':!.claude', ':!.agents').stdout
            untracked = git(work, 'ls-files', '--others', '--exclude-standard').stdout.splitlines()
            diff += ''.join(f'\n--- new file: {f}\n{read(work, f)}' for f in untracked if not f.startswith(SKIP))
            (out / 'diff.txt').write_text(sanitize(diff), encoding='utf-8')
            (out / 'answer.txt').write_text(sanitize(answer(base, r['model'])), encoding='utf-8')
            key[letter] = r['build']
        (folder / 'key.json').write_text(json.dumps(key, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
