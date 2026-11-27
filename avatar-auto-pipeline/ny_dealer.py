"""En ny dealer ur bilder av en person, en rad (Jakob 2026-11-27: "ett generiskt sätt att få en pipeline för en helt och
hållet ny dealer, som till allra största del är ett resultat av alla de rörelsesekvenser som vi nu har tagit in").
Gratis och här på datorn; inga betalda anrop. De betalda stegen skrivs som färdiga anrop med sin kostnad, och läggs av
den som får betala (blackjack-dealer/tools/runway-api.ts place).

    python ny_dealer.py <person> [--stil kameran|bordet] [--namn <docka>] [--utseende "<text på engelska>"]
                        [--plats 4] [--prov <provmapp>] [--steg 1-6] [--lage]

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
             filmad med editorn (standarddocka/verktyg/titta.ts), och rutorna ur den: var åttonde ruta jämnt i dockans
             tid, och första och sista
  6 anrop    de betalda anropen, färdiga men inte lagda: stillbilderna (GPT Image 2.6 Sunburst genom Runway, personens
             bilder som förlaga och dockans rutor som ställning) och två filmer att jämföra, A Kling 4 med första bild,
             mellanbilderna och sista bild, B Aleph 2 över dockfilmen med startbilden som styrbild; med vad var och en kostar
Utan --steg körs alla; --steg 3-6 börjar om efter dockan, --steg 5 filmar om. SAM 3D Body körs bara om dess svar saknas i
output/<person>/15-matt-ur-bilder/ (radera det där för att läsa om bilderna). --lage säger bara vad som finns och vad
som saknas.
--prov lägger filmen, rutorna och anropen i blackjack-dealer/assets/proofs/<provmapp>/original/ i stället för
output/<person>/16-dockfilm/, så att de visas för Jakob som ett prov.
--utseende är personens utseende i ord för bildmodellen (står sedan kvar i personfilen); utan det säger anropen bara
"samma ansikte, hår och kläder som i bilderna".
"""
import argparse, json, os, re, shutil, subprocess, sys, time
from pathlib import Path

ROT = Path(__file__).resolve().parent              # avatar-auto-pipeline
CASINO = ROT.parent
BJ = CASINO / 'blackjack-dealer'
PY_MP = BJ / 'tools' / 'python' / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
LAS = CASINO / 'slask' / 'blackjack-dealer' / 'gpu-och-headless.lock'
PERSONDOCKOR = BJ / 'dealer3d' / 'src' / 'persondockor.ts'
STEG = {1: 'matt', 2: 'docka', 3: 'system', 4: 'rorelser', 5: 'film', 6: 'anrop'}
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
UT = (BJ / 'assets' / 'proofs' / a.prov / 'original') if a.prov else (ROT / 'output' / a.person / '16-dockfilm')
ARB = ROT / 'output' / a.person / '15-matt-ur-bilder'
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

def rutorna(n):
    """Var åttonde ruta jämnt i dockans tid, och första och sista; mellanbilderna högst 8 (Kling 4) och inte närmare sista
    rutan än fyra."""
    mellan = list(range(8, n - 1 - 4, 8))
    if len(mellan) > 8:   # (en längre giv: åtta jämnt fördelade i stället)
        steg = (n - 1) / 9
        mellan = [round(steg * (i + 1)) for i in range(8)]
    return [0, *mellan, n - 1]


def fas(t, T, plats):
    """Vad dockan gör i ruta t, ur rörelsens egna tider (made.times), i ord för bildmodellen, och hur kortet syns."""
    p = f'seat {plats}'
    if t < T['pull']:
        return ('Ready at the shoe: the left hand rests at the mouth of the shoe with its fingertips on the front card; the right hand rests flat on the felt in front of the body.', 'back (yellow), the front card in the shoe')
    if t < T['leaves']:
        return ('The left hand draws the front card out of the mouth of the shoe under its fingertips, flat and back up; the right hand still rests on the felt.', 'back (yellow), sliding out of the shoe')
    if t < T['meet'] - 2:
        return ('The left hand has drawn the card out onto the felt and brings it flat, back up, toward the middle in front of him; the right hand lifts from the felt and comes in toward the card.', 'back (yellow), flat under the left fingers')
    if t <= T['meet'] + 1:
        return ('The handover: the card stands on its long edge on the felt between the hands; the right hand comes in from above and takes it between the index finger and the thumb.', 'edge-on, standing between the hands')
    if t < T['vandFran']:
        return ('The right hand carries the card up in the air, pinched between the index finger and the thumb, on edge; the left hand goes back toward the shoe.', 'edge or a little of the face, held up in the right hand')
    if t < T['ligger']:
        return (f'The right hand reaches toward {p} and tips the card down under the hand, so that it lands face up under the index finger; the left hand rests at the shoe.', 'face (white), almost flat')
    if t < T['rests']:
        return (f'The card lies face up at {p} with the right index finger resting on its near end; the left hand rests at the shoe.', 'face (white), flat on the felt')
    if t < T['vila']:
        return (f'The right index finger lifts off the card lying face up at {p} and the right hand starts back home; the left hand rests at the shoe.', 'face (white), lying at the place')
    return (f'Ready at the shoe again: the dealt card lies face up at {p}, the right hand has come home and rests flat on the felt, and the left hand rests at the mouth of the shoe on the next card.', 'face (white), lying at the place')


def steg_film():
    rorelse = json.loads((BJ / 'dealer3d' / 'data' / f'{GIV}.json').read_text(encoding='utf-8'))
    n, T = rorelse['frameCount'], rorelse['made']['times']
    r = kor(['node', 'standarddocka/verktyg/titta.ts', '--docka', NAMN, '--plats', a.plats, '--spela-in', 'hela',
             '--kamera', 'spel', '--utseende', 'nyckel'], fanga=True)
    klipp = re.findall(r'(standarddocka/klipp/[^\s]+?\.mp4)', r.stdout.replace('\\', '/'))
    if r.returncode or not klipp:
        sys.exit('steg 5: editorn filmade inte')
    film = CASINO / klipp[-1]
    UT.mkdir(parents=True, exist_ok=True)
    dockfilm = UT / f'dockfilm-{GIV}-nyckel.mp4'
    shutil.move(film, dockfilm)   # (vår egen inspelning: flyttas dit den visas, ingen kopia blir kvar i klipp/)
    antal = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames',
                                '-of', 'csv=p=0', str(dockfilm)], capture_output=True, text=True, check=True).stdout.strip())
    if antal != n:
        print(f'OBS: filmen har {antal} rutor, rörelsen {n}: rutorna tas ur filmen', flush=True)
    valda = rutorna(antal)
    bilder = []
    for k in valda:
        ut = UT / f'docka-ruta-{k:02d}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(dockfilm), '-vf', f'select=eq(n\\,{k})', '-vframes', '1', str(ut)], check=True)
        text, kort = fas(min(k, n - 1), T, a.plats)
        bilder.append({'fil': ut.name, 'ruta': k, 'kortet': kort, 'text': text})
    (UT / 'dockans-rutor.json').write_text(json.dumps({
        'om': f'Rutor ur {NAMN}s giv till dagens plats {a.plats} (blackjack-dealer/dealer3d/data/{GIV}.json, {n} rutor, {n / FPS:.1f} s vid {FPS} rutor/s), '
              f'genom livebordets kamera i editorns nyckelutseende (grön bakgrund, grönt bord utan tryck, gul kortrygg; kortets framsida vit), '
              f'1728 x 972, ur dockfilmen {dockfilm.name} (avatar-auto-pipeline/ny_dealer.py steg 5). Var åttonde ruta jämnt i dockans tid och första '
              f'och sista: {", ".join(map(str, valda))}. Texten säger vad dockan gör, ur rörelsens egna tider (made.times).',
        'giv': GIV, 'rutor': antal, 'fps': FPS, 'tider': T, 'kortrygg': {'nyckel': 'gul', 'vanlig': 'röd'}, 'bilder': bilder}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'dockfilmen {rel(dockfilm)} ({antal} rutor), rutorna {valda}', flush=True)


# ------------------------------------------------------------------------------------------------ 6 anrop

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
    kort_ligger = lambda b: b['ruta'] >= T['ligger']
    forsta, sista, mellan = bilder[0], bilder[-1], bilder[1:-1]
    gemensamt = ('Everything else stays exactly as in the first image: his face, hair and shirt, the dark red chair back, the clear card shoe at the same '
                 'place, size and angle with the yellow deck in it, the small clear plate in front of the shoe, the flat green background and the plain '
                 'green table with no print and no texture; only soft natural shadows of his arms and hands on the table. The same framing and camera; a photograph.')
    anrop = {}
    anrop['start'] = {'name': f'{NAMN}-ny-dealer-start', 'what': f'{vad} Startbilden: dockans första ruta omgjord till personen (GPT Image 2.6 Sunburst, rutan och hans tre bilder). {forsta["text"]}',
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
    anrop['sista'] = {'name': f'{NAMN}-ny-dealer-sista', 'what': f'{vad} Sista bilden: startbilden med kortet liggande på plats {a.plats}, framsidan upp, där dockans kort ligger i givens sista ruta ({sista["ruta"]}).',
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
                               'referenceImages': [{'uri': ut('start.png'), 'tag': 'edit'}, {'uri': fil(sista), 'tag': 'pose'}]}}
    for b in mellan:
        grund = 'sista.png' if kort_ligger(b) else 'start.png'
        lage = ('His left hand (on the right of the picture) is at the mouth of a clear card shoe with its fingertips on the front card, and his right hand (on the '
                'left of the picture) rests flat on the table in front of him. ' + (f'One card lies face up at seat {a.plats}.' if kort_ligger(b) else 'No card lies on the table.'))
        kortet = ('' if b['ruta'] < T['leaves'] else f' The card in his hands is at the place, size and angle of the mannequin\'s card: {b["kortet"]}; its back is solid yellow '
                  'with a thin cyan border and a small magenta mark, and its face is plain white with a thin cyan border and a small magenta mark.')
        anrop[f'mellan-{b["ruta"]:02d}'] = {
            'name': f'{NAMN}-ny-dealer-mellan-{b["ruta"]:02d}', 'what': f'{vad} Mellanbild, dockans ruta {b["ruta"]} av {n}: {b["text"]}',
            'endpoint': '/v1/text_to_image', 'expectCredits': KOSTNAD['andring'],
            'body': {'model': 'gpt_image_2_6_sunburst', 'ratio': '2560:1440', 'quality': 'high',
                     'promptText': (f'Edit the first image: a photograph of a casino dealer seated at a green-screen table, seen from the front and from well above. {lage} '
                                    'The second image is a white 3D mannequin at the same table, seen from exactly the same camera at this very moment; it only shows the '
                                    'pose. Move only his arms, hands and head so that they match the mannequin\'s: the same arm, hand and finger positions and the same bow '
                                    f'of the head, at the same places in the picture. {b["text"]}{kortet} Take nothing else from the second image: not its white skin, its '
                                    f'bald head or its face. {gemensamt}'),
                     'referenceImages': [{'uri': ut(grund), 'tag': 'edit'}, {'uri': fil(b), 'tag': 'pose'}]}}
    sek = n / FPS
    anrop['film-a-kling4'] = {
        'name': f'{NAMN}-ny-dealer-a-kling4', 'what': f'{vad} Film A: Kling 4, 1080p, 3 s: första bild, {len(mellan)} mellanbilder (dockans ruta {", ".join(str(b["ruta"]) for b in mellan)} av {n}, jämnt var åttonde) och sista bild. Ingen referensfilm.',
        'endpoint': '/v1/image_to_video', 'expectCredits': KOSTNAD['kling4_3s_1080p'],
        'body': {'model': 'kling_4', 'promptImage': [{'uri': ut('k-start.png'), 'position': 'first'}, *[{'uri': ut(f'k-{b["ruta"]:02d}.png'), 'position': 'middle'} for b in mellan],
                                                      {'uri': ut('k-sista.png'), 'position': 'last'}],
                 'promptText': (f'Locked camera, one continuous shot. The man in the first frame deals one card from the shoe to seat {a.plats}, where the last frame shows it '
                                'lying. The middle frames show the movement on the way, in order: his hands pass through each of them in one continuous motion, without '
                                'stopping. He moves like a practised dealer, with soft, relaxed arms and hands. His left hand at the mouth of the shoe draws the front card '
                                'out flat under its fingertips, back up, and slides it across the felt to a point in front of him, where it stands the card up on its long '
                                'edge. His right hand lifts from the felt, comes in and takes the card between the index finger and the thumb, and his left hand lets go and '
                                'returns to rest at the mouth of the shoe. His right hand carries the card forward and tips it down onto its place, face up, under the index '
                                'finger, pushes it a little into place with the fingertip, and the card lies still. Then the finger lifts off, and his right hand glides back '
                                'low over the felt and rests flat in front of him, as in the first frame. The card keeps its size all the way; its back is solid yellow with a '
                                'thin cyan border, and its face is white with a thin cyan border and a small magenta mark in one corner, as the last frame shows it. A yellow '
                                'card shows in the mouth of the shoe all the time. The background and the table are plain, even green. His head stays bowed toward the table '
                                'and his eyes follow the card; he does not look up at the camera. No text, no music, no speech.'),
                 'duration': 3, 'ratio': 'auto_1080p'},
        'efter': 'k-*.png är bilderna i ut/ skalade till 1728 x 972 (som elfte provet); filmen sträcks till dockans längd med setpts efteråt'}
    aleph = max(KOSTNAD['aleph2_minst'], KOSTNAD['aleph2_per_hel_sekund'] * int(sek))
    anrop['film-b-aleph2'] = {
        'name': f'{NAMN}-ny-dealer-b-aleph2', 'what': f'{vad} Film B: Aleph 2 över dockfilmen i nyckelutseendet ({n} rutor, {sek:.1f} s), med startbilden som styrbild vid sekund 0 (receptet från tionde provet).',
        'endpoint': '/v1/video_to_video', 'expectCredits': aleph,
        'body': {'model': 'aleph2', 'videoUri': f'$file:{fran_bj(next(UT.glob("dockfilm-*-nyckel.mp4")))}',
                 'promptText': ('Turn the white mannequin into the real man in the reference picture, with the same face, hair and shirt all through the film. Keep the '
                                'mannequin\'s movement exactly, frame by frame: the hands, the fingers, the head and the card. The background and the table stay plain, even '
                                'green with no print; the card shoe, the yellow deck and the clear plate stay as they are. The card\'s back is solid yellow with a thin cyan '
                                'border, its face plain white with a thin cyan border and a small magenta mark; it is not a printed playing card. Natural skin and natural '
                                'hands with five fingers; a photograph.'),
                 'keyframes': [{'uri': ut('start.png'), 'seconds': 0}]},
        'kostnad': f'28 krediter per hel sekund av infilmen ({sek:.2f} s), minst 56; ordermodellen räknar uppåt ({max(56, 28 * -(-int(sek * 100) // 100))})'}
    for namn, kropp in anrop.items():
        (A / f'{namn}.json').write_text(json.dumps(kropp, ensure_ascii=False, indent=2), encoding='utf-8')
    bildkostnad = KOSTNAD['start'] + KOSTNAD['andring'] * (1 + len(mellan))
    summa = {'stillbilder': bildkostnad, 'A_kling4': KOSTNAD['kling4_3s_1080p'], 'B_aleph2': aleph,
             'A_alla': bildkostnad + KOSTNAD['kling4_3s_1080p'], 'B_alla': KOSTNAD['start'] + aleph,
             'bada': bildkostnad + KOSTNAD['kling4_3s_1080p'] + aleph}
    (A / 'kostnad.json').write_text(json.dumps({'krediter': summa, 'om': f'Runways krediter (0,01 dollar styck). Stillbilderna: start {KOSTNAD["start"]}, sista och {len(mellan)} mellanbilder {KOSTNAD["andring"]} styck. '
                                               f'Kling 4 3 s 1080p {KOSTNAD["kling4_3s_1080p"]} (rabatt till 2026-11-30, sedan {KOSTNAD["kling4_3s_1080p_efter_rabatten"]}). '
                                               f'Aleph 2 {aleph}. B behöver bara startbilden.', 'ordning': ['start', 'sista', *[f'mellan-{b["ruta"]:02d}' for b in mellan], 'film-a-kling4', 'film-b-aleph2'],
                                               'lagg': 'node tools/runway-api.ts place <anrop.json> från blackjack-dealer/ (inom fullmakten i data/order-policy.json), i ordningen ovan: '
                                                       'varje bild sparas i ut/ med det namn nästa anrop väntar sig (start.png, sista.png, mellan-NN.png), och för film A '
                                                       'skalade till 1728 x 972 som k-start.png, k-NN.png och k-sista.png (som elfte provet)'},
                                              ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'anropen i {rel(A)}: stillbilderna {bildkostnad}, A Kling 4 {KOSTNAD["kling4_3s_1080p"]}, B Aleph 2 {aleph}; båda {summa["bada"]} krediter', flush=True)


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
        print(f'  nästa betalda steg: stillbilderna {s["stillbilder"]} krediter, sedan film A (Kling 4) {s["A_kling4"]} eller B (Aleph 2) {s["B_aleph2"]}; '
              f'båda {s["bada"]} krediter ({s["bada"] / 100:.2f} dollar). Ingen är lagd.')


if not a.lage:
    for nr in sorted(KOR):
        print(f'\n=== steg {nr}: {STEG[nr]} ===', flush=True)
        {1: steg_matt, 2: steg_docka, 3: steg_system, 4: steg_rorelser, 5: steg_film, 6: steg_anrop}[nr]()
lage()
