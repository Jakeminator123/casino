# Steg A: lista alla mp4 under rötterna, med storlek och en snabb nyckel (storlek + sha1 av första 1 MB).
# Läser bara; skriver inventory.jsonl i slaskens kort-dataset/ (slasken är DEALER_SLASK eller <repo>/../slask/blackjack-dealer).
#   python -I inventory.py [<rot> ...]      (utan rötter: repots assets/)
import os, sys, json, hashlib, time

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
ROOTS = sys.argv[1:] or [os.path.join(REPO, 'assets')]
OUT = os.path.join(os.path.abspath(os.environ.get('DEALER_SLASK') or os.path.join(REPO, '..', 'slask', 'blackjack-dealer')), 'kort-dataset', 'inventory.jsonl')
SKIP_DIRS = {'kort-dataset', 'node_modules', '.git'}

def quick_key(p, size):
    h = hashlib.sha1()
    with open(p, 'rb') as f:
        h.update(f.read(1 << 20))
    return f'{size}-{h.hexdigest()[:16]}'

def main():
    t0 = time.time(); n = 0
    missing = [r for r in ROOTS if not os.path.isdir(r)]
    if missing: sys.exit(f'Ingen mapp: {", ".join(missing)}')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as out:
        for root in ROOTS:
            for d, dirs, files in os.walk(root):
                dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
                for name in files:
                    if not name.lower().endswith('.mp4'): continue
                    p = os.path.join(d, name)
                    try:
                        size = os.path.getsize(p)
                        if size < 20000: continue
                        out.write(json.dumps({'path': p.replace('\\', '/'), 'size': size, 'key': quick_key(p, size)}, ensure_ascii=False) + '\n'); n += 1
                    except OSError as e:
                        print('fel', p, e, file=sys.stderr)
    print(f'{n} filmer, {time.time() - t0:.0f} s')

if __name__ == '__main__':
    main()
