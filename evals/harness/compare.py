"""Decide whether a changed skill passes, from the check grades and the critics' verdicts.

Usage: python compare.py <jobs file> <round>
Environment: EVAL_ROOT.

Reads grades-<round>.json from grade.py, and from every judge/<round>-<eval> folder its key.json,
every critic-*.json, and critic-answers.json, which records how each blocking finding against a
new session settled: {"<letter>": {"<finding text>": "withdrawn|held"}}.

Prints the failures and exits 0 only when:
- the round holds every eval with both arms and both models, and every job has a finished session,
- every session has a verdict on exactly its eval's assertions,
- every new session passes every check and every semantic assertion,
- no assertion that every old session passed fails in a new session, and
- every blocking finding against a new session is recorded as withdrawn.
"""
import json, os, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
EVALS = {e['name']: e for e in json.loads((HERE.parent / 'evals.json').read_text(encoding='utf-8'))['evals']}
ROOT = pathlib.Path(os.environ.get('EVAL_ROOT', '')).resolve()


def main():
    jobs_file, rnd = sys.argv[1], sys.argv[2]
    labels = [l.split()[0] for l in pathlib.Path(jobs_file).read_text().splitlines() if l.strip() and not l.startswith('#')]
    labels = [l for l in labels if l.startswith(f'{rnd}-')]
    grades = {r['build']: r for r in json.loads((ROOT / f'grades-{rnd}.json').read_text(encoding='utf-8'))}
    problems = []
    expected = {f'{rnd}-{name}-{arm}-{model}' for name in EVALS for arm in ('old', 'new') for model in ('opus', 'sol')}
    for missing in sorted(expected - set(labels)):
        problems.append(f'{missing}: not in the jobs file')
    verdict = {}
    for label in labels:
        g = grades.get(label)
        if not g or not g['completed']:
            problems.append(f'{label}: no finished session')
            continue
        verdict[label] = dict(g['checks'])
    unsettled = []
    for name, spec in EVALS.items():
        folder = ROOT / 'judge' / f'{rnd}-{name}'
        semantic = [a['id'] for a in spec['assertions'] if a['kind'] == 'semantic']
        in_round = [l for l in labels if l.split('-', 1)[1].startswith(name + '-')]
        if not in_round:
            continue
        if not folder.exists():
            problems.append(f'{name}: no judge folder')
            continue
        key = json.loads((folder / 'key.json').read_text(encoding='utf-8'))
        critics = [json.loads(p.read_text(encoding='utf-8')) for p in folder.glob('critic-*.json') if p.name != 'critic-answers.json']
        finished = {l for l in in_round if grades.get(l, {}).get('completed')}
        for absent in sorted(finished - set(key.values())):
            problems.append(f'{absent}: finished but missing from {folder.name}/key.json')
        answers_file = folder / 'critic-answers.json'
        answers = json.loads(answers_file.read_text(encoding='utf-8')) if answers_file.exists() else {}
        for letter, label in key.items():
            judged = [c[letter] for c in critics if letter in c]
            if semantic and not judged:
                problems.append(f'{label}: no critic judged letter {letter}')
            for aid in semantic:
                votes = [j.get('semantic', {}).get(aid, {}).get('v') for j in judged]
                verdict.setdefault(label, {})[aid] = bool(votes) and all(v == 'pass' for v in votes)
            if label.split('-')[-2] == 'new':
                for j in judged:
                    for finding in j.get('blocking', []):
                        if answers.get(letter, {}).get(finding) != 'withdrawn':
                            unsettled.append(f'{label} ({letter}): {finding}')
    for label, v in verdict.items():
        name = label.split('-', 1)[1].rsplit('-', 2)[0]
        want = {a['id'] for a in EVALS[name]['assertions']}
        if set(v) != want:
            problems.append(f'{label}: verdicts cover {sorted(set(v))}, expected {sorted(want)}')
    new = {l: v for l, v in verdict.items() if l.split('-')[-2] == 'new'}
    old = {l: v for l, v in verdict.items() if l.split('-')[-2] == 'old'}
    for label, v in sorted(new.items()):
        for aid, ok in v.items():
            if not ok:
                problems.append(f'{label}: fails {aid}')
    for name in EVALS:
        olds = [v for l, v in old.items() if l.split('-', 1)[1].startswith(name + '-')]
        news = [(l, v) for l, v in new.items() if l.split('-', 1)[1].startswith(name + '-')]
        for aid in {a for v in olds for a in v}:
            if olds and all(v.get(aid) for v in olds):
                for l, v in news:
                    if not v.get(aid):
                        problems.append(f'{l}: regressed on {aid}, which every old session passed')
    problems += [f'unsettled blocking finding against {u}' for u in unsettled]
    for label in sorted(verdict):
        v = verdict[label]
        print(f'{label:46} {sum(v.values())}/{len(v)}')
    for arm, group in (('old', old), ('new', new)):
        a = [x for v in group.values() for x in v.values()]
        print(f'{arm}: {sum(all(v.values()) for v in group.values())}/{len(group)} sessions, {sum(a)}/{len(a)} assertions')
    for p in sorted(set(problems)):
        print('FAIL', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
