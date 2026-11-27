# Pictures of the cutting in data/segment.json (verktyg/segment.py rita and blad).
# rita draws from the numbers alone, in plain words for someone who does not read code: the whole film per hand in
# seven colours, one card round enlarged so that the hands out of step show, the hands out of step per dealer, what the
# hands do, where they stand still, the states and the anchors, the commonest ways from place to place, the drawn deal
# beside the film's, the deal seat by seat, and what to lift next. No frame of the film is in them, so they may go into a
# proof. blad adds a sheet per category with frames of the film, under live-bj/rutor/ only (a real person; Git ignores it).
import os, re, json, glob, math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt                       # noqa: E402
from matplotlib.patches import Patch, Rectangle       # noqa: E402

DOLL = {'A': 'Danilo', 'B': 'Frasse'}
HAND = {'hoger': 'högern', 'vanster': 'vänstern'}
# Seven colours for what the hands do; the categories that belong together share one (categorical hues in a fixed order,
# the waits gray, what is not copied dark).
GROUPS = [
    ('ger kort', '#257de0', ('GIV', 'GIV-EGET', 'RATTA')),
    ('hämtar kort ur skon', '#f47230', ('DRA', 'TILL-SKON')),
    ('går hem', '#f2a600', ('HEM', 'BYT-VILA')),
    ('tar in korten', '#6a4ce2', ('KORT-IN',)),
    ('pekar eller sveper', '#008a17', ('PEKA', 'SVEP')),
    ('vilar och väntar', '#d9d9d9', ('VILA', 'VANTA', 'STOPP')),
    ('annat, härmas inte', '#3a3a3a', ('SKON', 'ANNAT')),
]
COLOUR = {k: c for _, c, ks in GROUPS for k in ks}
WORDS = {'GIV': 'lägger ett kort på en plats', 'GIV-EGET': 'lägger dealerns eget kort', 'RATTA': 'rättar till ett kort', 'DRA': 'drar kortet ur skon fram till högern',
         'TILL-SKON': 'går till skon', 'HEM': 'går hem till sin vila', 'BYT-VILA': 'byter viloställe', 'KORT-IN': 'tar in korten till lådan',
         'PEKA': 'pekar mot en plats', 'SVEP': 'sveper över bordet', 'VILA': 'vilar', 'VANTA': 'väntar med små rörelser', 'STOPP': 'stannar kort i arbetet',
         'SKON': 'sköter skon', 'ANNAT': 'gör något annat (till exempel handen till ansiktet)'}
SIGNWORD = {'place your bets': 'insatser', 'last bets': 'insatser', 'bets closed': 'insatser', 'bets accepted': 'insatser', 'dealing': 'giv', 'make your decision': 'spelaren väljer',
            'dealer wins': 'rundan klar', 'none': 'rundan klar'}
INK, INK2 = '#1f1f1f', '#6b6b6b'
plt.rcParams.update({'font.size': 10, 'text.color': INK, 'axes.labelcolor': INK, 'xtick.color': INK2, 'ytick.color': INK2, 'axes.edgecolor': '#c8c8c8', 'figure.facecolor': 'white'})


def load(data_dir):
    rd = lambda n: json.load(open(os.path.join(data_dir, n), encoding='utf-8'))
    return rd('segment.json'), rd('faser.json'), rd('scen.json'), rd('kalla.json')


def sv(x, d=2):
    """A number the Swedish way: a decimal comma."""
    if x is None:
        return '–'
    if isinstance(x, (int, np.integer)):
        return str(x)
    return f'{x:.{d}f}'.replace('.', ',')


def mmss(t, d=1):
    """Seconds of the film as minutes and seconds, as a player shows them: 12:49,1."""
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:0{3 + d if d else 2}.{d}f}".replace('.', ',')


def lage(code, small=True):
    """A hand's state in words, the code after it in brackets (the motion schema uses the code)."""
    if not code:
        return 'okänt'
    hand = 'högern' if code[0] == 'H' else 'vänstern'
    rest = code[1:]
    m = re.fullmatch(r'3P(\d|n)', rest)
    if m:
        w = f"{hand} vid plats {m.group(1) if m.group(1) != 'n' else '1–7'}"
    else:
        w = {'1': f'{hand} vilar framför sig', '1S': f'{hand} vilar ute vid sidan' if code[0] == 'H' else f'{hand} vilar mot skon', '2M': f'{hand} vid mötet',
             '2': f'{hand} vid skon', '2.3': f'{hand} vid skon', '3D': f'{hand} vid sina egna kort', '4': f'{hand} vid lådan', '0': f'{hand} uppe vid kroppen'}.get(rest, code)
    return f'{w} ({code})' if small else w


def par(text):
    """'H1 + V1S' in words."""
    a, b = text.split(' + ')
    return f"{lage(a, False)}, {lage(b, False)} ({text})"


def kort(plats, kortnr):
    if plats == 'D':
        return f"dealerns {('första', 'andra', 'tredje', 'fjärde', 'femte')[kortnr - 1] if kortnr and kortnr <= 5 else ''} kort".replace('  ', ' ')
    nr = {1: 'första', 2: 'andra', 3: 'tredje', 4: 'fjärde'}.get(kortnr, '')
    return f"plats {plats}{', ' + nr + ' kortet' if nr else ''}"


def caption(fig, text, y=0.0, width=150):
    lines, line = [], ''
    for word in text.split():
        if len(line) + len(word) + 1 > width:
            lines.append(line)
            line = word
        else:
            line = f'{line} {word}'.strip()
    lines.append(line)
    fig.text(0.01, y, '\n'.join(lines), fontsize=10, color=INK, va='top', ha='left')


def table(path, title, columns, rows, note=None, highlight=None):
    """A table as a picture: the header in bold, every other row shaded, the sentence under it."""
    text = [[str(c) for c in r] for r in rows]
    widths = [max([len(columns[j]) * 1.2] + [len(r[j]) for r in text]) * 0.098 + 0.35 for j in range(len(columns))]
    w = max(sum(widths), 9.0)
    fig, ax = plt.subplots(figsize=(w, 0.27 * (len(rows) + 1) + 0.6))
    ax.axis('off')
    t = ax.table(cellText=text, colLabels=columns, loc='upper left', cellLoc='left', colLoc='left', colWidths=[x / w for x in widths])
    t.auto_set_font_size(False)
    t.set_fontsize(9.5)
    t.scale(1, 1.4)
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
    ax.set_title(title, loc='left', fontsize=14, color=INK, pad=12)
    if note:
        fig.canvas.draw()
        box = t.get_window_extent().transformed(fig.transFigure.inverted())
        chars = max(60, int(w / 0.088))
        lines, line = [], ''
        for word in note.split():
            if len(line) + len(word) + 1 > chars:
                lines.append(line)
                line = word
            else:
                line = f'{line} {word}'.strip()
        lines.append(line)
        fig.text(box.x0, box.y0 - 0.03, '\n'.join(lines), fontsize=10, color=INK, va='top')
    fig.savefig(path, dpi=110, bbox_inches='tight')
    plt.close(fig)


def legend(fig, y=1.0):
    fig.legend(handles=[Patch(facecolor=c, edgecolor='#bdbdbd', label=w) for w, c, _ in GROUPS], loc='upper center', ncol=7, fontsize=10, frameon=False, bbox_to_anchor=(0.5, y))


def tracks(ax, seg, a, b, phases, rows=(('hoger', 1.1), ('vanster', 0.0))):
    """The hands between two seconds, a row each, and the game's sign as words over them."""
    for dl, dd in seg['stycken'].items():
        for key, y in rows:
            for p in dd[key]:
                if p['till_s'] < a or p['fran_s'] > b:
                    continue
                ax.add_patch(Rectangle((p['fran_s'], y), max(p['till_s'] - p['fran_s'], 0.05), 0.9, facecolor=COLOUR.get(p['kat'], '#ffffff'), edgecolor='white', lw=0.5, zorder=2))
    words = []   # the game's sign in words, the spans with the same word one after another joined
    for s in sorted(phases['spans'], key=lambda s: s['from']):
        if s['sign'] not in SIGNWORD:
            continue
        if words and words[-1][2] == SIGNWORD[s['sign']] and s['from'] - words[-1][1] < 1.0:
            words[-1][1] = s['to']
        else:
            words.append([s['from'], s['to'], SIGNWORD[s['sign']]])
    for x0, x1, word in words:
        if x1 > a and x0 < b and x1 - x0 >= 1.0:
            x0, x1 = max(x0, a), min(x1, b)
            ax.plot([x0 + 0.1, x1 - 0.1], [2.2, 2.2], color='#9e9e9e', lw=1.2)
            if x1 - x0 > 2.5:
                ax.text((x0 + x1) / 2, 2.35, word, ha='center', va='bottom', fontsize=8.5, color=INK2)


def timeline(seg, phases, source, path, per_row=120):
    """The whole film, a row per two minutes: the right hand above the left, in seven colours."""
    start, end = source['runs'][0]['from'], source['runs'][-1]['to']
    rows = int(math.ceil((end - start) / per_row))
    fig, axes = plt.subplots(rows, 1, figsize=(20, 1.05 * rows + 1.6))
    for r, ax in enumerate(axes):
        a, b = start + r * per_row, start + (r + 1) * per_row
        ax.set_xlim(a, b)
        ax.set_ylim(-0.1, 2.9)
        ax.add_patch(Rectangle((a, -0.1), b - a, 2.1, color='#f3f3f3', zorder=0, lw=0))   # not measured: gray; measured: white
        for run in source['runs']:
            if run['to'] > a and run['from'] < b:
                ax.add_patch(Rectangle((run['from'], -0.1), run['to'] - run['from'], 2.1, color='white', zorder=0, lw=0))
        tracks(ax, seg, a, b, phases)
        ax.axvspan(474, 500, ymax=0.7, color='#f3f3f3', zorder=3, lw=0)
        if a < 487 < b:
            ax.text(487, 1.0, 'dealerbyte', ha='center', va='center', fontsize=8, color=INK2, rotation=90, zorder=4)
        who = 'Danilo' if b <= 474 else 'Frasse' if a >= 500 else 'Danilo, sedan Frasse'
        ax.set_yticks([1.55, 0.45])
        ax.set_yticklabels([f'{who}: högern', 'vänstern'], fontsize=9)
        ax.tick_params(axis='y', length=0)
        ticks = np.arange(math.ceil(a / 30) * 30, b + 0.1, 30)
        ax.set_xticks(ticks)
        ax.set_xticklabels([mmss(x, 0) for x in ticks], fontsize=8.5)
        for side in ('top', 'right', 'left'):
            ax.spines[side].set_visible(False)
    legend(fig, 1.0)
    fig.suptitle('Hela filmen: vad dealerns två händer gör, minut för minut', x=0.01, ha='left', y=1.035, fontsize=15)
    fig.tight_layout(rect=(0, 0.035, 1, 0.965))
    caption(fig, 'Varje rad är två minuter av filmen (minuter:sekunder). Den övre randen är dealerns högra hand, den undre hans vänstra; ovanför står vad spelet visar. '
            'Blått där en hand lägger kort, orange där vänstern hämtar dem ur skon. Varför det spelar roll: under givarna ligger orange och blått omlott, alltså arbetar '
            'händerna samtidigt och inte en i taget. Grått: delar av filmen som inte är mätta.', y=0.03, width=190)
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def one_round(seg, phases, path, rounds=(('A', 136.5, 150.5), ('B', 744.5, 758.5))):
    """One card round per dealer, enlarged, with the cards that land marked: the hands out of step can be seen."""
    fig, axes = plt.subplots(len(rounds), 1, figsize=(18, 2.6 * len(rounds) + 1.4))
    for ax, (dl, a, b) in zip(axes, rounds):
        ax.set_xlim(a, b)
        ax.set_ylim(-0.1, 2.9)
        tracks(ax, {'stycken': {dl: seg['stycken'][dl]}}, a, b, phases)
        for p in seg['stycken'][dl]['hoger'] + seg['stycken'][dl]['vanster']:
            if p['kat'] in ('GIV', 'GIV-EGET') and a <= p['till_s'] <= b:
                y = 2.0 if p['hand'] == 'H' else 0.9
                where = 'dealern' if p.get('plats') == 'D' else f"plats {p.get('plats')}"
                ax.annotate(where, (p['till_s'], y), xytext=(0, 6), textcoords='offset points', ha='center', fontsize=8, color=INK,
                            arrowprops=dict(arrowstyle='-', color='#9e9e9e', lw=0.8))
        ax.set_yticks([1.55, 0.45])
        ax.set_yticklabels(['högern', 'vänstern'], fontsize=10)
        ax.tick_params(axis='y', length=0)
        ticks = np.arange(math.ceil(a), b + 0.01, 1.0)
        ax.set_xticks(ticks)
        ax.set_xticklabels([mmss(x, 0) if i % 2 == 0 else '' for i, x in enumerate(ticks)], fontsize=8.5)
        for side in ('top', 'right', 'left'):
            ax.spines[side].set_visible(False)
        ax.set_title(f"{DOLL[dl]}: en kortrunda, {mmss(a, 0)}–{mmss(b, 0)} i filmen", loc='left', fontsize=12)
    legend(fig, 1.0)
    fig.tight_layout(rect=(0, 0.06, 1, 0.94))
    caption(fig, 'Förstorat: en kortrunda hos var och en. Vid varje blå bit lägger högern ett kort, på den plats som står ovanför. Varför det spelar roll: den orange biten '
            'under (vänstern hämtar nästa kort ur skon) börjar innan den blå är slut, och högern går sällan hem mellan korten, särskilt hos Frasse. Våra klipp låter i dag '
            'båda händerna gå hem efter varje kort.', y=0.05, width=170)
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def out_of_step(seg, path):
    """The hands out of step, the two dealers each on their own, counted over the cards that are followed by a new one."""
    fig, axes = plt.subplots(2, 2, figsize=(16, 6.6))
    first = [('kedja', 'högern går direkt till nästa kort', '#257de0'), ('otakt', 'högern går hem, men vänstern tar nästa kort innan den är framme', '#f47230'),
             ('i takt', 'högern går hem och vänstern väntar', '#f2a600')]
    second = [('på väg (DRA)', 'drar redan nästa kort ur skon', '#f47230'), ('V2.3', 'står vid skon med nästa kort', '#ffb38a'), ('vilar', 'vilar', '#d9d9d9'), ('annat', 'gör något annat', '#9e9e9e')]
    grips = []

    def bars(ax, vals, kinds, title):
        total = sum(vals)
        ax.barh(range(len(vals)), vals, color=[c for _, _, c in kinds], height=0.6)
        for i, v in enumerate(vals):
            ax.text(v + total * 0.01, i, f'{v} av {total}', va='center', fontsize=10)
        ax.set_yticks(range(len(vals)))
        ax.set_yticklabels([w for _, w, _ in kinds], fontsize=10)
        ax.invert_yaxis()
        ax.set_xlim(0, total * 1.25)
        ax.set_xticks([])
        for side in ('top', 'right', 'bottom'):
            ax.spines[side].set_visible(False)
        ax.set_title(title, loc='left', fontsize=12)
    for col, dl in enumerate(('A', 'B')):
        o = seg['dealrar'][dl]['otakt']
        after = o['efter_ett_kort_till_en_plats']
        bars(axes[0][col], [sum(v for k, v in after.items() if k.startswith(key)) for key, _, _ in first], first, f'{DOLL[dl]}: vad högern gör efter kortet')
        at = o['vanstern_nar_hogern_lagger']
        vals2 = [at.get('på väg (DRA)', 0), at.get('V2.3', 0), sum(v for k, v in at.items() if k in ('V1', 'V1S')), sum(v for k, v in at.items() if k not in ('på väg (DRA)', 'V2.3', 'V1', 'V1S'))]
        bars(axes[1][col], vals2, second, f'{DOLL[dl]}: var vänstern är när högern lägger kortet')
        g = seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte'].get('vansterns_nasta_grepp_efter_kortet_ligger_s') or {}
        grips.append(f"{DOLL[dl]} {sv(g.get('median'), 1)} s")
    fig.suptitle('Händerna har var sin tidslinje: Frasse nästan alltid, Danilo oftast', x=0.01, ha='left', fontsize=15, y=1.03)
    fig.text(0.01, 0.955, 'Räknat över de kort som högern lägger hos en spelare och som följs av ett nytt kort (rundans sista kort är inte med).', fontsize=10.5, color=INK, ha='left', va='bottom')
    fig.tight_layout(rect=(0, 0.08, 1, 0.94))
    caption(fig, 'Överst: vad högern gör efter att den lagt kortet. Underst: var vänstern är i samma ögonblick; dess nästa grepp i skon kommer, räknat från att kortet '
            f'ligger: {" och ".join(grips)}. Varför det spelar roll: Frasse går direkt vidare nästan varje gång, Danilo oftast men går hem oftare, och det hör till '
            'deras stil. Ett klipp som tvingar båda händerna hem efter varje kort ser därför stelt ut för båda.', y=0.06, width=180)
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def states_map(seg, scene, path):
    """Where each hand stands still, drawn as the camera sees the table: the dealer at the top, the players at the bottom,
    seat 1 to the picture's left and the shoe to its right (numbers only, on our own drawing of the live table)."""
    fig, axes = plt.subplots(1, 2, figsize=(17, 7.8))
    outline = np.array(scene['table']['feltOutlineM'])
    short = {'H1': 'högern vilar', 'H1S': 'högern vid sidan', 'H2M': 'högern vid mötet', 'H2': 'högern vid skon', 'H3D': 'högern vid egna kort', 'H4': 'högern vid lådan',
             'V1': 'vänstern vilar', 'V1S': 'vänstern mot skon', 'V2.3': 'vänstern vid skon', 'V3D': 'vänstern vid egna kort', 'V4': 'vänstern vid lådan'}
    for ax, (dl, dd) in zip(axes, seg['dealrar'].items()):
        ax.fill(outline[:, 0], outline[:, 1], color='#f3f3f3', zorder=0)
        ax.plot(*np.vstack([outline, outline[:1]]).T, color='#c8c8c8', lw=1)
        for name, key in (('skon', 'sko'), ('lådan', 'slaskbox')):
            foot = np.array(scene['things'][key]['footMetres'])
            ax.fill(foot[:, 0], foot[:, 1], color='#d9d9d9', zorder=1)
            ax.text(foot[:, 0].mean(), foot[:, 1].mean() - 0.09, name, ha='center', va='center', fontsize=9, color=INK2)
        for n, (x, y) in enumerate(scene['seatsUiM'], 1):
            ax.text(x, y - 0.04, f'plats {n}', ha='center', va='center', fontsize=9, color=INK2)
        ax.plot(*scene['places']['dealer']['m'], marker='s', color='#bdbdbd', ms=8)
        edge = scene['table']['dealerEdgeM']
        ax.axhline(edge, color='#c8c8c8', lw=1, ls='--')
        ax.text(-0.3, edge + 0.015, 'bordskanten; dealern sitter bakom den', ha='center', va='bottom', fontsize=8.5, color=INK2)
        placed = []   # labels pushed apart where they would lie on each other
        spots = sorted(((name, st) for name, st in dd['lagen'].items() if 0.75 <= st['mitt_m'][1] <= 1.95 and st['sekunder'] >= 1.5), key=lambda kv: -kv[1]['sekunder'])
        for name, st in spots:
            x, y = st['mitt_m']
            col = '#257de0' if name.startswith('H') else '#f47230'
            ax.scatter([x], [y], s=40 + 8 * st['sekunder'], color=col, alpha=0.35, edgecolor=col, zorder=3)
            label = short.get(name) or (f"{'högern' if name[0] == 'H' else 'vänstern'} vid plats {name[3:]}" if name[1:3] == '3P' else name)
            ly, step = y, 0
            while any(abs(ly - py) < 0.035 and abs(x - px) < 0.3 for px, py in placed):
                step += 1
                ly = y + (0.04 * ((step + 1) // 2)) * (1 if step % 2 else -1)
            placed.append((x, ly))
            if ly != y:
                ax.plot([x, x], [y, ly], color='#9e9e9e', lw=0.6, zorder=3)
            ax.text(x, ly, label, ha='center', va='center', fontsize=8, color=INK, zorder=4, bbox=dict(boxstyle='round,pad=0.15', fc='white', ec='none', alpha=0.7))
        ax.set_xlim(-0.8, 0.85)
        ax.set_ylim(0.75, 1.85)   # the camera's view: near the camera (the players) at the bottom, the dealer at the top
        ax.set_aspect('equal')
        ax.set_xticks([])
        ax.set_yticks([])
        for side in ('top', 'right', 'left', 'bottom'):
            ax.spines[side].set_visible(False)
        ax.set_title(f'{DOLL[dl]}: där händerna står stilla', loc='left', fontsize=12)
    fig.suptitle('Var händerna stannar, sett från spelarnas sida, som i filmen (dealern överst, plats 1 till vänster, skon till höger)', x=0.01, ha='left', fontsize=14, y=1.0)
    fig.tight_layout(rect=(0, 0.11, 1, 0.96))
    fig.legend(handles=[Patch(color='#257de0', alpha=0.5, label='dealerns högra hand'), Patch(color='#f47230', alpha=0.5, label='dealerns vänstra hand')], loc='lower center',
               ncol=2, frameon=False, fontsize=10, bbox_to_anchor=(0.5, 0.075))
    caption(fig, 'Varje ring är ett ställe där en hand brukar stå stilla; ju större ring, desto längre tid står den där. Dealerns högra hand är till vänster i bilden, '
            'eftersom han sitter vänd mot oss. Varför det spelar roll: de här ställena är dockans utgångslägen, där ett klipp kan börja och sluta. En hand som är lyft, '
            'vid skon eller vid lådan, ritas lite närmare dealern än den är. Kort tid (under 1,5 s) är inte ritad.', y=0.06, width=180)
    fig.savefig(path, dpi=100, bbox_inches='tight')
    plt.close(fig)


def koreo(repo):
    """The drawn deal's own numbers, read from the code (koreo-giv.ts, KOREO), so that they have one source."""
    text = open(os.path.join(repo, 'blackjack-dealer', 'dealer3d', 'src', 'koreo-giv.ts'), encoding='utf-8').read()
    body = text[text.index('export const KOREO = {'):]
    body = body[:body.index('};')]
    num = lambda k: float(re.search(rf'\b{k}: *(-?[\d.]+)', body).group(1))
    mote = re.search(r'mote: *\{x: *([\d.]+), *z: *([\d.]+)\}', body)
    fps = 30
    return {'framme': num('framme') / fps, 'nyp': num('nyp') / fps, 'slapper': num('vansterSlapper') / fps, 'vansterHemma': num('vansterHemma') / fps, 'ligger': num('ligger') / fps,
            'hemma': num('hemma') / fps, 'vilar': num('vilar') / fps, 'hogerFran': num('hogerFran') / fps, 'mote_x': float(mote.group(1)), 'mote_z': float(mote.group(2)),
            'lyft': num('lyft'), 'rest': num('rest'), 'ovanfor': num('ovanfor')}


def drawn_table(seg, k, path):
    """The film's numbers for a card given with the handover, beside the drawn deal's."""
    deal = lambda dl: seg['dealrar'][dl]['for_ritade_rorelser']['giv_med_handbyte']
    def cell(dl, key, scale=1.0, unit='s'):
        x = deal(dl).get(key)
        d = 0 if unit == 'cm' else 2
        return '–' if not x else f"{sv(x['median'] * scale, d)} {unit} (oftast {sv(x['p10'] * scale, d)}–{sv(x['p90'] * scale, d)})"
    def hcell(dl, key):
        x = deal(dl)['hojd'].get(key)
        return '–' if not x else f"{sv(x['median'] * 100, 1)} cm"
    rows = [
        ['från att vänstern lämnar skon tills händerna möts', cell('A', 'skon_till_bytet_s'), cell('B', 'skon_till_bytet_s'), f"{sv(k['framme'])} s, högern griper {sv(k['nyp'])} s"],
        ['hur länge händerna håller kortet samtidigt', cell('A', 'bytet_s'), cell('B', 'bytet_s'), f"{sv(k['slapper'] - k['framme'])} s"],
        ['från mötet tills kortet ligger på platsen', cell('A', 'bytet_till_platsen_s'), cell('B', 'bytet_till_platsen_s'), f"{sv(k['ligger'] - k['nyp'])} s"],
        ['hela kortet, från skon till platsen', cell('A', 'hela_s'), cell('B', 'hela_s'), f"{sv(k['ligger'])} s (Jakobs takt)"],
        ['vänstern tillbaka till skon efter mötet', cell('A', 'vanstern_tillbaka_efter_bytet_s'), cell('B', 'vanstern_tillbaka_efter_bytet_s'), f"{sv(k['vansterHemma'] - k['slapper'])} s"],
        ['högern hem efter kortet, när den går hem', cell('A', 'hem_s'), cell('B', 'hem_s'), f"{sv(k['hemma'] - k['ligger'])} s, varje gång"],
        ['vänsterns nästa grepp, räknat från att kortet ligger', cell('A', 'vansterns_nasta_grepp_efter_kortet_ligger_s'), cell('B', 'vansterns_nasta_grepp_efter_kortet_ligger_s'),
         f"{sv(k['hemma'] - k['ligger'])} s eller mer (nästa klipp)"],
        ['var händerna möts: åt dealerns vänster', cell('A', 'bytet_sidled_m', 100, 'cm'), cell('B', 'bytet_sidled_m', 100, 'cm'), f"{sv(k['mote_x'] * 100, 0)} cm"],
        ['var händerna möts: framför bordskanten', cell('A', 'bytet_fran_kanten_m', 100, 'cm'), cell('B', 'bytet_fran_kanten_m', 100, 'cm'), '–'],
        ['handlederna över filten när händerna möts', hcell('A', 'handlederna_vid_bytet_m'), hcell('B', 'handlederna_vid_bytet_m'),
         f"kortet rest på högkant ({sv(k['rest'], 0)}°), högern {sv(k['ovanfor'] * 100, 1)} cm ovanför: cirka {sv(8.89 * math.sin(math.radians(k['rest'])) + k['ovanfor'] * 100, 0)} cm upp"],
        ['fingrarna över filten när händerna möts', hcell('A', 'greppen_vid_bytet_m'), hcell('B', 'greppen_vid_bytet_m'), 'kortet plant på filten, sedan rest på högkant'],
        ['högra handleden som högst på väg till platsen', hcell('A', 'hogern_hogst_till_platsen_m'), hcell('B', 'hogern_hogst_till_platsen_m'), f"kortet bärs {sv(k['lyft'] * 100, 0)} cm upp (B: 7,5 cm)"],
        ['blicken medan kortet förs ut', 'följer kortet mot platsen', 'följer kortet mot platsen', 'följer kortet till platsen'],
    ]
    n = [deal(dl)['antal'] for dl in ('A', 'B')]
    table(path, 'Ett kort med handbyte: filmen bredvid vår ritade giv', ['del av rörelsen', f'Danilo ({n[0]} kort)', f'Frasse ({n[1]} kort)', 'vår ritade giv i dag'], rows,
          highlight=lambda i, j: j == 3 and i in (6, 9, 10),
          note='Talen är det vanliga (mittvärdet) och spannet där de flesta ligger, ur alla kort där båda händerna syns. Höjderna kommer bara ur de sex kort som lyfts '
               'i 3D; en vanlig film ger ingen höjd. Varför det spelar roll: rosa rader är där vår ritade giv gör något annat än dealrarna. I filmen reses kortet inte '
               'på högkant, händerna möts lågt över filten, och vänstern griper nästa kort direkt. Hela kortet på 1,2 s är din takt, inte ett fel.')


def seat_table(seg, path):
    rows = []
    for dl, dd in seg['dealrar'].items():
        for seat, x in dd['for_ritade_rorelser']['giv_med_handbyte']['per_plats'].items():
            where = 'dealerns egen plats' if seat == 'D' else f'plats {seat}'
            look = {'MOT-SKON': 'mot skon', 'MOT-LADAN': 'mot lådan', 'BORDET': 'ned på bordet', 'KAMERAN': 'i kameran'}.get(x.get('blicken_till_platsen'), '–')
            rows.append([DOLL[dl], where, x['antal'], f"{sv(x['hela_s'])} s", f"{sv(x['skon_till_bytet_s'])} s", f"{sv(x['bytet_till_platsen_s'])} s",
                         'går inte hem' if x['hem_s'] is None else f"{sv(x['hem_s'])} s", f"{sv(x['bytet_sidled_m'] * 100 if x['bytet_sidled_m'] is not None else None, 0)} cm",
                         f"{sv(x['vansterns_nasta_grepp_efter_kortet_ligger_s'])} s", look])
    table(path, 'Kortet plats för plats', ['dealer', 'till', 'antal kort', 'hela kortet', 'skon till mötet', 'mötet till platsen', 'högern hem', 'mötet åt vänster',
          'vänsterns nästa grepp', 'blicken'], rows,
          note='Det vanliga värdet för varje plats. "Går inte hem": högern gick direkt till nästa kort efter varje kort dit. Vänsterns nästa grepp räknas från att kortet '
               'ligger (minus betyder före). Varför det spelar roll: given är nästan lika snabb till alla platser; skillnaden ligger i var händerna möts och vart blicken går, '
               'och det är det en ritad giv till en ny plats behöver.')


def rita(data_dir, out_dir):
    seg, phases, scene, source = load(data_dir)
    repo = os.path.abspath(os.path.join(data_dir, '..', '..'))
    os.makedirs(out_dir, exist_ok=True)
    for old in glob.glob(os.path.join(out_dir, '*.png')):   # the pictures are made anew; names may have changed
        os.remove(old)
    timeline(seg, phases, source, os.path.join(out_dir, '01-hela-filmen.png'))
    one_round(seg, phases, os.path.join(out_dir, '02-en-kortrunda.png'))
    out_of_step(seg, os.path.join(out_dir, '03-handerna-i-otakt.png'))
    # What the hands do.
    order = ['GIV', 'GIV-EGET', 'RATTA', 'DRA', 'TILL-SKON', 'HEM', 'BYT-VILA', 'KORT-IN', 'SVEP', 'PEKA', 'VILA', 'VANTA', 'STOPP', 'SKON', 'ANNAT']
    rows = []
    for kat in order:
        for hand in ('höger', 'vänster'):
            cells = []
            for dl in ('A', 'B'):
                c = seg['dealrar'][dl]['kategorier'].get(f'{kat} {hand}')
                cells += ['–', ''] if c is None else [str(c['antal']), f"{sv(c['sekunder']['median'], 1)} s (oftast {sv(c['sekunder']['p10'], 1)}–{sv(c['sekunder']['p90'], 1)})"]
            if any(x not in ('–', '') for x in cells):
                group = next(w for w, _, ks in GROUPS if kat in ks)
                rows.append([group, f"{'högern' if hand == 'höger' else 'vänstern'} {WORDS[kat]} ({kat})"] + cells)
    table(os.path.join(out_dir, '04-vad-handerna-gor.png'), 'Vad händerna gör, och hur ofta', ['färg i tidslinjen', 'vad', 'Danilo, gånger', 'Danilo, hur länge',
          'Frasse, gånger', 'Frasse, hur länge'], rows,
          note='Hur länge: det vanliga, och spannet där de flesta ligger. Ordet inom parentes är namnet i rörelseschemat. Varför det spelar roll: det här är listan över '
               'rörelser som dockan behöver, och hur vanliga de är. Det som inte härmas (sköter skon, annat) väntar dockan bort.')
    states_map(seg, scene, os.path.join(out_dir, '05-var-handerna-star.png'))
    rows = []
    for name, words in seg['lagen'].items():
        if name in ('V4',):
            continue
        cells = []
        for dl in ('A', 'B'):
            dd = seg['dealrar'][dl]
            hits = {k: v for k, v in dd['lagen'].items() if k == name or (name.endswith('Pn') and re.fullmatch(name[:-1] + r'\d', k))}
            sec = sum(v['sekunder'] for v in hits.values())
            cells.append(f"{sv(sec, 0)} s" if hits else '–')
        if any(c != '–' for c in cells):
            rows.append([lage(name)] + cells)
    table(os.path.join(out_dir, '06-handernas-lagen.png'), 'Handens utgångslägen, och hur länge händerna står i dem', ['läget', 'Danilo, sammanlagt', 'Frasse, sammanlagt'], rows,
          note='Ett utgångsläge är ett ställe för en hand. En hel bild som ett klipp börjar och slutar i (ett ankare) är ett läge för varje hand: vila (A1) är högern och '
               'vänstern som vilar framför sig, redo vid skon (A2.3) är högern som vilar och vänstern vid skon. Varför det spelar roll: när varje hand har sitt eget läge '
               'kan vänstern börja nästa kort medan högern går hem.')
    rows = []
    for dl in ('A', 'B'):
        for k2, v in list(seg['dealrar'][dl]['bada_stilla'].items())[:6]:
            rows.append([DOLL[dl], par(k2), f"{v['ganger']} gånger", f"{sv(v['sekunder'], 0)} s"])
    table(os.path.join(out_dir, '07-bada-handerna-stilla.png'), 'När båda händerna står stilla samtidigt', ['dealer', 'högern och vänstern', 'hur ofta', 'sammanlagt'], rows,
          note='De sex vanligaste sätten för varje dealer. Varför det spelar roll: de vanligaste är de bästa ankarena, eftersom dealern själv stannar där. Hos båda är '
               '"högern vilar framför sig, vänstern vilar mot skon" den vanligaste väntan mitt i rundan, och "högern ute vid sidan" vilan medan insatserna läggs.')
    rows = []
    for dl in ('A', 'B'):
        for hand in ('H', 'V'):
            for k2, v in list(seg['dealrar'][dl]['overgangar'][hand].items())[:5]:
                a, b = k2.split(' -> ')
                rows.append([DOLL[dl], 'högern' if hand == 'H' else 'vänstern', f"{lage(a, False).split(' ', 1)[1]}  →  {lage(b, False).split(' ', 1)[1]}", v])
    table(os.path.join(out_dir, '08-vanligaste-vagarna.png'), 'De vanligaste vägarna för varje hand', ['dealer', 'hand', 'från  →  till', 'gånger'], rows,
          note='De fem vanligaste per hand och dealer. "Vid skon → vid skon" är vänsterns tur med ett kort: ur skon, fram till högern, och tillbaka till skon. Varför det '
               'spelar roll: varje väg är ett klipp dockan behöver, och de vanligaste behövs först.')
    drawn_table(seg, koreo(repo), os.path.join(out_dir, '09-kortet-bredvid-var-giv.png'))
    seat_table(seg, os.path.join(out_dir, '10-kortet-plats-for-plats.png'))
    rows = []
    for r in seg['att_lyfta'][:16]:
        what = {'GIV': 'kort till en spelare', 'GIV-EGET': 'kort till dealern', 'VANTA': 'väntan, båda händerna stilla', 'PEKA': 'peka mot en plats', 'SVEP': 'svep över bordet',
                'KORT-IN': 'korten in i lådan', 'HEM': 'högern hem', 'TILL-SKON': 'vänstern till skon'}.get(r['kat'], r['kat'])
        if r.get('finns_i_filmen') is False:
            miss = f"plats {', '.join(map(str, r['saknas_for_platserna']))}" if r.get('saknas_for_platserna') else ''
            rows.append([r['ordning'], what, kort(r['saknas_for_platserna'][0], r.get('kort')) if r.get('saknas_for_platserna') else '', 'finns inte i filmen' + (f' ({miss})' if miss else ''), '', '', ''])
            continue
        a, b = (r.get('klipp_fran_s') or r['fran_s']), (r.get('klipp_till_s') or r['till_s'])
        own = ', '.join(x for x in (f"före {sv(r['brygga_fore_s'], 1)} s" if r.get('brygga_fore_s') else '', f"efter {sv(r['brygga_efter_s'], 1)} s" if r.get('brygga_efter_s') else '') if x) or 'ingen'
        where = kort(r['plats'], r.get('kort')) if r.get('plats') else ''
        start = par(r['fran_lage']).split(' (')[0] if ' + ' in str(r['fran_lage']) else lage(r['fran_lage'], False)
        rows.append([r['ordning'], what, where, f"{r['docka'].capitalize()}, {mmss(a)}–{mmss(b)}", start, f"{round(r['syns'] * 100)} %", own])
    table(os.path.join(out_dir, '11-att-lyfta-harnast.png'), 'Att lyfta härnäst: det en hel kortrunda behöver, i ordning', ['nr', 'vad', 'plats och kort', 'var i filmen (minuter:sekunder)',
          'börjar med', 'handen syns', 'dockans egen rörelse'], rows,
          note='"Handen syns": hur stor del av tiden mätningen ser handen. "Dockans egen rörelse": den korta biten dockan gör själv för att komma från sitt utgångsläge '
               'till där dealern börjar, eller tillbaka (en brygga). Varför det spelar roll: med de här styckena får dockan en hel runda ur filmen. Platserna som redan '
               'har ett lyft (1, 2, 4 och 7, första kortet) står sist i listan.')
    print('ritat i', out_dir)


def blad(data_dir, measures, film, out_dir):
    """Local only: the timeline, and a sheet per category with frames of the film (start, middle, end of a few pieces)."""
    import cv2
    seg, phases, scene, source = load(data_dir)
    os.makedirs(out_dir, exist_ok=True)
    timeline(seg, phases, source, os.path.join(out_dir, 'tidslinje.png'))
    one_round(seg, phases, os.path.join(out_dir, 'en-kortrunda.png'))
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
    for old in glob.glob(os.path.join(out_dir, 'blad-*.jpg')):
        os.remove(old)
    kinds = ['GIV', 'GIV-EGET', 'DRA', 'TILL-SKON', 'HEM', 'BYT-VILA', 'PEKA', 'SVEP', 'KORT-IN', 'RATTA', 'SKON', 'ANNAT', 'VILA', 'VANTA']
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
                cv2.putText(label, line.replace('ö', 'o').replace('ä', 'a').replace('å', 'a'), (8, 30 + 34 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (230, 230, 230), 1, cv2.LINE_AA)
            rows.append(np.hstack([label] + tiles))
        cv2.imwrite(os.path.join(out_dir, f'blad-{kat.lower()}.jpg'), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 82])
        print(kat, len(rows))
    cap.release()
