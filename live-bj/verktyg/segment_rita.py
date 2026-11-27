# Pictures of the cutting in data/segment.json (verktyg/segment.py rita and blad).
# rita draws from the numbers alone: the timeline of the whole film per hand, where each hand gathers, and the tables
# (categories, states, transitions, the hands out of step, the numbers for the drawn deal beside koreo-giv.ts, what to
# lift next). No frame of the film is in them, so they may go into a proof. blad adds a sheet per category with frames of
# the film, under live-bj/rutor/ only (a real person; Git ignores the folder).
import os, re, json, glob, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt                       # noqa: E402
from matplotlib.patches import Patch, Rectangle       # noqa: E402

DOLL = {'A': 'Danilo', 'B': 'Frasse'}
HAND = {'hoger': 'höger hand', 'vanster': 'vänster hand', 'huvud': 'huvud och blick'}
# The eight moves get the eight categorical hues in a fixed order; the stops are grays; what is not to be copied is dark
# and hatched; the dealer's own card is the deal's blue, hatched.
COLOURS = {'GIV': '#257de0', 'DRA': '#f47230', 'TILL-SKON': '#00b894', 'HEM': '#f2a600', 'PEKA': '#ee7fac', 'SVEP': '#008a17', 'KORT-IN': '#6a4ce2', 'RATTA': '#ec4647',
           'GIV-EGET': '#257de0', 'VILA': '#dcdcdc', 'VANTA': '#bdbdbd', 'STOPP': '#8f8f8f', 'SKON': '#3a3a3a', 'ANNAT': '#3a3a3a'}
HATCH = {'GIV-EGET': '////', 'SKON': 'xxxx', 'ANNAT': '....'}
HEAD = {'KAMERAN': '#cce3fd', 'BORDET': '#0f4a96', 'MOT-SKON': '#519ced', 'MOT-LADAN': '#9887ef', 'OKANT': '#ffffff'}
WORDS = {'GIV': 'giv till en plats', 'GIV-EGET': 'giv till dealern själv', 'DRA': 'vänstern drar kortet ur skon', 'TILL-SKON': 'vänstern till skon', 'HEM': 'handen hem',
         'PEKA': 'peka mot en plats', 'SVEP': 'svep över bordet', 'KORT-IN': 'korten in i lådan', 'RATTA': 'rätta till ett kort', 'VILA': 'vila', 'VANTA': 'vänta med små rörelser',
         'STOPP': 'kort stopp', 'SKON': 'sköter skon (härmas inte)', 'ANNAT': 'annat (härmas inte)',
         'KAMERAN': 'ser i kameran', 'BORDET': 'ser på bordet', 'MOT-SKON': 'vänd mot skon', 'MOT-LADAN': 'vänd mot lådan', 'OKANT': 'ansiktet syns inte'}
SIGNS = {'place your bets': ('insatser', '#e8e8e8'), 'last bets': ('insatser', '#e8e8e8'), 'bets closed': ('insatser', '#e8e8e8'), 'bets accepted': ('insatser', '#e8e8e8'),
         'dealing': ('giv', '#a8a8a8'), 'make your decision': ('spelaren väljer', '#5a5a5a'), 'dealer wins': ('rundan klar', '#d0d0d0'), 'none': ('rundan klar', '#d0d0d0')}
SHORT = {'KAMERAN': 'kameran', 'BORDET': 'bordet', 'MOT-SKON': 'mot skon', 'MOT-LADAN': 'mot lådan', 'OKANT': 'syns inte'}
INK, INK2 = '#1f1f1f', '#6b6b6b'
plt.rcParams.update({'font.size': 10, 'text.color': INK, 'axes.labelcolor': INK, 'xtick.color': INK2, 'ytick.color': INK2, 'axes.edgecolor': '#c8c8c8', 'figure.facecolor': 'white'})


def load(data_dir):
    seg = json.load(open(os.path.join(data_dir, 'segment.json'), encoding='utf-8'))
    phases = json.load(open(os.path.join(data_dir, 'faser.json'), encoding='utf-8'))
    scene = json.load(open(os.path.join(data_dir, 'scen.json'), encoding='utf-8'))
    source = json.load(open(os.path.join(data_dir, 'kalla.json'), encoding='utf-8'))
    return seg, phases, scene, source


def sv(x, d=2):
    """A number the Swedish way: a decimal comma."""
    if x is None:
        return '–'
    if isinstance(x, (int, np.integer)):
        return str(x)
    return f'{x:.{d}f}'.replace('.', ',')


def timeline(seg, phases, source, path, per_row=100):
    """The whole film, a row per 100 seconds: the game's sign, the right hand, the left hand and the head, in colour per category."""
    start, end = source['runs'][0]['from'], source['runs'][-1]['to']
    rows = int(math.ceil((end - start) / per_row))
    fig, axes = plt.subplots(rows, 1, figsize=(20, 1.15 * rows + 2.4))
    tracks = [('skylt', 3.3), ('hoger', 2.2), ('vanster', 1.1), ('huvud', 0.0)]
    for r, ax in enumerate(axes):
        a, b = start + r * per_row, start + (r + 1) * per_row
        ax.set_xlim(a, b)
        ax.set_ylim(-0.1, 4.2)
        ax.add_patch(Rectangle((a, -0.1), b - a, 4.3, color='#f6f6f6', zorder=0, lw=0))   # the measured stretches white, the rest gray
        for run in source['runs']:
            if run['to'] > a and run['from'] < b:
                ax.add_patch(Rectangle((run['from'], -0.1), run['to'] - run['from'], 4.3, color='white', zorder=0, lw=0))
        for s in phases['spans']:
            if s['to'] > a and s['from'] < b and s['sign'] in SIGNS:
                ax.add_patch(Rectangle((s['from'], 3.3), s['to'] - s['from'], 0.8, color=SIGNS[s['sign']][1], lw=0, zorder=1))
        for dl, dd in seg['stycken'].items():
            for key, y in tracks[1:]:
                for p in dd[key]:
                    if p['till_s'] < a or p['fran_s'] > b:
                        continue
                    col = HEAD.get(p['kat']) if key == 'huvud' else COLOURS.get(p['kat'], '#ffffff')
                    ax.add_patch(Rectangle((p['fran_s'], y), max(p['till_s'] - p['fran_s'], 0.05), 0.9, facecolor=col, edgecolor='white', lw=0.4, hatch=HATCH.get(p['kat']), zorder=2))
        ax.axvspan(474, 500, color='#f6f6f6', zorder=3, lw=0)
        if a < 487 < b:
            ax.text(487, 2.1, 'dealerbyte', ha='center', va='center', fontsize=8, color=INK2, rotation=90, zorder=4)
        ax.set_yticks([3.7, 2.65, 1.55, 0.45])
        who = 'Danilo' if a < 474 else 'Frasse' if a > 500 else 'Danilo / Frasse'
        ax.set_yticklabels([f'{who}: skylt', 'höger hand', 'vänster hand', 'huvud'], fontsize=8)
        ax.tick_params(axis='y', length=0)
        ax.set_xticks(np.arange(math.ceil(a / 10) * 10, b + 0.1, 10))
        ax.tick_params(axis='x', labelsize=8)
        for side in ('top', 'right', 'left'):
            ax.spines[side].set_visible(False)
    axes[-1].set_xlabel('sekunder i filmen (grått: inte mätt)')
    moves = ['GIV', 'GIV-EGET', 'DRA', 'TILL-SKON', 'HEM', 'PEKA', 'SVEP', 'KORT-IN', 'RATTA', 'VILA', 'VANTA', 'STOPP', 'SKON', 'ANNAT']
    hands = [Patch(facecolor=COLOURS[k], hatch=HATCH.get(k), edgecolor='white', label=f'{k}: {WORDS[k]}') for k in moves]
    heads = [Patch(facecolor=HEAD[k], edgecolor='#c8c8c8', label=f'{k}: {WORDS[k]}') for k in HEAD]
    signs = [Patch(facecolor=c, label=f'skylt: {w}') for w, c in dict(SIGNS.values()).items()]
    fig.legend(handles=hands, loc='upper left', ncol=5, fontsize=8, frameon=False, bbox_to_anchor=(0.01, 1.0), title='Händerna', title_fontsize=9)
    fig.legend(handles=heads + signs, loc='upper right', ncol=2, fontsize=8, frameon=False, bbox_to_anchor=(0.99, 1.0), title='Huvudet och spelets skylt', title_fontsize=9)
    fig.suptitle('Hela livefilmen indelad: vad varje hand gör, sekund för sekund', x=0.5, y=1.02, fontsize=14, color=INK)
    fig.tight_layout(rect=(0, 0, 1, 1 - 1.7 / (1.15 * rows + 2.4)))
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def table(path, title, columns, rows, widths=None, note=None, highlight=None):
    """A table as a picture: the header in bold, every other row shaded, the note under it."""
    text = [[str(c) for c in r] for r in rows]
    need = [max([len(columns[j])] + [len(r[j]) for r in text]) * 0.095 + 0.25 for j in range(len(columns))]   # inches the longest text in each column takes
    widths = [max(a, b) for a, b in zip(widths or need, need)]
    w = sum(widths)
    h = 0.26 * (len(rows) + 1) + 0.6
    fig, ax = plt.subplots(figsize=(w, h))
    ax.axis('off')
    t = ax.table(cellText=text, colLabels=columns, loc='upper left', cellLoc='left', colLoc='left', colWidths=[x / w for x in widths])
    t.auto_set_font_size(False)
    t.set_fontsize(9)
    t.scale(1, 1.35)
    for (i, j), cell in t.get_celld().items():
        cell.set_edgecolor('#e0e0e0')
        cell.set_linewidth(0.5)
        if i == 0:
            cell.set_text_props(weight='bold')
            cell.set_facecolor('#f0f0f0')
        elif i % 2 == 0:
            cell.set_facecolor('#fafafa')
        if highlight and i > 0 and highlight(i - 1, j):
            cell.set_facecolor('#fde2d0')
    ax.set_title(title, loc='left', fontsize=13, color=INK, pad=12)
    if note:   # right under the table, wrapped to its width
        fig.canvas.draw()
        box = t.get_window_extent().transformed(fig.transFigure.inverted())
        chars = max(40, int(w / 0.068))
        lines, line = [], ''
        for word in note.split():
            if len(line) + len(word) + 1 > chars:
                lines.append(line)
                line = word
            else:
                line = f'{line} {word}'.strip()
        lines.append(line)
        fig.text(box.x0, box.y0 - 0.02, '\n'.join(lines), fontsize=8.5, color=INK2, va='top')
    fig.savefig(path, dpi=110, bbox_inches='tight')
    plt.close(fig)


def koreo(repo):
    """The drawn deal's own numbers, read from koreo-giv.ts (KOREO), so that they have one source: the code."""
    text = open(os.path.join(repo, 'blackjack-dealer', 'dealer3d', 'src', 'koreo-giv.ts'), encoding='utf-8').read()
    body = text[text.index('export const KOREO = {'):]
    body = body[:body.index('};')]
    num = lambda k: float(re.search(rf'\b{k}: *(-?[\d.]+)', body).group(1))
    mote = re.search(r'mote: *\{x: *([\d.]+), *z: *([\d.]+)\}', body)
    fps = 30
    return {'framme': num('framme') / fps, 'nyp': num('nyp') / fps, 'slapper': num('vansterSlapper') / fps, 'vansterHemma': num('vansterHemma') / fps, 'ligger': num('ligger') / fps,
            'hemma': num('hemma') / fps, 'vilar': num('vilar') / fps, 'hogerFran': num('hogerFran') / fps, 'mote_x': float(mote.group(1)), 'mote_z': float(mote.group(2)), 'lyft': num('lyft'), 'rest': num('rest'), 'ovanfor': num('ovanfor')}


def states_map(seg, scene, path):
    """Where each hand gathers when it is still, from above, on our drawing of the live table (numbers only)."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 7.2))
    outline = np.array(scene['table']['feltOutlineM'])
    for ax, (dl, dd) in zip(axes, seg['dealrar'].items()):
        ax.fill(outline[:, 0], outline[:, 1], color='#f3f3f3', zorder=0)
        ax.plot(*np.vstack([outline, outline[:1]]).T, color='#c8c8c8', lw=1)
        for name, key in (('sko', 'sko'), ('låda', 'slaskbox')):
            foot = np.array(scene['things'][key]['footMetres'])
            ax.fill(foot[:, 0], foot[:, 1], color='#d9d9d9', zorder=1)
            ax.text(foot[:, 0].mean(), foot[:, 1].mean(), name, ha='center', va='center', fontsize=8, color=INK2)
        for n, (x, y) in enumerate(scene['seatsUiM'], 1):
            ax.text(x, y - 0.03, f'P{n}', ha='center', fontsize=9, color=INK2)
        ax.plot(*scene['places']['dealer']['m'], marker='s', color='#bdbdbd', ms=8)
        ax.axhline(scene['table']['dealerEdgeM'], color='#c8c8c8', lw=1, ls='--')
        for name, st in dd['lagen'].items():
            x, y = st['mitt_m']
            if y > 1.95:
                continue
            col = COLOURS['GIV'] if name.startswith('H') else COLOURS['DRA']
            size = 40 + 8 * st['sekunder']
            ax.scatter([x], [y], s=size, color=col, alpha=0.35, edgecolor=col, zorder=3)
            ax.text(x, y, name, ha='center', va='center', fontsize=8, color=INK, zorder=4)
        ax.set_xlim(-0.8, 0.85)
        ax.set_ylim(1.85, 0.75)
        ax.set_aspect('equal')
        ax.set_title(f"{DOLL[dl]}: där händerna står stilla", loc='left', fontsize=12)
        ax.set_xlabel('meter åt bildens höger (dealerns vänster)')
        ax.set_ylabel('meter bort från kameran (dealern nederst)')
    fig.legend(handles=[Patch(color=COLOURS['GIV'], alpha=0.5, label='högerhandens lägen (H)'), Patch(color=COLOURS['DRA'], alpha=0.5, label='vänsterhandens lägen (V)')],
               loc='lower center', ncol=2, frameon=False, bbox_to_anchor=(0.5, 0.045))
    fig.suptitle('Handens lägen: mitten av varje läge på filtens plan, cirkelns yta efter hur länge handen står där', fontsize=12)
    fig.text(0.5, -0.01, 'En hand som är lyft (vid skon, vid lådan, vid kroppen) syns längre bort på filtens plan än den är; lägena vid kroppen ligger bakom den streckade kanten.', ha='center', fontsize=8.5, color=INK2)
    fig.tight_layout(rect=(0, 0.09, 1, 0.95))
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def transitions(seg, path):
    """From state to state per hand and dealer, as a grid of counts."""
    fig, axes = plt.subplots(2, 2, figsize=(16, 13))
    for col, (dl, dd) in enumerate(seg['dealrar'].items()):
        for row, (hand, title) in enumerate((('H', 'höger hand'), ('V', 'vänster hand'))):
            ax = axes[row][col]
            tr = dd['overgangar'][hand]
            names = sorted({n for k in tr for n in k.split(' -> ')}, key=lambda n: (n[1:], n))
            m = np.zeros((len(names), len(names)))
            for k, v in tr.items():
                a, b = k.split(' -> ')
                m[names.index(a), names.index(b)] = v
            ax.imshow(m, cmap='Blues', vmin=0, vmax=max(m.max(), 1))
            for i in range(len(names)):
                for j in range(len(names)):
                    if m[i, j]:
                        ax.text(j, i, int(m[i, j]), ha='center', va='center', fontsize=9, color='white' if m[i, j] > m.max() * 0.55 else INK)
            ax.set_xticks(range(len(names)))
            ax.set_xticklabels(names, rotation=45, ha='right', fontsize=9)
            ax.set_yticks(range(len(names)))
            ax.set_yticklabels(names, fontsize=9)
            ax.set_xlabel('slutar i läget')
            ax.set_ylabel('börjar i läget')
            ax.set_title(f'{DOLL[dl]}, {title}: rörelser från läge till läge', loc='left', fontsize=11)
    fig.text(0.5, 0.005, 'Varje ruta: hur många rörelser (inte stopp) som börjar i radens läge och slutar i kolumnens. H3Pn och V3Pn är alla platser 1–7 tillsammans.', ha='center', fontsize=9, color=INK2)
    fig.tight_layout(rect=(0, 0.02, 1, 1))
    fig.savefig(path, dpi=95, bbox_inches='tight')
    plt.close(fig)


def rita(data_dir, out_dir):
    seg, phases, scene, source = load(data_dir)
    repo = os.path.abspath(os.path.join(data_dir, '..', '..'))
    os.makedirs(out_dir, exist_ok=True)
    timeline(seg, phases, source, os.path.join(out_dir, '01-tidslinje.png'))
    # The categories: how many, how long, per dealer and hand.
    rows = []
    order = ['GIV', 'GIV-EGET', 'DRA', 'TILL-SKON', 'HEM', 'PEKA', 'SVEP', 'KORT-IN', 'RATTA', 'SKON', 'ANNAT', 'VILA', 'VANTA', 'STOPP']
    for kat in order:
        for hand in ('höger', 'vänster'):
            cells = []
            for dl, dd in seg['dealrar'].items():
                c = dd['kategorier'].get(f'{kat} {hand}')
                cells += ['–', '–'] if c is None else [str(c['antal']), f"{sv(c['sekunder']['median'])} ({sv(c['sekunder']['p10'])}–{sv(c['sekunder']['p90'])})"]
            if any(x != '–' for x in cells):
                rows.append([kat, hand, WORDS[kat]] + cells)
    for kat in ('KAMERAN', 'BORDET', 'MOT-SKON', 'MOT-LADAN'):
        cells = []
        for dl, dd in seg['dealrar'].items():
            c = dd['kategorier'].get(f'{kat} huvud')
            cells += ['–', '–'] if c is None else [str(c['antal']), f"{sv(c['sekunder']['median'])} ({sv(c['sekunder']['p10'])}–{sv(c['sekunder']['p90'])})"]
        rows.append([kat, 'huvud', WORDS[kat]] + cells)
    table(os.path.join(out_dir, '02-kategorierna.png'), 'Kategorierna: hur många stycken och hur långa (sekunder, median och 10–90 %)',
          ['kategori', 'hand', 'vad', 'Danilo antal', 'Danilo sekunder', 'Frasse antal', 'Frasse sekunder'], rows, widths=[1.3, 0.9, 3.2, 1.1, 1.8, 1.1, 1.8],
          note='Stycken vid ett partis kant (början eller slut okänd) är inte räknade. GIV-EGET: kortet till dealern själv, oftast med handbyte där högern lägger det.')
    states_map(seg, scene, os.path.join(out_dir, '03-lagen.png'))
    rows = []
    for name, words in seg['lagen'].items():
        cells = []
        for dl, dd in seg['dealrar'].items():
            hits = {k: v for k, v in dd['lagen'].items() if k == name or (name.endswith('Pn') and re.fullmatch(name[:-1] + r'\d', k))}
            sec = sum(v['sekunder'] for v in hits.values())
            cells.append(f"{sum(v['stopp'] for v in hits.values())} stopp, {sv(sec, 0)} s" if hits else '–')
        rows.append([name, words] + cells)
    table(os.path.join(out_dir, '04-lagen-per-hand.png'), 'Lägena per hand: var händerna stannar, och hur länge sammanlagt', ['läge', 'vad', 'Danilo', 'Frasse'], rows, widths=[0.9, 7.2, 1.7, 1.7],
          note='Ett ankare är ett läge för varje hand: A1 = H1 + V1, A2.3 = H1 + V2.3, A3PnCm = H3Pn + V2.3 (eller V1S). H betyder höger hand och V vänster; höger och vänster är dealerns egna.')
    rows = []
    for dl, dd in seg['dealrar'].items():
        for k, v in list(dd['bada_stilla'].items())[:8]:
            rows.append([DOLL[dl], k, v['ganger'], sv(v['sekunder'], 1), sv(v['langsta_s'], 1)])
    table(os.path.join(out_dir, '05-bada-handerna-stilla.png'), 'Båda händerna stilla samtidigt: vilka par av lägen (en hel bild, ett ankare)', ['dealer', 'höger + vänster', 'gånger', 'sekunder sammanlagt', 'längsta (s)'], rows,
          widths=[1.2, 2.6, 1.0, 2.0, 1.5], note='De vanligaste paren är kandidaterna till ankare: där kan ett klipp börja och sluta med båda händerna stilla.')
    transitions(seg, os.path.join(out_dir, '06-overgangar.png'))
    # The hands out of step.
    rows = []
    for dl, dd in seg['dealrar'].items():
        o = dd['otakt']
        for k, v in o['efter_ett_kort_till_en_plats'].items():
            rows.append([DOLL[dl], 'efter att högern har lagt ett kort på en plats', k, v])
        for k, v in o['vanstern_nar_hogern_lagger'].items():
            rows.append([DOLL[dl], 'vänstern i ögonblicket då högern lägger kortet', k, v])
        h = o['hogern_hem_medan_vanstern_ror_sig']
        rows.append([DOLL[dl], 'högern på väg hem', 'vänstern rör sig samtidigt', f"{h['vanstern_ror_sig_samtidigt']} av {h['hem']}"])
        g = dd['for_ritade_rorelser']['giv_med_handbyte'].get('vansterns_nasta_grepp_efter_kortet_ligger_s')
        if g:
            rows.append([DOLL[dl], 'vänsterns nästa grepp i skon, räknat från att kortet ligger', 'sekunder, median (10–90 %)', f"{sv(g['median'])} ({sv(g['p10'])}–{sv(g['p90'])})"])
    table(os.path.join(out_dir, '07-handerna-i-otakt.png'), 'Händerna har var sin tidslinje: vänstern tar nästa kort medan högern lägger det förra', ['dealer', 'när', 'vad', 'antal'], rows,
          widths=[1.1, 4.4, 5.4, 1.6], note='"på väg (DRA)": vänstern drar redan nästa kort ur skon när högern lägger det förra. Ett klipp som tvingar båda händerna hem mellan korten saknar det.')
    drawn_table(seg, koreo(repo), os.path.join(out_dir, '08-for-den-ritade-given.png'))
    seat_table(seg, os.path.join(out_dir, '09-given-per-plats.png'))
    rows = []
    for r in seg['att_lyfta'][:18]:
        if r.get('finns_i_filmen') is False:
            rows.append([r['ordning'], r['kat'], f"C{r['kort']}" if r.get('kort') else '', 'saknas i filmen' + (f": plats {', '.join(map(str, r['saknas_for_platserna']))}" if r.get('saknas_for_platserna') else ''), '', '', ''])
            continue
        where = f"P{r['plats']}" if isinstance(r.get('plats'), int) else 'D' if r.get('plats') == 'D' else ''
        a, b = (r.get('klipp_fran_s') or r['fran_s']), (r.get('klipp_till_s') or r['till_s'])
        bridge = ', '.join(x for x in (f"före {sv(r['brygga_fore_s'])} s" if r.get('brygga_fore_s') else '', f"efter {sv(r['brygga_efter_s'])} s" if r.get('brygga_efter_s') else '') if x) or 'ingen'
        rows.append([r['ordning'], r['kat'], f"{where} C{r['kort']}" if r.get('kort') else where, f"{r['docka'].capitalize()}, {sv(a)}–{sv(b)} s (ruta {film_frame(a)}–{film_frame(b)})",
                     f"{r['fran_lage']} → {r['till_lage']}", sv(r['syns']), bridge])
    table(os.path.join(out_dir, '10-att-lyfta-harnast.png'), 'Att lyfta härnäst: det en hel kortrunda behöver, i ordning', ['nr', 'kategori', 'plats, kort', 'var i filmen', 'läge från → till', 'syns', 'brygga'], rows,
          widths=[0.5, 1.2, 1.1, 4.6, 2.6, 0.7, 2.0], note='Klippet för en giv börjar när vänstern tar kortet i skon och slutar när kortet ligger. Bryggan är dockans egen rörelse från lägets mitt till där stycket börjar (eller tillbaka), vid 0,5 m/s. Platser som redan har ett lyft står sist i listan i datafilen.')
    print('ritat i', out_dir)


def film_frame(t):
    return int(round(t * 60))


def drawn_table(seg, k, path):
    """The film's numbers for a deal with the handover, beside the drawn deal's (koreo-giv.ts KOREO)."""
    rows = []
    def cell(dl, key, d=2, scale=1.0):
        x = seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte'].get(key)
        return '–' if not x else f"{sv(x['median'] * scale, d)} ({sv(x['p10'] * scale, d)}–{sv(x['p90'] * scale, d)})"
    def hcell(dl, key):
        x = seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte']['hojd'].get(key)
        return '–' if not x else f"{sv(x['median'] * 100, 1)} cm ({sv(x['p10'] * 100, 1)}–{sv(x['p90'] * 100, 1)})"
    lines = [
        ('vänstern lämnar skon → händerna möts', 'skon_till_bytet_s', f"{sv(k['framme'])} s (kortet vid mötet), nypet {sv(k['nyp'])} s"),
        ('bytet: greppen närmare än 13 cm', 'bytet_s', f"{sv(k['slapper'] - k['framme'])} s (vid mötet → vänstern släpper)"),
        ('händerna möts → kortet ligger', 'bytet_till_platsen_s', f"{sv(k['ligger'] - k['nyp'])} s (från nypet)"),
        ('vänstern lämnar skon → kortet ligger (hela)', 'hela_s', f"{sv(k['ligger'])} s (Jakobs takt)"),
        ('vänstern tillbaka till skon efter bytet', 'vanstern_tillbaka_efter_bytet_s', f"{sv(k['vansterHemma'] - k['slapper'])} s"),
        ('högern ger sig av, räknat från vänstern', 'hogern_ger_sig_av_fore_vanstern_s', f"{sv(k['hogerFran'])} s efter"),
        ('högern kvar vid kortet', 'handen_kvar_vid_kortet_s', f"{sv(k['vilar'] - k['ligger'])} s (ligger → vilar)"),
        ('högern hem (när den går hem)', 'hem_s', f"{sv(k['hemma'] - k['ligger'])} s"),
        ('vänsterns nästa grepp efter att kortet ligger', 'vansterns_nasta_grepp_efter_kortet_ligger_s', f"{sv(k['hemma'] - k['ligger'])} s eller mer: nästa klipp börjar i A2.3"),
    ]
    for word, key, doll in lines:
        rows.append([word, cell('A', key), cell('B', key), doll])
    rows.append(['bytet i sidled, åt dealerns vänster', cell('A', 'bytet_sidled_m', 2) + ' m', cell('B', 'bytet_sidled_m', 2) + ' m', f"{sv(k['mote_x'])} m"])
    rows.append(['bytet framför axlarna (axlarna skattade)', cell('A', 'bytet_fran_axlarna_m', 2) + ' m', cell('B', 'bytet_fran_axlarna_m', 2) + ' m', f"{sv(k['mote_z'])} m"])
    rows.append(['bytet framför bordskanten', cell('A', 'bytet_fran_kanten_m', 2) + ' m', cell('B', 'bytet_fran_kanten_m', 2) + ' m', '–'])
    rows.append(['handlederna över filten vid bytet (lyften)', hcell('A', 'handlederna_vid_bytet_m'), hcell('B', 'handlederna_vid_bytet_m'), f"kortet rest {sv(k['rest'], 0)}°: övre kanten cirka {sv(8.89 * math.sin(math.radians(k['rest'])), 1)} cm, högern {sv(k['ovanfor'] * 100, 1)} cm över den"])
    rows.append(['greppen över filten vid bytet (lyften)', hcell('A', 'greppen_vid_bytet_m'), hcell('B', 'greppen_vid_bytet_m'), 'kortet plant på filten vid mötet, sedan rest'])
    rows.append(['högerns handled som högst på väg till platsen (lyften)', hcell('A', 'hogern_hogst_till_platsen_m'), hcell('B', 'hogern_hogst_till_platsen_m'), f"kortet bärs {sv(k['lyft'] * 100, 1)} cm över filten (B: 7,5 cm)"])
    for part, word in (('skon_till_bytet', 'blicken: skon → bytet'), ('bytet_till_platsen', 'blicken: bytet → platsen'), ('hem', 'blicken: hem')):
        cells = []
        for dl in ('A', 'B'):
            g = seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte']['blick_andel'][part]
            cells.append(', '.join(f"{SHORT[x]} {round(v * 100)} %" for x, v in list(g.items())[:3]))
        rows.append([word] + cells + [{'skon_till_bytet': 'mot händerna vid bytet', 'bytet_till_platsen': 'följer kortet till platsen (filmen likaså: se plats för plats)', 'hem': 'tillbaka mot kameran'}[part]])
    n = [seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte']['antal'] for dl in ('A', 'B')]
    table(path, 'Given med handbyte: filmens tal bredvid den ritade given (koreo-giv.ts)', ['del', f'Danilo ({n[0]} givar)', f'Frasse ({n[1]} givar)', 'den ritade given i dag'], rows,
          highlight=lambda i, j: j == 3 and i in (8, 12, 13),
          note='Median och 10–90 % över givarna där båda händerna syns. Höjderna kommer ur de sex lyfta givarna (SAM:s djup); en kamera ger ingen höjd. Axlarnas avstånd bakom kanten är skattat (Danilo 6,5 cm, Frasse 16 cm). Rosa: där den ritade given säger emot filmen. Hela givens 1,2 s är Jakobs takt (DOMAR.md), inte ett fel.')


def seat_table(seg, path):
    rows = []
    for dl, dd in seg['dealrar'].items():
        for seat, x in dd['for_ritade_rorelser']['giv_med_handbyte']['per_plats'].items():
            rows.append([DOLL[dl], f'P{seat}' if seat != 'D' else 'dealern', x['antal'], sv(x['hela_s']), sv(x['skon_till_bytet_s']), sv(x['bytet_till_platsen_s']), sv(x['hem_s']),
                         sv(x['bytet_sidled_m']), sv(x['bytet_fran_kanten_m']), sv(x['vansterns_nasta_grepp_efter_kortet_ligger_s']), WORDS.get(x.get('blicken_till_platsen'), '–')])
    table(path, 'Given med handbyte plats för plats (medianer)', ['dealer', 'plats', 'givar', 'hela', 'skon → byte', 'byte → plats', 'hem', 'byte i sidled', 'byte fr. kanten', 'nästa grepp', 'blicken mot platsen'], rows,
          widths=[1.0, 0.9, 0.7, 0.9, 1.4, 1.5, 0.9, 1.4, 1.6, 1.8, 1.8], note='Sekunder och meter. Hem är tomt där högern aldrig gick hem efter kortet: den gick direkt vidare till nästa. Byte i sidled: åt dealerns vänster från axlarnas mitt; byte fr. kanten: fram från bordskanten. Nästa grepp: vänsterns nästa grepp i skon, sekunder efter att kortet ligger (minus: före). Blicken mot platsen: huvudets vanligaste läge medan kortet förs ut; den följer kortet (P5–P7 ligger åt skon, P1–P2 åt lådan).')


def blad(data_dir, measures, film, out_dir):
    """Local only: the timeline, and a sheet per category with frames of the film (start, middle, end of a few pieces)."""
    import cv2
    seg, phases, scene, source = load(data_dir)
    os.makedirs(out_dir, exist_ok=True)
    timeline(seg, phases, source, os.path.join(out_dir, 'tidslinje.png'))
    crop = source['crop']
    files = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(measures, 'rorelse-*.json')))]
    cap = cv2.VideoCapture(film)

    def frame(t, hand):
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, full = cap.read()
        pic = full[crop['y']:crop['y'] + crop['height'], crop['x']:crop['x'] + crop['width']].copy()
        data = next((d for d in files if d['from'] <= t <= d['to']), None)
        if data:
            e = min(data['frames'], key=lambda e: abs(e['t'] - t))
            if e['pose']:
                for i, col, s in ((15, (255, 160, 0), 'vanster'), (16, (0, 220, 0), 'hoger')):
                    p = e['pose']['image'][i]
                    cv2.circle(pic, (int(p[0]), int(p[1])), 22 if s == hand else 12, col, 6 if s == hand else 3)
        pic = cv2.resize(pic, (480, 270), interpolation=cv2.INTER_AREA)
        cv2.putText(pic, f'{t:.2f}', (6, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2, cv2.LINE_AA)
        return pic
    kinds = ['GIV', 'GIV-EGET', 'DRA', 'TILL-SKON', 'HEM', 'PEKA', 'SVEP', 'KORT-IN', 'RATTA', 'SKON', 'ANNAT', 'VILA', 'VANTA']
    for kat in kinds:
        chosen = []
        for dl, dd in seg['stycken'].items():
            for hand in ('hoger', 'vanster'):
                ps = [p for p in dd[hand] if p['kat'] == kat and p['saker'] != 'kant']
                ps.sort(key=lambda p: -p['syns'])
                step = max(1, len(ps) // 3)
                chosen += [(dl, hand, p) for p in ps[::step][:3]]
        if not chosen:
            continue
        rows = []
        for dl, hand, p in chosen[:8]:
            a, b = p['fran_s'], p['till_s']
            tiles = [frame(t, hand) for t in (a, (a + b) / 2, b)]
            label = np.full((270, 300, 3), 30, np.uint8)
            for i, line in enumerate([p['id'], f"{DOLL[dl]}, {HAND[hand]}", f"{a:.2f}-{b:.2f} s", f"{p.get('fran_lage')} -> {p.get('till_lage')}",
                                      f"plats {p.get('plats')} kort {p.get('kort')}" if p.get('plats') else '', f"syns {p['syns']}"]):
                cv2.putText(label, line.replace('ö', 'o').replace('ä', 'a'), (8, 30 + 34 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (230, 230, 230), 1, cv2.LINE_AA)
            rows.append(np.hstack([label] + tiles))
        sheet = np.vstack(rows)
        cv2.imwrite(os.path.join(out_dir, f'blad-{kat.lower()}.jpg'), sheet, [cv2.IMWRITE_JPEG_QUALITY, 82])
        print(kat, len(rows))
    cap.release()
