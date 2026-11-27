"""En ny dealer ur bilder av en person, en rad (Jakob 2026-11-27: "ett generiskt sätt att få en pipeline för en helt och
hållet ny dealer, som till allra största del är ett resultat av alla de rörelsesekvenser som vi nu har tagit in").
Gratis och här på datorn; inga betalda anrop. De betalda stegen skrivs som färdiga anrop med sin kostnad, och läggs av
den som får betala (blackjack-dealer/tools/runway-api.ts place).

    python ny_dealer.py <person> [--stil kameran|bordet] [--namn <docka>] [--utseende "<text på engelska>"]
                        [--plats 4] [--prov <provmapp>] [--omgang <v2>] [--aleph] [--ankarklipp [--rygg rod] [--om-klipp 1] [--efter-prov]]
                        [--steg 1-7] [--lage]

<person> är mappen i input/ med bilderna (1-portratt, 2-helfigur, 3-halvfigur). Stegen, i ordning:
  1 matt     personens mått ur bilderna: SAM 3D Body och MediaPipe (steg/15-matt-ur-bilder/matt_ur_bilder.py) ->
             personer/<person>.json, och en ritning av mätningen över bilderna
  2 docka    dockan efter måtten, byggd på den docka vars rörelser personen spelar (Danilos för kameran, Frasses för
             bordet): Blender utan fönster, scen/bygg_docka.py --kon <docka> -> assets/docka/standarddocka_<docka>.glb
             (under låset ../slask/blackjack-dealer/gpu-och-headless.lock)
  3 system   dockan mätt på sin egen modell (blackjack-dealer/dealer3d/tools/docka-matt.ts --fil) och skriven i
             blackjack-dealer/dealer3d/src/persondockor.ts: då är den med i LIVE_DOLLS, i editorn och i verktygen
  4 rorelser de lyfta rörelserna i stilen på dockan (dealer3d/tools/lyft-till-docka.ts --docka <docka>) och kontrollen
             (dealer3d/tools/lyft-kolla.ts)
  5 film     dockans giv till dagens plats --plats (förval 4, mittplatsen) genom livebordets kamera i nyckelutseendet,
             filmad med editorn (standarddocka/verktyg/titta.ts), och rutorna ur den: första och sista, och emellan
             rutorna vid rörelsens egna händelser (rutorna nedan), med en text per ruta om vad dockan gör och var kortet är,
             ur rörelsens egna tal
  6 anrop    de betalda anropen, färdiga men inte lagda: stillbilderna (GPT Image 2.6 Sunburst genom Runway, personens
             bilder som förlaga och dockans rutor som ställning; efter att kortet ligger som ändringar av sista bilden) och
             filmen A, Kling 4 med första bild, mellanbilderna och sista bild; med --aleph också B, Aleph 2 över dockfilmen
             med startbilden som styrbild; med vad var och en kostar
--ankarklipp gör given som tre klipp mellan rörelseschemats ankare i stället (avsnittet "5-7 ankarklipp" nedan):
  5          givens dockfilm, de fyra ankarrutorna (A2.3, A2M, A3PnC1, A2.3 med kortet) och dockans film av varje steg som
             referensfilm, fylld till 3 s med stillhet i ankarna
  6          ankarbilderna (en gång per person och kamera) och tre anrop till Kling 4 med ankarbilderna som första och sista
             bild och stegets referensfilm, med kostnaden och vilka rutor av varje levererat klipp som är steget
  7 efter    när klippen ligger i ut/klipp-<nr>.mp4: stegen ut ur stillheten, där klippet gör rörelsen (det mäts hur mycket
             senare än dockan), hela given ihopsatt av klippens egna rutor i klippens bildtakt (inga upprepade), och dealern
             på vårt bord med vår sko och vårt kort
             (--efter-prov: referensfilmerna i klippens ställe, för att pröva efterarbetet utan något betalt)
--rygg rod (med --ankarklipp) ger kortet dess riktiga röda rygg med vit kant i dockans film och i ankarbilderna, så att
filmmodellen ritar ryggen själv, också i farten; efterarbetet ritar då bara framsidan (lagg-pa-bord.ts --rygg-ur-filmen).
Förvalet spar är spårkortets gula rygg, som efterarbetet byter mot vår: det gick inte rent där hand och kort är utsmetade
av farten (Kenjis fjärde omgång, dömd fyra gånger 2026-11-27).
--om-klipp 1 (med --ankarklipp --steg 6) skriver bara en ny tagning av de klippen (klipp-<nr>-t<n>.json, med eget namn i
liggaren och egen fil), när ett levererat klipp inte håller; ankarbilderna och de andra klippen rörs inte, och steg 7 tar
den senaste tagningen av varje klipp. Klippens text säger bara det som syns i klippet: en beskrivning av kortets framsida
i ett klipp där bara ryggen syns fick Kling 4 att rita ett stort vitt kort på filten (Kenjis femte omgång).
--omgang lägger en ny omgång av filmen, rutorna och anropen i en egen undermapp, bredvid de förra, och tar startbilden
och sista bilden, var för sig, ur den senaste förra omgången när dockans första eller sista ruta är densamma där (kostnad.json
säger vad jämförelsen fann). En ruta där kortet i handen står med kanten mot kameran tas inte: den flyttas till den
närmaste där kortets yta syns (rutorna).
Utan --steg körs alla; --steg 3-6 börjar om efter dockan, --steg 5 filmar om. SAM 3D Body körs bara om dess svar saknas i
output/<person>/15-matt-ur-bilder/ (radera det där för att läsa om bilderna). --lage säger bara vad som finns och vad
som saknas.
--prov lägger filmen, rutorna och anropen i blackjack-dealer/assets/proofs/<provmapp>/original/ i stället för
output/<person>/16-dockfilm/, så att de visas för Jakob som ett prov.
--utseende är personens utseende i ord för bildmodellen (står sedan kvar i personfilen); utan det säger anropen bara
"samma ansikte, hår och kläder som i bilderna".
"""
import argparse, json, math, os, re, shutil, subprocess, sys, time
from pathlib import Path

ROT = Path(__file__).resolve().parent              # avatar-auto-pipeline
CASINO = ROT.parent
BJ = CASINO / 'blackjack-dealer'
PY_MP = BJ / 'tools' / 'python' / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
LAS = CASINO / 'slask' / 'blackjack-dealer' / 'gpu-och-headless.lock'
PERSONDOCKOR = BJ / 'dealer3d' / 'src' / 'persondockor.ts'
STEG = {1: 'matt', 2: 'docka', 3: 'system', 4: 'rorelser', 5: 'film', 6: 'anrop', 7: 'efter'}
FPS = 30
# Kostnaderna (Runways krediter, 0,01 dollar styck), som de drogs i elfte provet och står i skillen runway (2026-11-27):
KOSTNAD = {'start': 10, 'andring': 8, 'kling4_3s_1080p': 57, 'kling4_3s_1080p_efter_rabatten': 71,
           'aleph2_per_hel_sekund': 28, 'aleph2_minst': 56}

ap = argparse.ArgumentParser(description='En ny dealer ur bilder av en person (se skriptets huvud).')
ap.add_argument('person')
ap.add_argument('--stil', choices=['kameran', 'bordet'], default=None, help='vilken dealers rörelser personen spelar (förval kameran, Danilos)')
ap.add_argument('--namn', default=None, help='dockans namn (förval förnamnet ur mappens namn)')
ap.add_argument('--utseende', default=None)
ap.add_argument('--plats', type=int, default=4, help='dagens plats för filmens giv (förval 4, mittplatsen)')
ap.add_argument('--prov', default=None)
ap.add_argument('--omgang', default=None, help='en ny omgång av filmen och anropen i en egen undermapp (till exempel v2), bredvid den förra')
ap.add_argument('--aleph', action='store_true', help='förbered också film B, Aleph 2 över dockfilmen')
ap.add_argument('--ankarklipp', action='store_true', help='given som tre klipp mellan schemats ankare, med dockans film av varje steg som referensfilm (steg 5-7)')
ap.add_argument('--rygg', choices=['spar', 'rod'], default='spar', help='med --ankarklipp: kortets rygg i dockans film och i ankarbilderna. spar: spårkortets gula, som efterarbetet byter mot vår rygg. rod: kortets riktiga röda med vit kant, som filmmodellen ritar själv; efterarbetet ritar då bara framsidan')
ap.add_argument('--efter-prov', action='store_true', help='steg 7 med referensfilmerna i klippens ställe: efterarbetet prövat utan något betalt')
ap.add_argument('--om-klipp', default=None, help='med --ankarklipp --steg 6: bara en ny tagning av de klippen (till exempel 1 eller 1,3): anropet skrivs som klipp-<nr>-t<n>.json med eget namn i liggaren, och de andra anropen rörs inte; steg 7 tar den senaste tagningen av varje klipp')
ap.add_argument('--steg', default='1-6')
ap.add_argument('--lage', action='store_true')
a = ap.parse_args()
m = re.fullmatch(r'(\d)(?:-(\d))?', a.steg)
if not m:
    sys.exit('--steg tar ett steg eller ett spann, till exempel 3 eller 3-6')
KOR = set(range(int(m.group(1)), int(m.group(2) or m.group(1)) + 1))
IN = ROT / 'input' / a.person
if not IN.is_dir():
    sys.exit(f'input/{a.person}/ finns inte: lägg personens bilder där (1-portratt, 2-helfigur, 3-halvfigur)')
PFIL = ROT / 'personer' / f'{a.person}.json'
person = json.loads(PFIL.read_text(encoding='utf-8')) if PFIL.exists() else None
NAMN = a.namn or (person or {}).get('docka', {}).get('namn') or re.split(r'[^a-z0-9]', a.person.lower())[0]
STIL = a.stil or (person or {}).get('docka', {}).get('stil') or 'kameran'
MODELL = ROT / 'assets' / 'docka' / f'standarddocka_{NAMN}.glb'
GIV = f'lyft-{NAMN}-p{a.plats}'
BAS = (BJ / 'assets' / 'proofs' / a.prov / 'original') if a.prov else (ROT / 'output' / a.person / '16-dockfilm')
if a.om_klipp and not re.fullmatch(r'\d(,\d)*', a.om_klipp):
    sys.exit('--om-klipp tar klippens nummer, till exempel 1 eller 1,3')
if a.omgang and not re.fullmatch(r'[a-z0-9-]+', a.omgang):
    sys.exit('--omgang tar små bokstäver, siffror och bindestreck, till exempel v2')
UT = BAS / a.omgang if a.omgang else BAS   # (en ny omgång skriver aldrig över en förra: den första ligger i BAS, de andra bredvid)
# Förra omgången: den senaste som finns före den här (den första i BAS, v2, v3 … i undermappar), den som start- och sista
# bilden kan tas ur.
_omg = [BAS, *(d for d in BAS.iterdir() if d.is_dir() and d != UT)] if a.omgang and BAS.is_dir() else []
_omg = [d for d in _omg if (d / 'dockans-rutor.json').exists()]
FORRA = max(_omg, key=lambda d: (d / 'dockans-rutor.json').stat().st_mtime) if _omg else BAS
OMG = f'{a.omgang}-' if a.omgang else ''       # i anropens namn: liggaren tar ett namn en enda gång, så varje omgång har egna
ARB = ROT / 'output' / a.person / '15-matt-ur-bilder'
RYGGORD = 'red' if a.rygg == 'rod' else 'yellow'   # kortryggens färg i ord för bildmodellen (steg 5; steg 6 läser omgångens val)
rel = lambda p: os.path.relpath(p, CASINO).replace('\\', '/')
fran_bj = lambda p: os.path.relpath(p, BJ).replace('\\', '/')


def kor(cmd, cwd=CASINO, fanga=False):
    print('>', ' '.join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, stdin=subprocess.DEVNULL, text=True, encoding='utf-8', errors='replace',
                       stdout=subprocess.PIPE if fanga else None, stderr=subprocess.STDOUT if fanga else None)
    if fanga:
        print(r.stdout[-4000:], flush=True)
    return r


def blender():
    for p in filter(None, [os.environ.get('BLENDER_EXE'), shutil.which('blender')]):
        if Path(p).is_file():
            return p
    base = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Blender Foundation'
    val = sorted(base.glob('Blender */blender.exe'), reverse=True)
    if val:
        return str(val[0])
    sys.exit('Hittar inte Blender: lägg den i PATH eller ange BLENDER_EXE')


def ta_last(vem):
    """Det delade låset för Blender och headless Chrome (som blackjack-dealer/tools/lab-look.ts takeLock): skapas bara om
    det inte finns, väntar högst 20 minuter, och ett lås äldre än 20 minuter är kvar efter en körning som dog."""
    rad = f'{vem} {time.strftime("%Y-%m-%dT%H:%M:%S")} pid {os.getpid()}'
    LAS.parent.mkdir(parents=True, exist_ok=True)
    slut, forsta = time.time() + 20 * 60, True
    while True:
        try:
            if LAS.exists() and time.time() - LAS.stat().st_mtime > 20 * 60:
                LAS.unlink()
            with open(LAS, 'x', encoding='utf-8') as f:
                f.write(rad + '\n')
            return rad
        except FileExistsError:
            if time.time() > slut:
                sys.exit(f'LÅST: {LAS.read_text(encoding="utf-8").strip()}')
            if forsta:
                print('väntar på låset:', LAS.read_text(encoding='utf-8').strip(), flush=True)
                forsta = False
            time.sleep(5)


def slapp_last(rad):
    try:
        if LAS.read_text(encoding='utf-8').strip() == rad:
            LAS.unlink()
    except FileNotFoundError:
        pass


# ------------------------------------------------------------------------------------------------ 1 matt

def steg_matt():
    ARB.mkdir(parents=True, exist_ok=True)
    r = kor([PY_MP, '-I', ROT / 'steg' / '15-matt-ur-bilder' / 'matt_ur_bilder.py', a.person, '--stil', STIL, '--namn', NAMN,
             '--ritning', ARB / 'matning.png'], cwd=ROT)
    if r.returncode:
        sys.exit('steg 1 (måtten) föll')
    p = json.loads(PFIL.read_text(encoding='utf-8'))
    if a.utseende:
        p['utseende'] = a.utseende
        PFIL.write_text(json.dumps(p, ensure_ascii=False, indent=1), encoding='utf-8')


# ------------------------------------------------------------------------------------------------ 2 docka

def steg_docka():
    rad = ta_last(f'ny_dealer.py {a.person} (Blender, bygg_docka.py --kon {NAMN})')
    try:
        r = kor([blender(), '-b', '--python-exit-code', '1', '--python', ROT / 'scen' / 'bygg_docka.py', '--', '--kon', NAMN], cwd=ROT)
    finally:
        slapp_last(rad)
    if r.returncode or not MODELL.exists():
        sys.exit('steg 2 (dockan) föll')


# ------------------------------------------------------------------------------------------------ 3 system

def las_persondockor():
    """Raderna i persondockor.ts, en per docka: {namn: JSON-text}."""
    if not PERSONDOCKOR.exists():
        return {}
    return dict(re.findall(r'^  ([a-z][a-z0-9]*): (\{.*\}),$', PERSONDOCKOR.read_text(encoding='utf-8'), flags=re.M))


def skriv_persondockor(rader):
    text = PERSONDOCKOR.read_text(encoding='utf-8')
    huvud = text[:text.index('export const PERSONDOCKOR')]
    kropp = ''.join(f'  {n}: {j},\n' for n, j in sorted(rader.items()))
    PERSONDOCKOR.write_text(huvud + 'export const PERSONDOCKOR: Record<string, PersonDocka> = {' + (f'\n{kropp}' if kropp else '') + '};\n', encoding='utf-8')


def steg_system():
    r = kor(['node', 'dealer3d/tools/docka-matt.ts', '--fil', rel(MODELL)], cwd=BJ, fanga=True)
    rad = next((x for x in r.stdout.splitlines() if x.startswith('DOCKAN (')), None)
    if r.returncode or not rad:
        sys.exit('steg 3: docka-matt.ts mätte inte modellen')
    literal = rad.split(' i doll.ts form: ', 1)[1]
    # (verktyget skriver dockan i doll.ts form, en JavaScript-literal: Node läser den)
    js = subprocess.run(['node', '-e', 'process.stdout.write(JSON.stringify(eval("(" + require("fs").readFileSync(0, "utf8") + ")")))'],
                        input=literal, text=True, encoding='utf-8', capture_output=True, check=True).stdout
    d = json.loads(js)
    p = json.loads(PFIL.read_text(encoding='utf-8'))
    pl = d['place']
    post = {'person': a.person, 'stil': STIL, 'model': MODELL.name, 'shouldersApart': pl['shouldersApart'], 'head': pl['head'], 'headRadius': pl['headRadius'],
            'upperArm': d['upperArm'], 'forearm': d['forearm'], 'trunk': pl['trunk'], 'neck': pl['neck'], 'hand': d['hand'],
            'about': {'all': f'{NAMN.capitalize()}: en persons docka ur sina egna bilder (avatar-auto-pipeline/personer/{a.person}.json, steg 15), byggd på '
                             f'{p["docka"]["grund"].capitalize()}s docka (scen/bygg_docka.py --kon {NAMN}: {p["docka"]["grund"].capitalize()}s mått utom '
                             f'{", ".join(p["docka"]["passa"]) or "inget"} ur mätningen) och mätt på modellen {rel(MODELL)} '
                             f'(dealer3d/tools/docka-matt.ts --fil); sitter vid livebordet som den riktiga dealern med stilen {STIL}; ansiktet vårt eget',
                      'upperArm': f'mätt på modellen: {d["upperArm"]} m', 'forearm': f'mätt på modellen: {d["forearm"]} m',
                      'hand': 'mätt på modellen: den gemensamma kroppens former (doll.ts KROPP) med modellens egna ben och toppar; lägena i hand.at är den gemensamma kroppens och gäller inte vid bordet',
                      'reach': 'armarnas summa gånger 0,972, som mannens'}}
    rader = las_persondockor()
    rader[NAMN] = json.dumps(post, ensure_ascii=False, separators=(',', ':'))
    skriv_persondockor(rader)
    print(f'skrev {NAMN} i {rel(PERSONDOCKOR)}: axlarna {pl["shouldersApart"]} m, armarna {d["upperArm"]}/{d["forearm"]} m, bålen {pl["trunk"]} m, huvudets radie {pl["headRadius"]} m')


# ------------------------------------------------------------------------------------------------ 4 rorelser

def steg_rorelser():
    r = kor(['node', 'dealer3d/tools/lyft-till-docka.ts', '--docka', NAMN], cwd=BJ)
    if r.returncode:
        sys.exit('steg 4: lyft-till-docka.ts föll')
    filer = sorted(str(f.relative_to(BJ)).replace('\\', '/') for f in (BJ / 'dealer3d' / 'data').glob(f'lyft-{NAMN}-*.json'))
    r = kor(['node', 'dealer3d/tools/lyft-kolla.ts', *filer], cwd=BJ, fanga=True)
    (ARB.parent / 'lyft-kolla.txt').write_text(r.stdout, encoding='utf-8')
    print('lyft-kolla:', 'inga spärrar' if r.returncode == 0 else 'SPÄRRAR (se ovan)', flush=True)


# ------------------------------------------------------------------------------------------------ 5 film

STILLA = 0.01   # m: två rutor där handlederna, huvudet och kortet ligger närmare än så är samma ställning


def stallning(f):
    """Det som syns av en ställning i en ruta: handlederna, pekfingrarnas toppar, huvudet och kortets mitt (meter,
    livebordets linsvärld)."""
    return [f['R']['w'], f['L']['w'], f['R']['p'][8], f['L']['p'][8], f['h'], f['card']['c']]


def skillnad(f1, f2):
    return max(sum((x - y) ** 2 for x, y in zip(p, q)) ** 0.5 for p, q in zip(stallning(f1), stallning(f2)))


def kanten_mot(kort, kamera):
    """Hur mycket av kortets yta kameran ser: framsidans normal mot riktningen till kameran (0: kortet står med kanten mot
    kameran och syns bara som ett streck; positivt framsidan, negativt ryggen)."""
    c, nn = kort['c'], kort['n']
    mot = [kamera[i] - c[i] for i in range(3)]
    return sum(nn[i] * mot[i] for i in range(3)) / math.sqrt(sum(x * x for x in mot))


KANT = 0.2    # under det står kortet med kanten mot kameran: ett streck under handen, som en bildmodell inte ser som ett kort
SYNS = 0.3    # så mycket av ytan ska synas i rutan som tas i stället


def kortets_form(kort):
    """Hur kortet står, ur dess egna tal: lutningen mot filten i grader, och i ord (plant, på högkant på en kortkant, på en
    långkant eller lutat). Långsidans lodräta del säger vilken kant det står på."""
    lutar = round(math.degrees(math.acos(min(1.0, abs(kort['n'][1])))))
    lodrat = abs(kort['l'][1])
    return lutar, ('flat' if lutar < 15 else 'standing upright on its short edge' if lutar > 60 and lodrat > 0.7 else
                   'standing on its long edge' if lutar > 70 and lodrat < 0.3 else f'tilted about {round(lutar, -1)} degrees')


def kortets_sida(kort, kamera):
    """Vilken sida av kortet kameran ser, i ord."""
    sett = kanten_mot(kort, kamera)
    return ('almost hidden: its edge is toward the camera, so only a thin line of it shows under the palm' if abs(sett) < KANT else
            'its white face toward the camera' if sett > 0 else f'its {RYGGORD} back toward the camera')


def rutorna(rorelse, antal, kamera):
    """Rutorna efter RÖRELSENS EGNA HÄNDELSER (made.times), inte jämnt i tiden (den första filmen av Kenjis giv, domarens
    Nja 2026-11-27: tre nästan likadana bilder vid skon, där dockan står still, fick Kling 4 att hitta på ett tidigt drag och
    bära kortet lodrätt högt i luften): första och sista rutan, och emellan kortet halvvägs ur skon, kortet på filten på väg
    in, bytet, vändningens början, strax innan framsidan syns, kortet plant på väg på plats, kortet liggande med fingret på,
    och pekfingret av kortet (vila: fingret vilar på kortet från ligger till vila, så en ruta däremellan är samma ställning
    som den med fingret på). En ruta där dockan står i samma ställning som i den förra valda (STILLA) tas inte; högst 8 mellanbilder
    (Kling 4). Takten rättas efteråt (standarddocka/verktyg/i-dockans-takt.ts parar varje bild med sin dockruta), så
    bilderna behöver inte ligga jämnt."""
    T, F = rorelse['made']['times'], rorelse['frames']
    n = min(antal, len(F))
    mitt = lambda x, y: (T[x] + T[y]) // 2
    handelser = [mitt('pull', 'leaves'), mitt('leaves', 'meet'), T['meet'], T['vandFran'], T['framsidan'] - 1, mitt('plan', 'ligger'),
                 T['ligger'] + 1, T['vila'] + 2]
    # Ett kort i handen som står med kanten mot kameran syns bara som ett streck (Kenjis tredje omgång: ruta 33, mitt i
    # vändningen under handen): rutan flyttas till den närmaste inom två rutor där kortets yta syns, och där flera är lika
    # nära den där mest syns; finns ingen står rutan kvar, och texten säger att kortet är dolt (kortets_lage).
    for i, k in enumerate(handelser):
        if T['leaves'] <= k < T['plan'] and abs(kanten_mot(F[k]['card'], kamera)) < KANT:
            nara = [j for j in range(k - 2, k + 3) if 0 < j < n - 1 and abs(kanten_mot(F[j]['card'], kamera)) >= SYNS]
            if nara:
                handelser[i] = min(nara, key=lambda j: (abs(j - k), -abs(kanten_mot(F[j]['card'], kamera))))
    valda = [0]
    for k in sorted(set(handelser)):
        if 0 < k < n - 1 and skillnad(F[valda[-1]], F[k]) > STILLA:
            valda.append(k)
    while len(valda) > 1 and skillnad(F[valda[-1]], F[n - 1]) <= STILLA:   # (inte samma ställning som sista rutan)
        valda.pop()
    return [*valda[:9], n - 1]


def handens_form(P):
    """En hands form ur dess 21 punkter: hur många av de fyra fingrarna som är inböjda (toppen närmare knogen än 60 % av
    fingrets längd), i ord."""
    kvoter = [math.dist(P[kn], P[kn + 3]) / sum(math.dist(P[kn + i], P[kn + i + 1]) for i in range(3)) for kn in (5, 9, 13, 17)]
    inbojda = [k for k in kvoter if k < 0.6]
    if len(inbojda) >= 3:
        # (hur hårt: en knuten näve har toppen vid knogen, under 0,4 av fingrets längd; den riktiga dealerns hand på det lagda
        # kortet är löst böjd, och "a closed fist" gav en hårt knuten näve i bilden, domaren 2026-11-27)
        return ('a closed fist, the fingers curled in' if sum(inbojda) / len(inbojda) < 0.4 else
                'loosely closed, the fingers curled under and relaxed, not clenched')
    return 'half closed' if len(inbojda) == 2 else 'open, the fingers straight'


def kortets_lage(ruta, kamera):
    """Kortet i en ruta ur dockans egna tal, i ord för bildmodellen (inga fasta meningar om kortet: rörelsen avgör): hur
    högt över filten dess lägsta och högsta hörn är, hur det lutar, vilken sida kameran ser, om det är under eller över
    handen som håller det, och var pekfingrets topp är på kortet sett i bilden. Rörelsens card: mitten c, långsidan l,
    framsidans normal n; filten är y = 0; händernas 21 punkter p (4 tummens topp, 8 pekfingrets, 0 handleden, 5 och 17
    knogarna); bildens höger är +x och bildens överkant bort från kameran (-z)."""
    B, H = 0.063, 0.088   # kortet (src/space.ts CARD)
    kort = ruta['card']
    c, l, nn = kort['c'], kort['l'], kort['n']
    dot = lambda p, q: sum(x * y for x, y in zip(p, q))
    sub = lambda p, q: [x - y for x, y in zip(p, q)]
    w = [nn[1] * l[2] - nn[2] * l[1], nn[2] * l[0] - nn[0] * l[2], nn[0] * l[1] - nn[1] * l[0]]
    hojder = [c[1] + s * H / 2 * l[1] + u * B / 2 * w[1] for s in (-1, 1) for u in (-1, 1)]
    lag, hog = max(0.0, min(hojder)), max(hojder)
    lutar, form = kortets_form(kort)
    sett = kanten_mot(kort, kamera)
    sida = kortets_sida(kort, kamera)
    # pekfingrets topp på kortet, sett i bilden: dess läge mot kortets mitt i sidled (x) och djupled (z), i andelar av
    # kortets halva utsträckning åt det hållet
    ex, ez = (abs(l[0]) * H + abs(w[0]) * B) / 2, (abs(l[2]) * H + abs(w[2]) * B) / 2

    def fingret(hand):
        """Var tummens eller pekfingrets topp vilar på kortet (den som ligger på det; tummen först: dealern håller kortet
        med tummen), och om handen är en knuten näve (fyra fingrar inböjda mot handflatan) eller öppen."""
        P = ruta[hand]['p']
        for i, vem in ((4, 'thumb tip'), (8, 'index fingertip')):
            topp = P[i]
            fx, fz = (topp[0] - c[0]) / max(ex, 1e-3), (topp[2] - c[2]) / max(ez, 1e-3)
            if abs(fx) > 1.15 or abs(fz) > 1.15 or topp[1] - c[1] > 0.012:   # (toppens punkt ligger fingrets radie från det den rör, 6-8 mm)
                continue
            upp = 'upper' if fz < -0.35 else 'lower' if fz > 0.35 else ''
            sid = 'left' if fx < -0.35 else 'right' if fx > 0.35 else ''
            kant = 'corner' if upp and sid and max(abs(fx), abs(fz)) > 0.7 else 'edge' if max(abs(fx), abs(fz)) > 0.7 else 'part'
            var = f'{upp} {sid}'.strip() or 'middle'
            return (f'his {"right" if hand == "R" else "left"} hand is {handens_form(P)}, and its {vem} rests on the {var} {kant} of the card '
                    f'as seen in the picture' + ('; no finger points' if i == 4 else ''))
        return None
    if hog < 0.004:
        pa = fingret('R') or fingret('L')
        return f'The card lies flat on the felt, {"face up" if nn[1] > 0 else "back up"}' + (f'; {pa}.' if pa else '.'), hog
    # handen som håller kortet: den vars tumme och pekfinger är närmast kortets mitt; under eller över den
    hand = min(('R', 'L'), key=lambda h: min(math.dist(ruta[h]['p'][i], c) for i in (4, 8)))
    handflata = sum(ruta[hand]['p'][i][1] for i in (0, 5, 17)) / 3
    handen = 'right' if hand == 'R' else 'left'
    under = (f'carried under his {handen} hand, below its palm' if c[1] < handflata else f'held up in his {handen} hand, above its palm')
    nedre = 'its lower edge touching the felt' if lag < 0.005 else f'its lowest corner {round(lag * 100)} cm above the felt'
    upp = [0, 1, 0] if lutar > 45 else [0, 0, -1]   # bildens upp på kortet: lodrätt för ett stående kort, bort från kameran för ett liggande

    def greppet(hand):
        """Hur handen håller ett kort som står på kant, ur var dess fingertoppar är mot kortet: tummen och fingrarna framför
        kortet (på kamerans sida) eller bakom det, och vid vilken del av kortet i bilden. None när ingen topp är vid kortet.
        (Var en topp vilar på kortet sett uppifrån, fingret, säger inget om ett kort som står: där är greppet om kanten saken.)"""
        P = ruta[hand]['p']
        vid = {i: d for i, d in ((i, sub(P[i], c)) for i in (4, 8, 12, 16, 20))
               if abs(dot(d, nn)) < 0.04 and abs(dot(d, l)) < H / 2 + 0.02 and abs(dot(d, w)) < B / 2 + 0.03}
        if not vid:
            return None
        halva = max(abs(dot(l, upp)) * H, abs(dot(w, upp)) * B) / 2 or 1
        hojd = sum(dot(d, upp) for d in vid.values()) / len(vid) / halva
        del_ = 'lower edge' if hojd < -0.7 else 'lower part' if hojd < -0.3 else 'upper edge' if hojd > 0.7 else 'upper part' if hojd > 0.3 else 'middle'
        var = lambda d: 'in front of it' if dot(d, nn) * sett > 0 else 'behind it'
        fingrar = [d for i, d in vid.items() if i != 4]
        delar = ([f'the thumb {var(vid[4])}'] if 4 in vid else []) + (
            [f'the fingertips {var([sum(d[k] for d in fingrar) / len(fingrar) for k in range(3)])}'] if fingrar else [])
        return f'his {"right" if hand == "R" else "left"} hand is {handens_form(P)}, and holds the card at its {del_}: {", ".join(delar)}'
    pa = (greppet(hand) if lutar > 45 else None) or fingret(hand)
    # båda händernas grepp: var varje hands fingrar är på kortet (dess övre eller nedre del i bilden) och om de är framför
    # det (på kamerans sida) eller bakom
    grepp = []
    for h, namn_ in (('L', 'left'), ('R', 'right')):
        nara = [q for q in (ruta[h]['p'][i] for i in (4, 8, 12, 5, 9)) if abs(dot(sub(q, c), nn)) < 0.03
                and abs(dot(sub(q, c), l)) < H / 2 + 0.01 and abs(dot(sub(q, c), w)) < B / 2 + 0.01]
        if not nara:
            continue
        hojd = sum(dot(sub(q, c), upp) for q in nara) / len(nara) / (max(abs(dot(l, upp)) * H, abs(dot(w, upp)) * B) / 2 or 1)
        framfor = sum(dot(sub(q, c), nn) for q in nara) * sett > 0
        grepp.append(f'his {namn_} hand is at its {"upper end" if hojd > 0.3 else "lower part" if hojd < -0.3 else "middle"}, '
                     f'{"in front of it" if framfor else "behind it"}')
    mellan = (f'; it is held between both hands: {" and ".join(grepp)}' if len(grepp) == 2 else '')
    return (f'The card is {under}, low over the felt, {form}, {sida}: {nedre}, its highest corner {round(hog * 100)} cm above the felt'
            + mellan + (f'; {pa}' if pa else '') + '. It is carried low, close to the felt, never lifted high in the air.'), hog


def fas(t, T, plats, sist=False, kort=None):
    """Vad dockan gör i ruta t, ur rörelsens egna tider (made.times), i ord för bildmodellen (kortets höjd och lutning står
    för sig, kortets_lage). sist: givens sista ruta, redo vid skon igen. kort: rutans kort, så att vändningen sägs ur hur
    kortet ligger och inte bara ur tiderna (vänds kortet under handen kan framsidan vara uppe före lyftets framsidan)."""
    p = f'seat {plats}'
    if kort and t < T['plan'] and t >= T['vandFran'] and kort['n'][1] > 0.7:
        return f'The right hand, low over the felt, lays the card down toward {p}, face up; the left hand rests at the shoe.'
    if sist:
        return f'Ready at the shoe again: the dealt card lies face up at {p}, the right hand has come home and rests flat on the felt, and the left hand rests at the mouth of the shoe on the next card.'
    if t < T['pull']:
        return 'Ready at the shoe: the left hand rests at the mouth of the shoe with its fingertips on the front card; the right hand rests flat on the felt in front of the body.'
    if t < T['leaves']:
        return 'The left hand draws the front card out of the mouth of the shoe under its fingertips, flat and back up, sliding it along the felt; the right hand still rests on the felt.'
    if t < T['meet'] - 2:
        return 'The left hand has drawn the card out onto the felt and brings it, back up, low toward the middle in front of him; the right hand lifts a little from the felt and comes in toward the card.'
    # (hur kortet står, var det är mot handen och var fingret ligger på det står inte här utan i kortets_lage, ur rörelsens tal)
    if t <= T['meet'] + 1:
        return 'The handover, low over the felt between the hands: the right hand takes the card from the left hand.'
    if t < T['vandFran']:
        return 'The right hand carries the card forward low over the felt; the left hand goes back toward the shoe.'
    if t < T['framsidan']:
        return f'The right hand, low over the felt, starts to turn the card over under the hand on its way to {p}; the left hand rests at the shoe.'
    if t < T['plan']:
        return f'The right hand, low over the felt, lays the card down toward {p}, face up; the left hand rests at the shoe.'
    if t < T['vila']:   # (pekfingret vilar på kortet från ligger till vila)
        return f'The card lies face up at {p} under his right hand; the left hand rests at the shoe.'
    return f'The right hand has just let go of the card lying face up at {p} and starts back home low over the felt; the left hand rests at the shoe.'


def rakna(film):
    """Rutorna i en film (räknade, inte lästa ur huvudet)."""
    return int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames',
                               '-of', 'csv=p=0', str(film)], capture_output=True, text=True, check=True).stdout.strip())


def kamerans_plats():
    """Livebordets kamera i linsvärlden (meter), ur måtten (blackjack-dealer/src/table-live.ts): för vilken sida av kortet den ser."""
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', "import {liveFrame} from './src/table-live.ts'; process.stdout.write(JSON.stringify(liveFrame().position))"],
                                     cwd=BJ, capture_output=True, text=True, check=True).stdout)


def klippets_fil(nr):
    """Den senaste tagningen av klipp nr i omgångens ut/: klipp-<nr>.mp4 är den första och klipp-<nr>-t<n>.mp4 den n:te
    (--om-klipp). Finns ingen: den förstas namn."""
    tagningar = sorted((int(m_.group(1) or 1), f) for f in (UT / 'ut').glob(f'klipp-{nr}*.mp4')
                       if (m_ := re.fullmatch(rf'klipp-{nr}(?:-t(\d+))?\.mp4', f.name)))
    return tagningar[-1][1] if tagningar else UT / 'ut' / f'klipp-{nr}.mp4'


def filma_given():
    """Givens rörelse filmad med editorn genom livebordets kamera i nyckelutseendet, flyttad till omgångens mapp; och
    kamerans plats i linsvärlden (för vilken sida av kortet den ser)."""
    rorelse = json.loads((BJ / 'dealer3d' / 'data' / f'{GIV}.json').read_text(encoding='utf-8'))
    r = kor(['node', 'standarddocka/verktyg/titta.ts', '--docka', NAMN, '--plats', a.plats, '--spela-in', 'hela',
             '--kamera', 'spel', '--utseende', 'nyckel', *(['--rygg', 'rod'] if a.rygg == 'rod' else [])], fanga=True)
    klipp = re.findall(r'(standarddocka/klipp/[^\s]+?\.mp4)', r.stdout.replace('\\', '/'))
    if r.returncode or not klipp:
        sys.exit('steg 5: editorn filmade inte')
    UT.mkdir(parents=True, exist_ok=True)
    # Omgången behåller rörelsen den är filmad efter: efterarbetet (steg 7) ritar kortet ur den, också när lyftet har
    # ändrats sedan dess (nionde vändan på händerna började medan fjärde omgångens film låg hos domaren, 2026-11-27).
    shutil.copyfile(BJ / 'dealer3d' / 'data' / f'{GIV}.json', UT / 'rorelse.json')
    dockfilm = UT / f'dockfilm-{GIV}-nyckel.mp4'
    shutil.move(CASINO / klipp[-1], dockfilm)   # (vår egen inspelning: flyttas dit den visas, ingen kopia blir kvar i klipp/)
    antal = rakna(dockfilm)
    if antal != rorelse['frameCount']:
        print(f'OBS: filmen har {antal} rutor, rörelsen {rorelse["frameCount"]}: rutorna tas ur filmen', flush=True)
    kamera = kamerans_plats()
    for f in UT.glob('docka-ruta-*.png'):   # (en omkörning av samma omgång: inga rutor från förra körningen står kvar)
        f.unlink()
    return rorelse, dockfilm, antal, kamera


def ta_ruta(dockfilm, k):
    ut = UT / f'docka-ruta-{k:02d}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(dockfilm), '-vf', f'select=eq(n\\,{k})', '-vframes', '1', str(ut)], check=True)
    return ut


def rutans_text(rorelse, t, sist, kamera):
    """Vad dockan gör i ruta t och var kortet är, i ord för bildmodellen, ur rörelsens tider och tal."""
    T = rorelse['made']['times']
    kort, hog = kortets_lage(rorelse['frames'][t], kamera)
    if t < T['leaves']:   # (kortet i skon: dess lutning är skons)
        kort = ('The front card sits in the mouth of the shoe, back up.' if t < T['pull'] else
                'The front card slides out of the mouth of the shoe under the fingertips, back up, along the felt.')
    return {'text': fas(t, T, a.plats, sist, rorelse['frames'][t]['card']), 'kortet': kort, 'kortets_hogsta_horn_m': round(hog, 4),
            'kortet_syns': round(kanten_mot(rorelse['frames'][t]['card'], kamera), 2)}


def steg_film():
    rorelse, dockfilm, antal, kamera = filma_given()
    n, T = rorelse['frameCount'], rorelse['made']['times']
    valda = rutorna(rorelse, antal, kamera)
    bilder = []
    for k in valda:
        ut = ta_ruta(dockfilm, k)
        bilder.append({'fil': ut.name, 'ruta': k, **rutans_text(rorelse, min(k, n - 1), k == valda[-1], kamera)})
    (UT / 'dockans-rutor.json').write_text(json.dumps({
        'om': f'Rutor ur {NAMN}s giv till dagens plats {a.plats} (blackjack-dealer/dealer3d/data/{GIV}.json, {n} rutor, {n / FPS:.1f} s vid {FPS} rutor/s), '
              f'genom livebordets kamera i editorns nyckelutseende (grön bakgrund, grönt bord utan tryck, gul kortrygg; kortets framsida vit), '
              f'1728 x 972, ur dockfilmen {dockfilm.name} (avatar-auto-pipeline/ny_dealer.py steg 5). Rutorna efter rörelsens egna händelser (made.times), '
              f'aldrig två där dockan står i samma ställning: {", ".join(map(str, valda))}. Texten säger vad dockan gör, ur händelserna, och var kortet är, ur '
              f'dockans egna tal (rörelsens card: höjden över filten, lutningen och sidan mot kameran).',
        'giv': GIV, 'rutor': antal, 'fps': FPS, 'tider': T, 'kortrygg': {'nyckel': 'gul', 'vanlig': 'röd'}, 'bilder': bilder}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'dockfilmen {rel(dockfilm)} ({antal} rutor), rutorna {valda}', flush=True)


# ------------------------------------------------------------------------------------------------ 6 anrop

JAMFORT = {}   # dockans första och sista ruta mot förra omgångens: vad jämförelsen fann


def samma_ruta(b, i):
    """Dockans ruta b i den här omgången mot samma ruta i förra omgången (i: 0 den första, -1 den sista), bild mot bild:
    bildpunkterna som skiljer mer än 24 av 255 i någon färg, och var. Samma inom någon bildpunkt när färre än 0,05 % av
    bilden skiljer (en kant som flyttats en bildpunkt ger några hundra)."""
    import numpy as np
    import cv2
    vad = 'första rutan' if i == 0 else 'sista rutan'
    fore_fil = FORRA / 'dockans-rutor.json'
    if not fore_fil.exists():
        JAMFORT[vad] = 'ingen förra omgång'
        return False
    fore = json.loads(fore_fil.read_text(encoding='utf-8'))['bilder'][i]
    return samma_bild(UT / b['fil'], FORRA / fore['fil'], vad, f'ruta {b["ruta"]} mot förra omgångens ruta {fore["ruta"]}')


def samma_bild(ny, gammal, vad, om):
    """Två av dockans rutor bild mot bild (samma_ruta), och vad jämförelsen fann i JAMFORT[vad]."""
    import numpy as np
    import cv2
    x, y = cv2.imread(str(ny)), cv2.imread(str(gammal))
    if x is None or y is None or x.shape != y.shape:
        JAMFORT[vad] = 'går inte att jämföra (saknas eller olika stora)'
        return False
    skiljer = np.abs(x.astype(np.int16) - y.astype(np.int16)).max(axis=2) > 24
    antal = int(skiljer.sum())
    if antal:
        yy, xx = np.nonzero(skiljer)
        dar = f'inom x {xx.min()}–{xx.max()}, y {yy.min()}–{yy.max()}'
    samma = antal < 0.0005 * skiljer.size
    JAMFORT[vad] = (f'{om}: {antal} bildpunkter av {skiljer.size} skiljer' + (f' ({dar})' if antal else '')
                    + (': samma, bilden ur förra omgången används' if samma else ': inte samma, en ny bild behövs'))
    return samma


def steg_anrop():
    p = json.loads(PFIL.read_text(encoding='utf-8'))
    rutor = json.loads((UT / 'dockans-rutor.json').read_text(encoding='utf-8'))
    T, n, bilder = rutor['tider'], rutor['rutor'], rutor['bilder']
    utseende = p.get('utseende') or 'the same face, age, hair and clothes as in those images'
    A = UT / 'anrop'
    A.mkdir(parents=True, exist_ok=True)
    ut = lambda namn: f'$file:{fran_bj(UT / "ut" / namn)}'
    fil = lambda b: f'$file:{fran_bj(UT / b["fil"])}'
    in_ = lambda namn: f'$file:{fran_bj(next(IN.glob(f"*{namn}*")))}'
    vad = (f'En ny dealer ur bilder: {NAMN.capitalize()} (input/{p["person"]}), hans docka byggd på {p["docka"]["grund"].capitalize()}s '
           f'(avatar-auto-pipeline/ny_dealer.py), gör given till dagens plats {a.plats} ({GIV}) vid livebordet i nyckelfärgerna.')
    # Från och med att kortet ligger plant (plan) görs bilden som en ändring av SISTA bilden, så att kortet är samma
    # bildpunkter i varje bild efter landningen (första filmen av Kenjis giv: kortet sköts 18 bildpunkter och vreds 3,5
    # grader efter landningen, där bilderna hade det på lite olika ställen); före det som en ändring av startbilden.
    kort_ligger = lambda b: b['ruta'] >= T['plan']
    forsta, sista, mellan = bilder[0], bilder[-1], bilder[1:-1]
    # En ny omgång (--omgang) tar start- och sista bilden ur den förra om dockans första och sista ruta är desamma inom
    # någon bildpunkt: då är de redan gjorda och betalda.
    # Var för sig: är bara sista rutan ny (kortet har landat på ett nytt ställe) görs bara sista bilden om, som en ändring av
    # förra omgångens startbild.
    finns = lambda *f: all((FORRA / 'ut' / x).exists() for x in f)
    ater_start = bool(a.omgang) and samma_ruta(forsta, 0) and finns('start.png', 'k-start.png')
    ater_sista = bool(a.omgang) and samma_ruta(sista, -1) and finns('sista.png', 'k-sista.png')
    bas = {'start': FORRA / 'ut' if ater_start else UT / 'ut', 'sista': FORRA / 'ut' if ater_sista else UT / 'ut'}
    ut_bas = lambda namn: f'$file:{fran_bj(bas["sista" if "sista" in namn else "start"] / namn)}'
    gemensamt = ('Everything else stays exactly as in the first image: his face, hair and shirt, the dark red chair back, the clear card shoe at the same '
                 'place, size and angle with the yellow deck in it, the small clear plate in front of the shoe, the flat green background and the plain '
                 'green table with no print and no texture; only soft natural shadows of his arms and hands on the table. The same framing and camera; a photograph.')
    anrop = {}
    anrop['start'] = {'name': f'{NAMN}-ny-dealer-{OMG}start', 'what': f'{vad} Startbilden: dockans första ruta omgjord till personen (GPT Image 2.6 Sunburst, rutan och hans tre bilder). {forsta["text"]}',
                      'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['start'],
                      'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                               'promptText': ('The first image is a 3D render of a white, bald mannequin sitting as a blackjack dealer behind a half-round table, seen from the '
                                              'players\' side, from the front and from well above, so that he sits in the upper half of the picture and the table fills the '
                                              'lower half. Everything around him is plain green for chroma keying: a flat green background and a smooth green table with a '
                                              f'padded green rail. Replace the mannequin with the real man shown in the second, third and fourth images: {utseende}, a calm, '
                                              'neutral expression. Keep everything else exactly as in the first image: the same camera, framing and perspective, his head at the '
                                              'same height and the same size in the picture, and the same body pose. His head is bowed toward the table exactly as the '
                                              'mannequin\'s, and his eyes look down at the table in front of him, not at the camera. '
                                              f'{forsta["text"]} Both elbows are bent as the mannequin\'s, and every finger is in the same position as the mannequin\'s. The '
                                              'table stays exactly as it is, at the same pixels: plain, even green with no print, no lines and no texture, and the background '
                                              'stays the same flat, even green. The clear plastic card shoe at the right of the picture stays exactly as it is, the same place, '
                                              'size and angle, holding the yellow deck, with the front card showing its yellow back in the mouth of the shoe, and the small clear '
                                              'plate lies on the felt in front of the shoe as in the first image. The dark red chair back behind him stays. A photorealistic '
                                              'photograph of the man: natural skin, natural hands with five fingers, no ring, no watch, soft even light from above, and only soft '
                                              'natural shadows of his arms and hands on the green table. Do not add, remove or move any object, and no card lies on the felt.'),
                               'referenceImages': [{'uri': fil(forsta), 'tag': 'scene'}, {'uri': in_('portratt'), 'tag': 'face'},
                                                   {'uri': in_('halvfigur'), 'tag': 'half'}, {'uri': in_('helfigur'), 'tag': 'full'}]}}
    anrop['sista'] = {'name': f'{NAMN}-ny-dealer-{OMG}sista', 'what': f'{vad} Sista bilden: startbilden med kortet liggande på plats {a.plats}, framsidan upp, där dockans kort ligger i givens sista ruta ({sista["ruta"]}).',
                      'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'],
                      'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                               'promptText': ('Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well above. '
                                              'His left hand (on the right of the picture) is at the mouth of a clear card shoe with its fingertips on the front card, and his '
                                              'right hand (on the left of the picture) rests flat on the table in front of him. No card lies on the table. Add one playing card '
                                              'lying flat on the table, face up, exactly where the card lies in the second image: the same place, size and angle in the picture. '
                                              'The card has a plain white face with a thin cyan border and a small magenta mark in one corner. The second image is a white 3D '
                                              'mannequin at the same table, seen from exactly the same camera; take only the card\'s place, size, angle and look from it. Change '
                                              'nothing else: his pose, his head, his face, hair and shirt, both hands, the clear card shoe with the yellow deck and the front card '
                                              'showing its yellow back, the small clear plate, the dark red chair back, the flat green background and the plain green table all stay '
                                              'exactly as in the first image, at the same pixels. No other card appears, and there is only a thin soft shadow under the card\'s edge. '
                                              'The same framing and camera; a photograph.'),
                               'referenceImages': [{'uri': ut_bas('start.png'), 'tag': 'edit'}, {'uri': fil(sista), 'tag': 'pose'}]}}
    if ater_start:   # (gjorda i förra omgången: inga nya anrop)
        del anrop['start']
    if ater_sista:
        del anrop['sista']
    for b in mellan:
        grund = 'sista.png' if kort_ligger(b) else 'start.png'
        lage = ('His left hand (on the right of the picture) is at the mouth of a clear card shoe with its fingertips on the front card, and his right hand (on the '
                'left of the picture) rests flat on the table in front of him. ' + (f'One card lies face up at seat {a.plats}.' if kort_ligger(b) else 'No card lies on the table.'))
        if kort_ligger(b):
            kortet = (f' The card lying face up at seat {a.plats} stays exactly as it is in the first image, at the same pixels, the same place, size and angle: '
                      f'it does not move, slide or turn; only his hand moves. {b["kortet"]}')
        elif b['ruta'] < T['leaves']:
            kortet = ''
        else:
            kortet = (f' The card in his hands is at the place, size and angle of the mannequin\'s card. {b["kortet"]} Its back is solid yellow with a thin cyan '
                      'border and a small magenta mark, and its face is plain white with a thin cyan border and a small magenta mark.')
        anrop[f'mellan-{b["ruta"]:02d}'] = {
            'name': f'{NAMN}-ny-dealer-{OMG}mellan-{b["ruta"]:02d}', 'what': f'{vad} Mellanbild, dockans ruta {b["ruta"]} av {n}: {b["text"]}',
            'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'],
            'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                     'promptText': (f'Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well above. {lage} '
                                    'The second image is a white 3D mannequin at the same table, seen from exactly the same camera at this very moment; it only shows the '
                                    'pose. Move only his arms, hands and head so that they match the mannequin\'s: the same arm, hand and finger positions and the same bow '
                                    f'of the head, at the same places in the picture. {b["text"]}{kortet} Take nothing else from the second image: not its white skin, its '
                                    f'bald head or its face. {gemensamt}'),
                     'referenceImages': [{'uri': ut_bas(grund), 'tag': 'edit'}, {'uri': fil(b), 'tag': 'pose'}]}}
    sek = n / FPS
    anrop['film-a-kling4'] = {
        'name': f'{NAMN}-ny-dealer-{OMG}a-kling4', 'what': f'{vad} Film A: Kling 4, 1080p, 3 s: första bild, {len(mellan)} mellanbilder (dockans ruta {", ".join(str(b["ruta"]) for b in mellan)} av {n}, valda efter rörelsens händelser) och sista bild. Ingen referensfilm.',
        'endpoint': '/v1/image_to_video', 'expectCredits': KOSTNAD['kling4_3s_1080p'],
        'body': {'model': 'kling_4', 'promptImage': [{'uri': ut_bas('k-start.png'), 'position': 'first'}, *[{'uri': ut(f'k-{b["ruta"]:02d}.png'), 'position': 'middle'} for b in mellan],
                                                      {'uri': ut_bas('k-sista.png'), 'position': 'last'}],
                 'promptText': (f'Locked camera, one continuous shot. The man in the first frame deals one card from the shoe to seat {a.plats}, where the last frame shows it '
                                'lying. The middle frames show the movement on the way, in order: his hands pass through each of them in one continuous motion, without '
                                'stopping. He moves like a practised dealer, with soft, relaxed arms and hands. His left hand at the mouth of the shoe draws the front card '
                                'out flat under its fingertips, back up, and slides it across the felt to a point in front of him, where it stands the card up on its long '
                                'edge. His right hand comes in and takes the card, and his left hand lets go and returns to rest at the mouth of the shoe. His right hand '
                                'carries the card forward low over the felt, under the hand, never lifting it high in the air, and lays it down onto its place, face up, '
                                'under the hand. From the moment it lands the card lies completely still at exactly that place and angle, as the last frame shows it; it '
                                'is not pushed or turned. Then the hand lets go, and his right hand glides back '
                                'low over the felt and rests flat in front of him, as in the first frame. The card keeps its size all the way; its back is solid yellow with a '
                                'thin cyan border, and its face is white with a thin cyan border and a small magenta mark in one corner, as the last frame shows it. A yellow '
                                'card shows in the mouth of the shoe all the time. The background and the table are plain, even green. His head stays bowed toward the table '
                                'and his eyes follow the card; he does not look up at the camera. No text, no music, no speech.'),
                 'duration': 3, 'ratio': 'auto_1080p'},
        'efter': 'k-*.png är bilderna i ut/ skalade till 1728 x 972 (som elfte provet); filmen sträcks till dockans längd med setpts efteråt'}
    aleph = max(KOSTNAD['aleph2_minst'], KOSTNAD['aleph2_per_hel_sekund'] * int(sek)) if a.aleph else 0
    # Film B bara med --aleph: i den första filmen av Kenjis giv försvann kortet när det stod på kant mot kameran i bytet,
    # och ansiktet blev yngre mot slutet (domaren 2026-11-27: Inte bra)
    if a.aleph: anrop['film-b-aleph2'] = {
        'name': f'{NAMN}-ny-dealer-{OMG}b-aleph2', 'what': f'{vad} Film B: Aleph 2 över dockfilmen i nyckelutseendet ({n} rutor, {sek:.1f} s), med startbilden som styrbild vid sekund 0 (receptet från tionde provet).',
        'endpoint': '/v1/video_to_video', 'expectCredits': aleph,
        'body': {'model': 'aleph2', 'videoUri': f'$file:{fran_bj(next(UT.glob("dockfilm-*-nyckel.mp4")))}',
                 'promptText': ('Turn the white mannequin into the real man in the reference picture, with the same face, hair and shirt all through the film. Keep the '
                                'mannequin\'s movement exactly, frame by frame: the hands, the fingers, the head and the card. The background and the table stay plain, even '
                                'green with no print; the card shoe, the yellow deck and the clear plate stay as they are. The card\'s back is solid yellow with a thin cyan '
                                'border, its face plain white with a thin cyan border and a small magenta mark; it is not a printed playing card. Natural skin and natural '
                                'hands with five fingers; a photograph.'),
                 'keyframes': [{'uri': ut_bas('start.png'), 'seconds': 0}]},
        'kostnad': f'28 krediter per hel sekund av infilmen ({sek:.2f} s), minst 56; ordermodellen räknar uppåt ({max(56, 28 * -(-int(sek * 100) // 100))})'}
    for f in A.glob('*.json'):   # (en omkörning: inget anrop från förra körningen av samma omgång står kvar)
        f.unlink()
    for namn, kropp in anrop.items():
        (A / f'{namn}.json').write_text(json.dumps(kropp, ensure_ascii=False, indent=2), encoding='utf-8')
    bildkostnad = (0 if ater_start else KOSTNAD['start']) + (0 if ater_sista else KOSTNAD['andring']) + KOSTNAD['andring'] * len(mellan)
    summa = {'stillbilder': bildkostnad, 'A_kling4': KOSTNAD['kling4_3s_1080p'], 'A_alla': bildkostnad + KOSTNAD['kling4_3s_1080p'],
             **({'B_aleph2': aleph, 'B_alla': (0 if ater_start else KOSTNAD['start']) + aleph, 'bada': bildkostnad + KOSTNAD['kling4_3s_1080p'] + aleph} if a.aleph else {})}
    jamfort = {k: v for k, v in JAMFORT.items()}
    tagna = [n for n, j in (('start', ater_start), ('sista', ater_sista)) if j]
    (A / 'kostnad.json').write_text(json.dumps({'krediter': summa, 'om': (f'Runways krediter (0,01 dollar styck). Stillbilderna: '
                                               + (f'{" och ".join(tagna)} ur förra omgången ({rel(FORRA / "ut")}: dockans ruta är densamma), ' if tagna else '')
                                               + ('' if ater_start else f'start {KOSTNAD["start"]}, ') + ('' if ater_sista else f'sista {KOSTNAD["andring"]}, ')
                                               + f'{len(mellan)} mellanbilder {KOSTNAD["andring"]} styck. Kling 4 3 s 1080p {KOSTNAD["kling4_3s_1080p"]} (rabatt till 2026-11-30, sedan '
                                               f'{KOSTNAD["kling4_3s_1080p_efter_rabatten"]}).' + (f' Aleph 2 {aleph}; B behöver bara startbilden.' if a.aleph else '')),
                                               'forra_omgangen': ({'mapp': rel(FORRA), **jamfort} if jamfort else None),
                                               'ordning': [*([] if ater_start else ['start']), *([] if ater_sista else ['sista']), *[f'mellan-{b["ruta"]:02d}' for b in mellan],
                                                           'film-a-kling4', *(['film-b-aleph2'] if a.aleph else [])],
                                               'lagg': f'node tools/runway-api.ts place <anrop.json> från blackjack-dealer/ (inom fullmakten i data/order-policy.json), i ordningen ovan: '
                                                       f'varje bild sparas i {rel(UT / "ut")}/ med det namn nästa anrop väntar sig (start.png, sista.png, mellan-NN.png), och för film A '
                                                       f'skalade till 1728 x 972 som k-NN.png, k-start.png och k-sista.png'
                                                       + (f' ({", ".join(f"{n}.png och k-{n}.png" for n in tagna)} finns redan i {rel(FORRA / "ut")}/)' if tagna else '') + ' (som elfte provet)'},
                                              ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'anropen i {rel(A)}: stillbilderna {bildkostnad}, A Kling 4 {KOSTNAD["kling4_3s_1080p"]}, A med bilderna {summa["A_alla"]} krediter'
          + (f'; B Aleph 2 {aleph}, båda {summa["bada"]}' if a.aleph else '') + (f'; {" och ".join(tagna)} ur förra omgången' if tagna else ''), flush=True)
    for vad, j in JAMFORT.items():
        print(f'  {vad}: {j}', flush=True)


# ------------------------------------------------------------------------------------------------ 5-7 ankarklipp

# Given som tre klipp mellan rörelseschemats ankare (standarddocka/rorelsekatalog.json), --ankarklipp. Jakob dömde Kenjis
# filmer Inte bra 2026-11-27 ("Tempot är konstigt", "Fingrarna når inte kortet"): händerna var filmmodellens egen rörelse
# mellan stillbilderna och takten trycktes in efteråt. Här är varje klipp Kling 4 med två ankarbilder som första och sista
# bild och dockans film av samma steg som referensfilm, så att takten och rörelsen kommer ur dockan redan när filmen görs,
# och ansiktet och händerna ur bilderna; klippen går ihop i ankarbilderna. Ankarbilderna görs en gång per person och kamera.
REF_MINST = 3.0   # s: Kling 4 tar en referensfilm på 3–31 s, 24–60 bilder/s, minst 700 bildpunkter per sida (assets/inputs.md 2026-11-27)
KLIPP_S = 3       # s: klippets längd, lika med referensfilmens, så att klippet följer den i tiden


def kling_med_ref(s_ut, s_in, rabatt=True):
    """Kling 4 i 1080p med en referensfilm (guides/pricing.md 2026-11-27): listpriset 14,1 krediter per sekund ut plus 14,1
    per sekund av det längre av infilm och utfilm, avrundat uppåt; till och med 2026-11-30 UTC 20 % av, avrundat uppåt igen."""
    lista = math.ceil(14.1 * s_ut + 14.1 * max(s_in, s_ut) - 1e-9)
    return math.ceil(lista * 0.8 - 1e-9) if rabatt else lista


def ankarna(rorelse):
    """Schemats fyra ankare i givens rutor: A2.3 (redo vid skon, första rutan), A2M (handbytet, made.times.meet), A3PnC1
    (kortet har landat och handen ligger kvar, made.times.ligger: där givens fil delas i given och handen hem,
    rorelsekatalog.json GIV-KORT-1) och A2.3 med kortet (sista rutan). Bilden varje ankare görs till heter `ut`."""
    T, n = rorelse['made']['times'], rorelse['frameCount']
    a3 = f'A3P{a.plats}C1'
    return [{'ankare': 'A2.3', 'ruta': 0, 'ut': 'start.png'}, {'ankare': 'A2M', 'ruta': T['meet'], 'ut': 'a2m.png'},
            {'ankare': a3, 'ruta': T['ligger'], 'ut': f'{a3.lower()}.png'}, {'ankare': 'A2.3 med kortet', 'ruta': n - 1, 'ut': 'sista.png'}]


# Vad varje klipp gör, i ord för filmmodellen. {bytet}: hur kortet står i handbytet, ur rörelsens tal (kortets_form och
# kortets_sida i ankarrutan A2M), så att texten säger samma sak som ankarbilden och referensfilmen.
STEGEN = (('skon-till-bytet', 0, 1, 'From the ready position at the shoe to the handover: his left hand draws the front card out of the shoe, back up, '
                                     'slides it flat over the felt toward the middle in front of him and {bytet}, '
                                     'while his right hand waits on the felt and then comes in to the card.'),
          ('bytet-till-platsen', 1, 2, 'From the handover to the card lying at its place: his right hand takes the card, carries it low and hidden under the '
                                        'closed hand, turns it over under the hand and lays it down face up at its place, holding it with the thumb; his left '
                                        'hand goes back to the shoe.'),
          ('handen-hem', 2, 3, 'From the card lying at its place to the ready position at the shoe: his right hand lets go of the card and goes back low over '
                               'the felt to rest in front of him, and the card stays exactly where it lies.'))


def steg_film_ankare():
    rorelse, dockfilm, antal, kamera = filma_given()
    n, T = rorelse['frameCount'], rorelse['made']['times']
    ank = ankarna(rorelse)
    bilder = []
    for b in ank:
        ut = ta_ruta(dockfilm, b['ruta'])
        bilder.append({**b, 'fil': ut.name, **rutans_text(rorelse, b['ruta'], b['ruta'] == n - 1, kamera)})
        if abs(bilder[-1]['kortet_syns']) < KANT and T['leaves'] <= b['ruta'] < T['plan']:
            bilder[-1]['varning'] = 'kortet står med kanten mot kameran: en bildmodell ser det knappt'
    for f in UT.glob('ref-*.mp4'):
        f.unlink()
    N = max(1, math.ceil(REF_MINST * FPS - 1e-9))   # referensfilmens rutor (3 s)
    byteskort = rorelse['frames'][T['meet']]['card']
    lutar, form = kortets_form(byteskort)
    bytet = 'keeps it flat on the felt' if lutar < 15 else f'raises it there until it is {form}, {kortets_sida(byteskort, kamera)}'
    steg = []
    for nr, (namn, i, j, gor) in enumerate(STEGEN, 1):
        r0, r1 = ank[i]['ruta'], ank[j]['ruta']
        L = r1 - r0 + 1
        tot = max(N, L)
        fore = (tot - L) // 2
        efter = tot - L - fore
        ref = UT / f'ref-{nr}-{namn}.mp4'
        # steget ur dockfilmen, och stillhet i ankarna före och efter (första och sista rutan upprepad) till 3 s
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(dockfilm), '-vf',
                        f'trim=start_frame={r0}:end_frame={r1 + 1},setpts=PTS-STARTPTS,'
                        f'tpad=start_mode=clone:start_duration={fore / FPS:.6f}:stop_mode=clone:stop_duration={efter / FPS:.6f}',
                        '-r', str(FPS), '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', '-an', str(ref)], check=True)
        fick = rakna(ref)
        if fick != tot:
            sys.exit(f'{ref.name}: {fick} rutor, väntade {tot}')
        steg.append({'nr': nr, 'namn': namn, 'fran': ank[i]['ankare'], 'till': ank[j]['ankare'], 'dockrutor': [r0, r1], 'rutor_i_steget': L,
                     'ref': ref.name, 'ref_rutor': tot, 'ref_s': round(tot / FPS, 3), 'stilla_fore': fore, 'stilla_efter': efter,
                     'gor': gor.format(bytet=bytet)})
    (UT / 'dockans-rutor.json').write_text(json.dumps({
        'lage': 'ankarklipp',
        'om': f'{NAMN}s giv till dagens plats {a.plats} (blackjack-dealer/dealer3d/data/{GIV}.json, {n} rutor vid {FPS} rutor/s) som tre klipp mellan '
              f'rörelseschemats ankare, genom livebordets kamera i editorns nyckelutseende, ur dockfilmen {dockfilm.name} (avatar-auto-pipeline/ny_dealer.py '
              f'--ankarklipp). bilder: ankarrutorna, med texten om vad dockan gör och var kortet är ur rörelsens egna tal; steg: varje klipps '
              f'referensfilm, dockrutorna i steget och hur många stilla rutor som ligger före och efter (stillheten klipps bort efteråt).',
        'giv': GIV, 'rutor': antal, 'fps': FPS, 'tider': T, 'rygg': a.rygg, 'kortrygg': {'nyckel': 'röd' if a.rygg == 'rod' else 'gul', 'vanlig': 'röd'}, 'bilder': bilder, 'steg': steg},
        ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'dockfilmen {rel(dockfilm)} ({antal} rutor); ankarna {", ".join(f"{b["ankare"]} ruta {b["ruta"]}" for b in ank)}; referensfilmerna '
          + ', '.join(f'{s["ref"]} (steget {s["rutor_i_steget"]} rutor, stilla {s["stilla_fore"]}+{s["stilla_efter"]})' for s in steg), flush=True)
    for b in bilder:
        if b.get('varning'):
            print(f'  OBS {b["ankare"]}: {b["varning"]}', flush=True)


def k_namn(namn):
    """Bildens namn skalad till 1728 x 972 för Kling (som elfte provet): k-start.png, k-sista.png, k-NN.png för mellan-NN.png."""
    m_ = re.fullmatch(r'mellan-(\d+)\.png', namn)
    return f'k-{m_.group(1)}.png' if m_ else f'k-{namn}'


def tidigare_bild(b):
    """Bilden för ankarrutan b ur en tidigare omgång (den senaste först) där dockans ruta är densamma och bilden är gjord,
    eller None. JAMFORT säger vad jämförelsen fann."""
    if not a.omgang or not BAS.is_dir():
        return None
    omg = sorted((d for d in [BAS, *BAS.iterdir()] if d.is_dir() and d != UT and (d / 'dockans-rutor.json').exists()),
                 key=lambda d: (d / 'dockans-rutor.json').stat().st_mtime, reverse=True)
    for d in omg:
        fore = json.loads((d / 'dockans-rutor.json').read_text(encoding='utf-8'))['bilder']
        for i, f in enumerate(fore):
            namn = f.get('ut') or ('start.png' if i == 0 else 'sista.png' if i == len(fore) - 1 else f'mellan-{f["ruta"]:02d}.png')
            if f['ruta'] != b['ruta'] or not ((d / 'ut' / namn).exists() and (d / 'ut' / k_namn(namn)).exists()):
                continue
            if samma_bild(UT / b['fil'], d / f['fil'], b['ankare'], f'ruta {b["ruta"]} mot omgången {rel(d)}, ruta {f["ruta"]}'):
                return d / 'ut' / namn
            return None   # (den senaste gjorda bilden av rutan är en annan ställning: en ny bild)
    JAMFORT[b['ankare']] = f'ingen tidigare omgång har en gjord bild av ruta {b["ruta"]}'
    return None


def steg_anrop_ankare():
    p = json.loads(PFIL.read_text(encoding='utf-8'))
    R = json.loads((UT / 'dockans-rutor.json').read_text(encoding='utf-8'))
    if R.get('lage') != 'ankarklipp':
        sys.exit('steg 6 --ankarklipp: omgångens rutor är inte gjorda med --ankarklipp (kör --steg 5 --ankarklipp först)')
    n, ank, steg = R['rutor'], R['bilder'], R['steg']
    rod = R.get('rygg') == 'rod'            # (omgångens val när den filmades, inte kommandots nu)
    ryggord = 'red' if rod else 'yellow'
    utseende = p.get('utseende') or 'the same face, age, hair and clothes as in those images'
    A = UT / 'anrop'
    A.mkdir(parents=True, exist_ok=True)
    fj = lambda f: f'$file:{fran_bj(f)}'
    in_ = lambda namn: fj(next(IN.glob(f'*{namn}*')))
    JAMFORT.clear()
    gjord = {b['ankare']: tidigare_bild(b) for b in ank}   # en bild ur förra omgången, eller None: görs nu
    bild = lambda b: gjord[b['ankare']] or UT / 'ut' / b['ut']
    kbild = lambda b: bild(b).with_name(k_namn(bild(b).name))
    a23, a2m, a3, a23k = ank
    vad = (f'En ny dealer ur bilder: {NAMN.capitalize()} (input/{p["person"]}), hans docka byggd på {p["docka"]["grund"].capitalize()}s '
           f'(avatar-auto-pipeline/ny_dealer.py --ankarklipp), gör given till dagens plats {a.plats} ({GIV}) vid livebordet i nyckelfärgerna, som tre klipp mellan ankarbilder.')
    rest = ('Everything else stays exactly as in the first image: his face, hair and shirt, the dark red chair back, the clear card shoe at the same place, '
            f'size and angle with the {ryggord} deck in it, the small clear plate in front of the shoe, the flat green background and the plain green table '
            'with no print and no texture; only soft natural shadows of his arms and hands on the table. The same framing and camera; a photograph.')
    # Kortets utseende i ord, bara för de sidor kameran ser i bilden eller klippet (ur omgångens rörelse). Kenjis femte
    # omgång 2026-11-27: första klippets text beskrev också framsidan (vit, turkos ram, rosa märke), som aldrig syns där,
    # och Kling 4 ritade den som ett stort vitt kort liggande på filten genom hela klippet (rörelsens likhet 0,73 mot 0,97).
    rorelse = json.loads(((UT / 'rorelse.json') if (UT / 'rorelse.json').exists() else BJ / 'dealer3d' / 'data' / f'{GIV}.json').read_text(encoding='utf-8'))
    kamera = kamerans_plats()
    ryggen = ('Its back is plain deep red with a white border all around, like the back of a real playing card but with no pattern' if rod else
              'Its back is solid yellow with a thin cyan border and a small magenta mark')
    framsidan = 'ts face is plain white with a thin cyan border and a small magenta mark in one corner'

    def kortets_utseende(r0, r1):
        """Kortets utseende för dockrutorna r0–r1: de sidor kameran ser där (kortet på kant räknas inte)."""
        sett = [kanten_mot(rorelse['frames'][k]['card'], kamera) for k in range(r0, r1 + 1)]
        rygg, fram = any(v <= -KANT for v in sett), any(v >= KANT for v in sett)
        if rygg and not fram:
            return f'{ryggen}. Only the back of the card is ever seen here; its face is never shown.'
        if fram and not rygg:
            return f'I{framsidan}. Only the face of the card is ever seen here; its back is never shown.'
        return f'{ryggen}, and i{framsidan}.'
    ett_kort = 'The card he deals is the only card outside the shoe: no other card, sheet or object ever appears on the table.'
    anrop = {}
    if not gjord[a23['ankare']]:
        anrop['a23'] = {'name': f'{NAMN}-ny-dealer-{OMG}a23', 'what': f'{vad} Ankarbilden A2.3 (redo vid skon): dockans ruta {a23["ruta"]} omgjord till personen ur hans tre bilder.',
                        'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['start'], 'ut': rel(bild(a23)),
                        'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                                 'promptText': ('The first image is a 3D render of a white, bald mannequin sitting as a blackjack dealer behind a half-round table, seen '
                                                'from the players\' side, from the front and from well above, so that he sits in the upper half of the picture and the '
                                                'table fills the lower half. Everything around him is plain green for chroma keying: a flat green background and a smooth '
                                                f'green table with a padded green rail. Replace the mannequin with the real man shown in the second, third and fourth images: '
                                                f'{utseende}, a calm, neutral expression. Keep everything else exactly as in the first image: the same camera, framing and '
                                                'perspective, his head at the same height and the same size in the picture, and the same body pose, his head bowed toward '
                                                f'the table exactly as the mannequin\'s and his eyes on the card at the mouth of the shoe, not on the camera. {a23["text"]} {a23["kortet"]} Both '
                                                'elbows are bent as the mannequin\'s, and every finger is in the same position as the mannequin\'s. The table stays plain, '
                                                'even green with no print, and the background the same flat green. The clear plastic card shoe stays exactly as it is, with '
                                                f'the {ryggord} deck and the front card showing its {ryggord} back in its mouth, and the small clear plate on the felt in front of '
                                                'it. The dark red chair back behind him stays. A photorealistic photograph of the man: natural skin, natural hands with five '
                                                'fingers, no ring, no watch, soft even light from above. Do not add, remove or move any object, and no card lies on the felt.'),
                                 'referenceImages': [{'uri': fj(UT / a23['fil']), 'tag': 'scene'}, {'uri': in_('portratt'), 'tag': 'face'},
                                                     {'uri': in_('halvfigur'), 'tag': 'half'}, {'uri': in_('helfigur'), 'tag': 'full'}]}}
    # A2.3 med kortet: A2.3 med kortet inlagt där dockans kort ligger (kortplatsen syns då i bilden som ändras härnäst)
    if not gjord[a23k['ankare']]:
        anrop['a23-kort'] = {'name': f'{NAMN}-ny-dealer-{OMG}a23-kort', 'what': f'{vad} Ankarbilden A2.3 med kortet: A2.3 med kortet liggande på plats {a.plats}, framsidan upp, där dockans kort ligger i givens sista ruta ({a23k["ruta"]}).',
                             'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'], 'ut': rel(bild(a23k)),
                             'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                                      'promptText': ('Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well '
                                                     'above, ready at the card shoe. No card lies on the table. Add one playing card lying flat on the table, face up, exactly '
                                                     'where the card lies in the second image: the same place, size and angle in the picture. The card has a plain white face '
                                                     'with a thin cyan border and a small magenta mark in one corner. The second image is a white 3D mannequin at the same '
                                                     'table, seen from exactly the same camera; take only the card\'s place, size, angle and look from it. Change nothing else: '
                                                     'everything stays exactly as in the first image, at the same pixels. No other card appears, and there is only a thin soft '
                                                     'shadow under the card\'s edge. The same framing and camera; a photograph.'),
                                      'referenceImages': [{'uri': fj(bild(a23)), 'tag': 'edit'}, {'uri': fj(UT / a23k['fil']), 'tag': 'pose'}]}}
    # A3PnC1: en ändring av A2.3 med kortet, så att kortet är samma bildpunkter; bara högerhanden flyttas till kortet
    if not gjord[a3['ankare']]:
        anrop['a3'] = {'name': f'{NAMN}-ny-dealer-{OMG}{a3["ankare"].lower()}', 'what': f'{vad} Ankarbilden {a3["ankare"]} (kortet har landat, handen kvar på det): en ändring av A2.3 med kortet, dockans ruta {a3["ruta"]} som ställning.',
                       'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'], 'ut': rel(bild(a3)),
                       'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                                'promptText': (f'Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well '
                                               f'above; one card lies face up at seat {a.plats}. The second image is a white 3D mannequin at the same table, seen from exactly '
                                               'the same camera at this very moment; it only shows the pose. Move only his arms, hands and head so that they match the '
                                               'mannequin\'s, at the same places in the picture; his eyes are on the card he has laid. ' + f'{a3["text"]} {a3["kortet"]} The card stays exactly as it is in the first '
                                               'image, at the same pixels, the same place, size and angle: it does not move, slide or turn; only his hand moves to it. Take '
                                               f'nothing else from the second image: not its white skin, its bald head or its face. {rest}'),
                                'referenceImages': [{'uri': fj(bild(a23k)), 'tag': 'edit'}, {'uri': fj(UT / a3['fil']), 'tag': 'pose'}]}}
    # A2M: en ändring av A2.3 (inget kort på filten), kortet i händerna som dockans
    if not gjord[a2m['ankare']]:
        anrop['a2m'] = {'name': f'{NAMN}-ny-dealer-{OMG}a2m', 'what': f'{vad} Ankarbilden A2M (handbytet): en ändring av A2.3, dockans ruta {a2m["ruta"]} som ställning.',
                        'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'], 'ut': rel(bild(a2m)),
                        'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                                 'promptText': ('Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well '
                                                'above, ready at the card shoe; no card lies on the table. The second image is a white 3D mannequin at the same table, seen '
                                                'from exactly the same camera at this very moment; it only shows the pose. Move only his arms, hands and head so that they '
                                                f'match the mannequin\'s, at the same places in the picture; his eyes are on the card in his hands. {a2m["text"]} The card in his hands is at the place, size and '
                                                f'angle of the mannequin\'s card. {a2m["kortet"]} {kortets_utseende(a2m["ruta"], a2m["ruta"])} Take nothing else from the second image: not its white '
                                                f'skin, its bald head or its face. {rest}'),
                                 'referenceImages': [{'uri': fj(bild(a23)), 'tag': 'edit'}, {'uri': fj(UT / a2m['fil']), 'tag': 'pose'}]}}
    pris = kling_med_ref(KLIPP_S, steg[0]['ref_s']), kling_med_ref(KLIPP_S, steg[0]['ref_s'], rabatt=False)

    def klippanrop(s, tagning=1):
        """Anropet för klipp s: Kling 4 med stegets två ankarbilder som första och sista bild och dess referensfilm. En tagning
        över 1 är en ny tagning av samma klipp (--om-klipp), med eget namn i liggaren och egen fil."""
        fran, till = ank[STEGEN[s['nr'] - 1][1]], ank[STEGEN[s['nr'] - 1][2]]
        t = f'-t{tagning}' if tagning > 1 else ''
        ut = UT / 'ut' / f'klipp-{s["nr"]}{t}.mp4'
        return {
            'name': f'{NAMN}-ny-dealer-{OMG}klipp-{s["nr"]}-{s["namn"]}{t}',
            'what': (f'{vad} Klipp {s["nr"]}, {s["fran"]} till {s["till"]}: Kling 4, 1080p, {KLIPP_S} s, ankarbilderna som första och sista bild och dockans film '
                     f'av samma steg som referensfilm ({s["ref"]}: dockrutorna {s["dockrutor"][0]}–{s["dockrutor"][1]}, med {s["stilla_fore"]} och {s["stilla_efter"]} '
                     f'stilla rutor före och efter till {s["ref_s"]} s).' + (f' Tagning {tagning}.' if tagning > 1 else '')),
            'endpoint': '/v1/image_to_video', 'expectCredits': pris[0], 'ut': rel(ut),
            'body': {'model': 'kling_4', 'promptImage': [{'uri': fj(kbild(fran)), 'position': 'first'}, {'uri': fj(kbild(till)), 'position': 'last'}],
                     'referenceVideos': [{'uri': fj(UT / s['ref'])}],
                     'promptText': ('Locked camera, one continuous shot. The man in the first frame makes exactly the movement of the reference video, in its '
                                    'timing, moment by moment, and ends exactly as the last frame shows him. The reference video shows a white mannequin: take '
                                    'only its movement, its timing and where its hands and the card are from it, never its look; his face, hair, shirt and '
                                    f'hands come from the first and last frames. {s["gor"]} He holds still at the start and at the end as the reference video '
                                    'does. His head stays bowed toward the table as in the frames and his eyes follow the card; he does not look up at the camera. The card keeps its size '
                                    f'all the way; it is never lifted high in the air. {kortets_utseende(*s["dockrutor"])} {ett_kort} A {ryggord} card shows in '
                                    'the mouth of the shoe all the time. The background and the table are plain, even green with no print. Natural hands with '
                                    'five fingers. No text, no music, no speech.'),
                     'duration': KLIPP_S, 'ratio': 'auto_1080p'},
            'efter': (f'klippet sparas som {rel(ut)}; steg 7 (--ankarklipp --steg 7) klipper ut steget, lägger dealern på vårt bord och sätter ihop klippen')}

    if a.om_klipp:
        # Bara nya tagningar av de valda klippen: ankarbilderna, de andra klippens anrop och kostnad.json rörs inte.
        for nr in sorted({int(x) for x in a.om_klipp.split(',')}):
            s = next((x for x in steg if x['nr'] == nr), None)
            if not s:
                sys.exit(f'--om-klipp: klipp {nr} finns inte (klippen är {", ".join(str(x["nr"]) for x in steg)})')
            forra = max((int(m_.group(1) or 1) for f in A.glob(f'klipp-{nr}*.json') if (m_ := re.fullmatch(rf'klipp-{nr}(?:-t(\d+))?\.json', f.name))), default=0)
            kropp = klippanrop(s, forra + 1)
            fil = A / (f'klipp-{nr}-t{forra + 1}.json' if forra else f'klipp-{nr}.json')
            fil.write_text(json.dumps(kropp, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f'klipp {nr}, tagning {forra + 1}: {rel(fil)}, {kropp["expectCredits"]} krediter; sparas som {kropp["ut"]}', flush=True)
        return
    for s in steg:
        f_ut = 24   # Kling 4 levererar 24 bilder/s (sjunde, åttonde och elfte provet)
        s['levererat'] = {'bilder_per_s': f_ut, 'rutor': KLIPP_S * f_ut,
                          'steget_i_klippet': [math.ceil(s['stilla_fore'] / FPS * f_ut - 1e-9), math.floor((s['stilla_fore'] + s['rutor_i_steget'] - 1) / FPS * f_ut + 1e-9)],
                          'om': (f'Klippet följer referensfilmen i tiden: klippets tid t (s) är referensfilmens. Steget är dockrutorna {s["dockrutor"][0]}–{s["dockrutor"][1]}, '
                                 f'i referensfilmen rutorna {s["stilla_fore"]}–{s["stilla_fore"] + s["rutor_i_steget"] - 1} vid {FPS} bilder/s, och i klippet tiden '
                                 f'{s["stilla_fore"] / FPS:.3f}–{(s["stilla_fore"] + s["rutor_i_steget"] - 1) / FPS:.3f} s; vid {f_ut} bilder/s klippets rutor '
                                 f'{math.ceil(s["stilla_fore"] / FPS * f_ut - 1e-9)}–{math.floor((s["stilla_fore"] + s["rutor_i_steget"] - 1) / FPS * f_ut + 1e-9)}. '
                                 f'Klippets ruta k är dockruta {s["dockrutor"][0]} + k x {FPS}/{f_ut} - {s["stilla_fore"]}. Filmmodellen gör rörelsen '
                                 f'något senare än referensfilmen (Kling 4 cirka 0,1 s): steg 7 mäter hur mycket i det levererade klippet och klipper där.')}
        anrop[f'klipp-{s["nr"]}'] = klippanrop(s)
    for f in A.glob('*.json'):
        f.unlink()
    for namn, kropp in anrop.items():
        (A / f'{namn}.json').write_text(json.dumps(kropp, ensure_ascii=False, indent=2), encoding='utf-8')
    bilderna = sum(k['expectCredits'] for n_, k in anrop.items() if not n_.startswith('klipp'))
    klippen = sum(k['expectCredits'] for n_, k in anrop.items() if n_.startswith('klipp'))
    summa = {'ankarbilder': bilderna, 'stillbilder': bilderna, 'klipp': klippen, 'A_kling4': klippen, 'A_alla': bilderna + klippen,
             'klipp_efter_rabatten': pris[1] * len(steg)}
    (A / 'kostnad.json').write_text(json.dumps({
        'krediter': summa,
        'om': (f'Runways krediter (0,01 dollar styck). Ankarbilderna (GPT Image 2.6 Sunburst, 2560:1440): A2.3 {KOSTNAD["start"]}, de andra '
               f'{KOSTNAD["andring"]} styck, en gång per person och kamera; de som är gjorda i förra omgången och har samma dockruta tas därifrån. Varje klipp: Kling 4, '
               f'1080p, {KLIPP_S} s med en referensfilm på {steg[0]["ref_s"]} s, {pris[0]} krediter till och med 2026-11-30 UTC och {pris[1]} efter (listpriset 14,1 per '
               f'sekund ut plus 14,1 per sekund av det längre av infilm och utfilm, avrundat uppåt; guides/pricing.md 2026-11-27). En giv: tre klipp, '
               f'{klippen} krediter, och första gången ankarbilderna.'),
        'forra_omgangen': ({'mapp': rel(FORRA), **JAMFORT} if JAMFORT else None),
        'ankarbilder': {b['ankare']: {'dockruta': b['ruta'], 'bild': rel(bild(b)), 'gjord': bool(gjord[b['ankare']])} for b in ank},
        'ordning': [*(x for x in ('a23', 'a23-kort', 'a3', 'a2m') if x in anrop), *(f'klipp-{s["nr"]}' for s in steg)],
        'klippen': steg,
        'lagg': (f'node tools/runway-api.ts place <anrop.json> från blackjack-dealer/ (inom fullmakten i data/order-policy.json), i ordningen ovan; varje '
                 f'bild sparas där anropets "ut" säger, och skalad till 1728 x 972 som k-<namn>.png bredvid (som elfte provet); varje klipp där dess "ut" säger. '
                 f'Sedan, gratis: python ny_dealer.py {a.person} --ankarklipp --steg 7 {"--prov " + a.prov if a.prov else ""} {"--omgang " + a.omgang if a.omgang else ""}'.strip())},
        ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'anropen i {rel(A)}: ankarbilderna {bilderna}, tre klipp {klippen} ({pris[0]} styck, {pris[1]} efter rabatten), allt {bilderna + klippen} krediter', flush=True)
    for vad_, j in JAMFORT.items():
        print(f'  {vad_}: {j}', flush=True)


def rorelse_i_film(film):
    """Hur mycket bilden rör sig i en film, ruta för ruta: medelskillnaden mot rutan före över bordets del av bilden (de
    nedre 60 procenten, där händerna, kortet och skon är; huvudets små rörelser räknas inte), läst liten och grå. Ger
    bildtakten och talen (det första är 0)."""
    B_, H_ = 160, 90
    mat = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'json', str(film)],
                                    capture_output=True, text=True, check=True).stdout)
    tal, namn_ = mat['streams'][0]['r_frame_rate'].split('/')
    ra = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(film), '-vf', f'scale={B_}:{H_}:flags=area,format=gray', '-f', 'rawvideo', '-'],
                        capture_output=True, check=True).stdout
    n, fran = len(ra) // (B_ * H_), int(H_ * 0.4) * B_
    rutor = [ra[i * B_ * H_ + fran:(i + 1) * B_ * H_] for i in range(n)]
    return float(tal) / float(namn_), [0.0] + [sum(abs(x - y) for x, y in zip(rutor[i], rutor[i - 1])) / len(rutor[i]) for i in range(1, n)]


def forskjutning(klipp, ref):
    """Hur mycket senare klippet gör referensfilmens rörelse, i sekunder, och hur lika rörelserna då är (0–1). Kling 4 följde
    2026-11-27 dockans film cirka 0,1 s efter i alla tre klippen, så att ett steg klippt på referensfilmens egna tider
    tappade rörelsens slut. Förskjutningen är den där klippets rörelse, ruta för ruta, stämmer bäst med referensfilmens;
    båda läses på ett gemensamt tidsnät, utan sitt eget brus (medianen)."""
    N = 240   # tidsnätets steg per sekund

    def pa_natet(film):
        f, E = rorelse_i_film(film)
        golv = sorted(E)[len(E) // 2]
        return [max(0.0, E[min(len(E) - 1, math.ceil(i / N * f - 1e-9))] - golv) for i in range(int((len(E) - 1) / f * N) + 1)]
    K, Rf = pa_natet(klipp), pa_natet(ref)

    def likhet(d):   # (klippets tid t + d mot referensfilmens tid t)
        par = [(K[i + d], Rf[i]) for i in range(len(Rf)) if 0 <= i + d < len(K)]
        kk, rr = sum(x * x for x, _ in par), sum(y * y for _, y in par)
        return sum(x * y for x, y in par) / math.sqrt(kk * rr) if kk and rr else 0.0
    d = max(range(-N // 4, N // 2 + 1), key=likhet)
    return d / N, likhet(d)


def steg_efter(prov=False):
    """Efterarbetet, gratis, när klippen är levererade (omgångens ut/klipp-<nr>.mp4): stegen tas ur klippens stillhet och
    sätts ihop till hela given i grönt, och dealern läggs på vårt bord med vår sko och vårt kort, hela given som en tagning
    (standarddocka/verktyg/lagg-pa-bord.ts, plattorna i standarddocka/klipp/, en takt som säger vilken dockruta varje
    filmruta är; skon mäts i handbytets ruta, där ingen hand är vid den).

    Filmens rutor är klippens egna: inga upprepas och inga räknas fram. Filmen går i klippens bildtakt (Kling 4: 24
    bilder/s), och filmruta j är dockans tid j x 30 / bildtakten rutor (var 1,25:e dockruta), tagen ur det steg som har den
    dockrutan; inom ett steg är två filmrutor i rad två klipprutor i rad. Klippets tid är referensfilmens, så mycket senare
    som klippet gör rörelsen (forskjutning). Förut lades klippen om till dockans 30 bilder/s genom att var femte ruta
    upprepades, och domaren fällde det 2026-11-27: "ett jämnt hack sex gånger i sekunden", samma slags konstiga tempo som
    Jakob såg i Kenjis förra film. prov: referensfilmerna i klippens ställe (verktyget prövat utan något betalt)."""
    R = json.loads((UT / 'dockans-rutor.json').read_text(encoding='utf-8'))
    if R.get('lage') != 'ankarklipp':
        sys.exit('steg 7: omgångens rutor är inte gjorda med --ankarklipp')
    E = UT / ('efter-prov' if prov else 'efter')
    E.mkdir(parents=True, exist_ok=True)
    platta, sko = CASINO / 'standarddocka' / 'klipp' / 'platta-bord-ensamt.png', CASINO / 'standarddocka' / 'klipp' / 'platta-bord-med-sko.png'
    steg = R['steg']
    klippen = [UT / s['ref'] if prov else klippets_fil(s['nr']) for s in steg]
    saknas = [rel(k) for k in klippen if not k.exists()]
    if saknas:
        print('steg 7: klippen saknas (inget är beställt än?): ' + ', '.join(saknas), flush=True)
        return
    matt = []
    for s, klipp in zip(steg, klippen):
        m_ = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate:format=duration', '-of', 'json', str(klipp)],
                                       capture_output=True, text=True, check=True).stdout)
        tal, namn_ = m_['streams'][0]['r_frame_rate'].split('/')
        senare, likt = forskjutning(klipp, UT / s['ref'])
        matt.append({'takt': m_['streams'][0]['r_frame_rate'], 'f': float(tal) / float(namn_), 'D': float(m_['format']['duration']), 'rutor': rakna(klipp),
                     'senare': senare, 'likt': likt, 'S': s['stilla_fore'] / FPS + senare})
    f = matt[0]['f']
    if any(abs(m['f'] - f) > 0.01 for m in matt):
        sys.exit('steg 7: klippen har olika bildtakt: ' + ', '.join(f'{m["f"]:.2f}' for m in matt))
    per = FPS / f                                             # dockrutor per filmruta
    J = int(math.floor(steg[-1]['dockrutor'][1] / per + 1e-9)) + 1   # filmens rutor: dockans tid 0, per, 2 per … till givens sista ruta
    val = [[] for _ in steg]                                  # klipprutorna per steg, i ordning
    for j in range(J):
        d = j * per
        i = next((k for k, s in enumerate(steg) if d < s['dockrutor'][1] - 1e-9), len(steg) - 1)   # (ankarrutan hör till steget som börjar där)
        # stegets första filmruta är klipprutan närmast dess tid; sedan klipprutorna i rad
        n = val[i][-1] + 1 if val[i] else round((matt[i]['S'] + (d - steg[i]['dockrutor'][0]) / FPS) * f)
        val[i].append(min(max(n, 0), matt[i]['rutor'] - 1))
    gjorda = []
    for s, klipp, m, rutor in zip(steg, klippen, matt, val):
        gron = E / f'gron-{s["nr"]}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(klipp), '-vf', f'trim=start_frame={rutor[0]}:end_frame={rutor[-1] + 1},setpts=PTS-STARTPTS',
                        '-r', m['takt'], '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', '-an', str(gron)], check=True)
        L = rakna(gron)
        gjorda.append({'nr': s['nr'], 'klipp': rel(klipp), 'bilder_per_s': round(m['f'], 3), 'langd_s': round(m['D'], 3), 'klipprutor': [rutor[0], rutor[-1]],
                       'senare_an_dockan_s': round(m['senare'], 3), 'rorelsens_likhet': round(m['likt'], 2), 'rutor_i_steget': L, 'dockrutor': s['dockrutor'],
                       'gron': gron.name})
        print(f'klipp {s["nr"]}: {m["f"]:.2f} bilder/s, {m["D"]:.2f} s; rörelsen {m["senare"]:+.3f} s mot dockans (likhet {m["likt"]:.2f}); '
              f'klippets rutor {rutor[0]}–{rutor[-1]}, {L} rutor för dockans {s["dockrutor"][0]}–{s["dockrutor"][1]}', flush=True)
        # (rörelsens likhet: åtta klipp som höll hade 0,96–0,98; klippet där Kling ritade ett extra kort på filten hade 0,73)
        if L != len(rutor) or len(set(rutor)) != len(rutor) or m['likt'] < 0.85:
            print(f'  OBS klipp {s["nr"]}: ' + ('klippets rörelse liknar inte referensfilmens (något rör sig i bilden som inte rör sig hos dockan): se på klippet innan filmen visas' if m['likt'] < 0.85 else
                                               f'{L} rutor ur klippet, väntade {len(rutor)} olika (klippet är för kort för steget)'), flush=True)
    # Hela given i grönt: stegen efter varandra.
    gron_hela = E / 'given-i-gront.mp4'
    filer = [E / g['gron'] for g in gjorda]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *sum((['-i', str(x)] for x in filer), []), '-filter_complex',
                    ''.join(f'[{i}:v]' for i in range(len(filer))) + f'concat=n={len(filer)}:v=1:a=0[ut]', '-map', '[ut]', '-r', matt[0]['takt'],
                    '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', str(gron_hela)], check=True)
    hela = rakna(gron_hela)
    # Vilken dockruta varje filmruta är (lagg-pa-bord.ts --takt): jämnt, per dockrutor per filmruta.
    takt = E / 'takt.json'
    takt.write_text(json.dumps({'om': f'Hela given ur de {len(gjorda)} klippen i klippens egen bildtakt ({f:g} bilder/s): filmruta j är dockruta j x {per:g} '
                                      '(ny_dealer.py --ankarklipp --steg 7).', 'film': gron_hela.name, 'bilder_per_s': f, 'dockrutor_per_filmruta': per,
                                'ankare': [{'dockruta': 0, 'filmruta': 0}, {'dockruta': (hela - 1) * per, 'filmruta': hela - 1}]},
                               ensure_ascii=False, indent=1), encoding='utf-8')
    # Dealern på vårt bord med vår sko och vårt kort, hela given som en tagning: dess första ruta är redo vid skon, där
    # dealerns färger mäts, och i handbytets ruta är ingen hand vid skon, så där mäts filmens stilla sko.
    skoruta = min(hela - 1, round(R['tider']['meet'] / per))
    bord = E / 'given-pa-bordet.mp4'
    for x in [bord, *E.glob('bord-*.mp4'), *E.glob('takt-*.json')]:   # (också det första sättets filer, ett klipp i taget)
        x.unlink(missing_ok=True)
    # (rörelsen omgången är filmad efter, rorelse.json; en omgång från före 2026-11-27 kväll har ingen egen och tar lyftet)
    rorelse = UT / 'rorelse.json' if (UT / 'rorelse.json').exists() else BJ / 'dealer3d' / 'data' / f'{GIV}.json'
    r = kor(['node', 'standarddocka/verktyg/lagg-pa-bord.ts', rel(gron_hela), '--platta', rel(platta), '--egen-sko', rel(sko), '--sko-ruta', skoruta,
             '--docka', rel(rorelse), '--takt', rel(takt), *(['--rygg-ur-filmen'] if R.get('rygg') == 'rod' else []), '--ut', rel(bord)], fanga=True)
    fel = None if r.returncode == 0 and bord.exists() else (r.stdout.strip().splitlines() or ['föll'])[-1][:300]
    given = gron_hela if fel else bord
    (E / 'efter.json').write_text(json.dumps({'om': 'Efterarbetet (ny_dealer.py --ankarklipp --steg 7)' + (': PROV med referensfilmerna i klippens ställe' if prov else ''),
                                              'klippen': gjorda, 'gron': gron_hela.name, 'takt': takt.name, 'sko_ruta': skoruta, 'rorelse': rel(rorelse),
                                              **({'bord_fel': fel} if fel else {'bord': bord.name}), 'given': given.name, 'rutor': hela, 'bilder_per_s': f,
                                              'dockrutor_per_filmruta': per, 'dockans_rutor': R['rutor']}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'given: {rel(given)} ({hela} rutor i {f:g} bilder/s, {hela / f:.2f} s; dockans giv {R["rutor"]} rutor, {R["rutor"] / FPS:.2f} s)'
          + (f'; lagg-pa-bord.ts föll: {fel}' if fel else ''), flush=True)


# ------------------------------------------------------------------------------------------------ läget

def lage():
    rorelser = sorted(f.stem for f in (BJ / 'dealer3d' / 'data').glob(f'lyft-{NAMN}-*.json'))
    rader = [('personens mått', PFIL), ('ritningen av mätningen', ARB / 'matning.png'), ('dockan', MODELL),
             ('dockan i systemet', PERSONDOCKOR if NAMN in las_persondockor() else None),
             ('rörelserna', BJ / 'dealer3d' / 'data' / f'{GIV}.json'), ('dockfilmen', next(UT.glob('dockfilm-*-nyckel.mp4'), None) if UT.exists() else None),
             ('rutorna', UT / 'dockans-rutor.json'), ('anropen', UT / 'anrop' / 'kostnad.json')]
    print(f'\nLÄGET för {a.person} (dockan {NAMN}, stilen {STIL}):')
    for vad, f in rader:
        print(f'  {"finns  " if f and Path(f).exists() else "SAKNAS "} {vad}' + (f': {rel(f)}' if f and Path(f).exists() else ''))
    if rorelser:
        print(f'  rörelserna: {", ".join(rorelser)}')
    k = UT / 'anrop' / 'kostnad.json'
    if k.exists():
        s = json.loads(k.read_text(encoding='utf-8'))['krediter']
        # (ett anrop som säger var dess resultat sparas, "ut", är lagt och hämtat när filen finns där; av ett klipps tagningar
        # räknas bara den senaste, eftersom en underkänd tagning är ersatt och dess fil borttagen)
        senaste = {}
        for f in sorted((UT / 'anrop').glob('*.json')):
            if f.name == 'kostnad.json':
                continue
            m_ = re.fullmatch(r'(klipp-\d+)(?:-t(\d+))?\.json', f.name)
            nyckel, tagning = (m_.group(1), int(m_.group(2) or 1)) if m_ else (f.name, 1)
            if nyckel not in senaste or tagning > senaste[nyckel][0]:
                senaste[nyckel] = (tagning, json.loads(f.read_text(encoding='utf-8')))
        med_ut = [x for _, x in senaste.values() if x.get('ut')]
        kvar = [x for x in med_ut if not (CASINO / x['ut']).exists()]
        print(f'  de betalda stegen: stillbilderna {s["stillbilder"]} krediter, sedan film A (Kling 4) {s["A_kling4"]}, med bilderna {s["A_alla"]} krediter '
              f'({s["A_alla"] / 100:.2f} dollar)' + (f'; eller B (Aleph 2) {s["B_aleph2"]}, båda {s["bada"]}' if 'B_aleph2' in s else '')
              + (f'. {len(med_ut) - len(kvar)} av {len(med_ut)} anrop har sitt resultat på plats'
                 + (f'; kvar att lägga: {sum(x["expectCredits"] for x in kvar)} krediter.' if kvar else ': inget är kvar att lägga.') if med_ut else
                 '. Vad som är lagt står i liggaren (blackjack-dealer/.runtime/runway-api/ledger.json).'))


if not a.lage:
    for nr in sorted(KOR):
        print(f'\n=== steg {nr}: {STEG[nr]} ===', flush=True)
        if nr == 7 and not a.ankarklipp:
            sys.exit('steg 7 (efterarbetet) finns bara med --ankarklipp')
        {1: steg_matt, 2: steg_docka, 3: steg_system, 4: steg_rorelser, 5: steg_film_ankare if a.ankarklipp else steg_film,
         6: steg_anrop_ankare if a.ankarklipp else steg_anrop, 7: lambda: steg_efter(a.efter_prov)}[nr]()
lage()
