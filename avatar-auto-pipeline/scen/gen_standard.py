"""Skriver scen/standard.yaml ur spelets egna mått: ett kommando, och den enda vägen att ändra måttfilen.

    python scen/gen_standard.py

Läser blackjack-dealers kod med scen/las_spelet.ts (Node), räknar om till Blenders koordinater och skriver varje rad
med sin källa. Spelet vinner alltid: ändras ett mått där, körs det här om och bord, dockor och stol byggs om.
"""
import math, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from gemensamt.standard import spelets_dump

dump = spelets_dump(nytt=True)
d, b = dump['spelet'], dump['bord']
FELT = -b['BASE']['floor']            # 0.95
ZE = d['dealerEdge'][2]
def B(p):  # three.js lins-värld (y upp, kameran -z) -> standard (Blender Z upp)
    x, y, z = p; return [x, -(z - ZE), y + FELT]
def Bdir(v):
    x, y, z = v; return [x, -z, y]
r = lambda v, n=4: [round(a, n) for a in v]
fmt = lambda v, n=4: '[' + ', '.join(f'{a:.{n}f}' for a in v) + ']'
deg = math.degrees

L = []; w = L.append
src = {
 'lens': 'blackjack-dealer/src/table-lens.ts (TABLE_LENS)', 'film': 'blackjack-dealer/src/table-lens.ts (FILM)',
 'card': 'blackjack-dealer/src/table-lens.ts (CARD)', 'shoe': 'blackjack-dealer/src/table-lens.ts (SHOE)',
 'shoePose': 'blackjack-dealer/src/table-lens.ts shoePose(TABLE_LENS)', 'shoeCard': 'blackjack-dealer/src/table-lens.ts shoeCard()',
 'edge': 'blackjack-dealer/dealer3d/src/world.ts dealerEdge(TABLE_LENS)', 'spots': 'blackjack-dealer/dealer3d/src/world.ts spots(placements/default.json, TABLE_LENS)',
 'seatEye': 'blackjack-dealer/dealer3d/src/world.ts seatEye()', 'assumed': 'blackjack-dealer/dealer3d/src/world.ts (ASSUMED)',
 'std': 'blackjack-dealer/dealer3d/src/doll.ts (STANDARD)', 'frame': 'blackjack-dealer/dealer3d/src/doll.ts dollFrame(TABLE_LENS, STANDARD)',
 'paow': 'blackjack-dealer/dealer3d/src/doll.ts (PAOW)', 'bord02': 'blackjack-dealer/src/scene3d-bord02.ts (BORD02)',
 'outline': 'blackjack-dealer/src/scene3d-bord02.ts bord02Outline()', 'base': 'blackjack-dealer/src/scene3d-table.ts (BASE.floor)',
 'table_std': 'blackjack-dealer/src/scene3d-table.ts (TABLE, REAL_TABLE)',
 'tray': 'blackjack-dealer/src/scene3d-props.ts (TRAY)', 'tray3d': 'blackjack-dealer/src/game3d-tray.ts',
 'chip': 'blackjack-dealer/src/game3d-chips.ts (CHIP_RADIUS, CHIP_HEIGHT)', 'gold': 'blackjack-dealer/src/scene3d-table.ts (GOLD)',
 'bet': 'blackjack-dealer/src/scene3d-geometry.ts (BET)',
 'rest': 'blackjack-dealer/dealer3d/src/body.ts restingHand(TABLE_LENS)', 'figure': 'blackjack-dealer/dealer3d/src/figure-model.ts',
}
w('# STANDARD – en enda sanning för bord, platser, sko, kort, docka och kameror.')
w('# Skriven av scen/gen_standard.py ur spelets egen kod (casino/blackjack-dealer, som scen/las_spelet.ts läser).')
w('# Ändra aldrig för hand: ändra i spelet eller i gen_standard.py och kör python scen/gen_standard.py.')
w('# Varje värde har "# källa: fil (namn)" eller "# antaget: motivering". Spelet vinner över allt annat.')
w('#')
w('# KOORDINATER (Blender, Z upp, meter, högerhänt):')
w('#   origo  = golvet rakt under dealerkantens mitt (dealerEdge i dealer3d, s = 0; gäller både standardovalen och BORD-02:s urtag)')
w('#   +X     = dealerns vänster = bildens höger sett från spelarna/filmkameran (samma x som spelets lins-värld)')
w('#   +Y     = bakåt, från spelarna mot dealerns rygg (spelarna står på -Y). Blenders "Front"-vy (från -Y) ser alltså dealern framifrån')
w('#   +Z     = upp; filten ligger på Z = filt_z')
w('#   Omräkning från spelets lins-värld (three.js, y upp, filmkameran i (0, h, 0) tittar mot -z):')
w(f'#     X = x,  Y = -(z - dealerEdge.z) = -(z + {-ZE:.6f}),  Z = y + filt_z')
w('#   Bordets egna (x, s) (samma för standardovalen och BORD-02): X = x, Y = -s.  Vinkel "yaw" = grader moturs sett ovanifrån, 0 = längs +X.')
w('')
w('enhet: m')
w('format_version: 1')
w(f'filt_z: {FELT:.4f}  # källa: {src["base"]} – scenens golv ligger 0,95 m under filten (BORD-02-källans 75 cm används inte, se avvikelser)')
w('')
w('lins:  # filmkamerans lins; hela spelets värld är räknad ur den')
L0 = d['lens']
w(f'  focal_px: {L0["focalPx"]}  # källa: {src["lens"]}')
w(f'  pitch_rad: {L0["pitch"]:.10f}  # källa: {src["lens"]} (= {deg(L0["pitch"]):.3f} grader nedåt)')
w(f'  hojd_over_filt: {L0["height"]:.10f}  # källa: {src["lens"]}')
w(f'  bild_px: [{d["FILM"]["width"]}, {d["FILM"]["height"]}]  # källa: {src["film"]}')
w(f'  dealerkant_lins_z: {ZE:.10f}  # källa: {src["edge"]} – dealerkantens z i spelets lins-värld (för omräkning, se huvudet)')
sens = 36.0; lensmm = L0['focalPx'] / d['FILM']['width'] * sens
w(f'  sensor_mm: {sens}  # antaget: Blender-standard, sensor_fit HORIZONTAL; brännvidden nedan räknas om så att bilden blir exakt spelets')
w(f'  brannvidd_mm: {lensmm:.4f}  # härlett: focal_px / bild_bredd * sensor_mm')
w('')
# ---------------- BORD
# Spelets default (scene3d-view.ts tableModel: "standard"):
# halv-elliptiskt ovalbord med rak dealerkant. BORD-02 är ett labb-/utseende-alternativ, inte standarden.
# Dockans förenklade 3D-bord i Kortplan (dealer3d/src/stage.ts) är en halvcirkel radius 1,02 m, rulle 0,12 m, också rak dealerkant.
tb = b['TABLE']; real_d = b['REAL_TABLE']['depth']; base = b['BASE']
A, DEP, RAIL_W = tb['a'], real_d, tb['rail']
w('bord_modell: standard  # källa: blackjack-dealer/src/scene3d-view.ts DEFAULTS.tableModel')
w('bord:  # spelets standardbord (oval halv-ellips, rak dealerkant). källa: ' + src['table_std'] + ' under linsen (tableUnder: bredd TABLE.a*2, djup REAL_TABLE.depth)')
w(f'  typ: oval_halvellis')
w(f'  bredd: {2*A:.4f}  # källa: {src["table_std"]} TABLE.a * 2')
w(f'  djup: {DEP:.4f}  # källa: {src["table_std"]} REAL_TABLE.depth (TABLE.b = 0,60 m är kontraktets kortare bord; under filmlinsen används 1,15 m)')
w(f'  halv_bredd: {A}  # källa: {src["table_std"]} TABLE.a')
w(f'  radie: {A}  # alias för halv_bredd (samma nyckel som QC-överlägget använder)')
w(f'  axel_s: 0.0  # rak dealerkant börjar vid s = 0 (inga vingar)')
w(f'  fram_s: {DEP:.4f}  # spelarkanten mitt fram (Y = -{DEP:.4f})')
w(f'  bak_s: 0.0  # rak dealerkant vid s = 0 (Y = 0); inga vingar bakåt')
w('  kontur_bagsteg: 180  # antaget: samma täthet som BORD-02-bågen')
w('  vadderad_kant:  # läderrulle längs spelarbågen (inte längs dealerkanten)')
w(f'    bredd: {RAIL_W}  # källa: {src["table_std"]} TABLE.rail (~10 cm, RAIL.centre 0,057 + 5 cm halvsektion)')
w('    mitt_over_filt: 0.012  # källa: blackjack-dealer/src/scene3d-table.ts CORE[1]')
w('    halv_hojd: 0.034  # källa: blackjack-dealer/src/scene3d-table.ts RAIL.top - CORE[1]')
w('    som_in: 0.0  # antaget: standardbordets sömmar är en del av rullens sektion, inte ett separat mått')
w('    som_hojd: 0.0')
w('    andradie: 0.05  # antaget: rullens ändar vid dealerkanten')
w('  sarg:  # valnötssarg under rullens överhäng, höjder relativt filten')
w('    underkant: -0.16  # källa: kommentar i scene3d-table.ts (lackad valnötssarg under rullen); BASE.under = -0.15')
w('    massingslinje: [-0.002, 0.005]  # källa: scene3d-table.ts BEAD (mässingslist mot filten, ~2 mm över)')
w('    underlagg: -0.008  # antaget: samma underläggstjocklek som BORD-02, för att filten ska ligga an')
w('  ben:  # två ben (x = ±x, s mot spelarna). källa: blackjack-dealer/src/scene3d-table.ts (BASE)')
w(f'    x: {base["legX"]}  # källa: BASE.legX')
w(f'    s: {base["legZ"]}  # källa: BASE.legZ (s mot spelarna, Y = -{base["legZ"]})')
w('    radie_topp: 0.07  # antaget: standardbordets ben är fotograferat trä, typisk topp')
w('    radie_fot: 0.09  # antaget')
w('    platta_radie: 0.10  # antaget: mässingsfot')
w('    platta_hojd: 0.015  # antaget')
w('  hylla_bakom_dealerkant:  # källa: scene3d-table.ts SHELF, avstängd som standard (labb 2026-11-13)')
w('    djup_bakat: 0.40')
w('    inre_x: 0.27')
w('    tjocklek: 0.035')
w('    pa_som_standard: false')
w('  filtfarg_srgb: "#134232"  # källa: blackjack-dealer/src/scene3d-table.ts FELTS.green[0]')
w(f'  markeringsfarg_srgb: "#d8b665"  # källa: {src["gold"]}')
w('  texturer_skala_m:')
w('    filt: [0.40, 0.40]  # antaget: standardfilten (V6/runway-tyger) upprepas på ca 40 cm; BORD-02:s scuba_suede var 0,285 m')
w('    tra: [1.8, 1.8]  # samma valnötsfaner som BORD-02 (Poly Haven)')
w('    lader: [0.4, 0.4]  # samma bruna läder som BORD-02')
w('  dockans_forenklade_bord:  # det Kortplan visar sedan 9e440db. källa: dealer3d/src/stage.ts')
w('    typ: halvcirkel')
w('    radie: 1.02  # feltens radie; bredd 2,04 m, djup 1,02 m, rak dealerkant')
w('    rulle_bredd: 0.12')
w('    golv_under_filt: 0.90  # stage.ts floor.position.y = -0.9')
w('')
# BORD-02 som behållet alternativ
bd = b['BORD02']
w('bord_02:  # labb-/utseende-alternativ (tableModel: "bord-02"), inte spelets default. källa: ' + src['bord02'])
w(f'  typ: njurformat')
w(f'  bredd: {2*bd["radius"]:.4f}')
w(f'  djup: {bd["front"]-bd["rear"]:.4f}')
w(f'  radie: {bd["radius"]}')
w(f'  axel_s: {bd["shoulder"]}')
w(f'  fram_s: {bd["front"]}')
w(f'  bak_s: {bd["rear"]}  # vingar bakåt till Y = +{-bd["rear"]}')
w('  dealersida_bezier:')
w('    vanster_vinge: [[-0.96, 0.07], [-0.96, -0.24], [-0.66, -0.24], [-0.5, -0.24]]')
w('    vanster_urtag: [[-0.5, -0.24], [-0.31, -0.24], [-0.25, 0.0], [0.0, 0.0]]')
w('    hoger_urtag: [[0.0, 0.0], [0.25, 0.0], [0.31, -0.24], [0.5, -0.24]]')
w('    hoger_vinge: [[0.5, -0.24], [0.66, -0.24], [0.96, -0.24], [0.96, 0.07]]')
bd = b['BORD02']; rl = bd['rail']; bn = bd['bands']; lg = bd['leg']
w('  vadderad_kant:')
w(f'    bredd: {rl["width"]}  # källa: {src["bord02"]} rail.width')
w(f'    mitt_over_filt: {rl["lift"]}')
w(f'    halv_hojd: {rl["round"]}')
w(f'    som_in: {rl["seam"]}')
w(f'    som_hojd: {rl["seamY"]}')
w(f'    andradie: {rl["cap"]}')
w('  sarg:')
w(f'    underkant: {bn["bottom"]}')
w(f'    massingslinje: {fmt(bn["brass"])}')
w(f'    underlagg: {bn["underlay"]}')
w('  ben:')
w(f'    x: {lg["x"]}')
w(f'    s: {lg["s"]}')
w(f'    radie_topp: {lg["top"]}')
w(f'    radie_fot: {lg["foot"]}')
w(f'    platta_radie: {lg["plinth"]}')
w(f'    platta_hojd: {lg["plinthHigh"]}')
w('  filtfarg_srgb: "#215343"  # BORD02_CLOTH.colour')
w('  texturer_skala_m:')
w('    filt: [0.28522, 0.2789]')
w('    tra: [1.8, 1.8]')
w('    lader: [0.4, 0.4]')
w('')
# ---------------- KORT
c = d['CARD']
w('kort:')
w(f'  bredd: {c["width"]}  # källa: {src["card"]}')
w(f'  langd: {c["height"]}  # källa: {src["card"]}')
w(f'  tjocklek: {c["thickness"]}  # källa: {src["card"]}')
w(f'  hornradie: {c["corner"]}  # källa: {src["card"]}')
w('  lekar_i_skon: 8  # antaget: vanlig kasinosko 6–8 lekar; 8 x 52 x 0,3 mm = 0,125 m kortbunt')
w('  markering:  # kortplatsernas guldram på filten')
w('    marginal: 0.004  # antaget: 4 mm runt kortet så kortet syns inne i ramen')
w('    linjebredd: 0.003  # antaget: tunn tryckt linje')
w('')
# ---------------- PLATSER & BET-RINGAR
hip_std = B(d['standard']['frame']['hip'])
hip = [hip_std[0], 0.3800, hip_std[2]]  # PAOW behindEdge 0.38 m så BORD-02-vingarna (Y +0.24) går fria
w('platser:  # kortens mittpunkter på filten. källa: ' + src['spots'] + '. yaw_kort = 0 (spelet lägger korten rakt, placements angle 0)')
w('  # riktning_mot_dealer = yaw från kortet mot dealerns höft (Y = +0,38 m, för givrörelser)')
for s in d['spots']:
    p = B(s['at']); yaw = deg(math.atan2(hip[1]-p[1], hip[0]-p[0]))
    dist = math.hypot(hip[0]-p[0], hip[1]-p[1])
    w(f'  {s["id"]}: {{pos: {fmt(p)}, yaw_kort: 0.0, riktning_mot_dealer: {yaw:.2f}, avstand_hoft_xy: {dist:.4f}}}')
w('')
w('bet_ringar:  # insatsringar framför C1 mot spelarna. källa: ' + src['bet'])
w('  offset_framfor_c1: 0.083  # källa: ' + src['bet'] + ' BET.real')
w('  radie: 0.027  # källa: ' + src['bet'] + ' BET.radius')
w('  linjebredd: 0.003  # antaget: samma tryckbredd som kortmarkering')
w('  platser:')
for N in range(1, 8):
    c1 = next(B(s['at']) for s in d['spots'] if s['id'] == f'P{N}.C1')
    w(f'    P{N}: {fmt([c1[0], c1[1] - 0.083, FELT])}')
w('')
# ---------------- SKO
sp = d['shoePose']; front = B(sp['front']); dirB = Bdir(sp['back']); ln = d['SHOE']['length']
back = [front[i] + dirB[i]*ln for i in range(3)]
mid = [(front[i]+back[i])/2 for i in range(3)]
yaw = deg(math.atan2(dirB[1], dirB[0]))
sc = d['shoeCard']; S = d['SHOE']
w('sko:  # dealerns sko på bildens högra sida (dealerns vänster); fot_fram/bak följer skons nära vägg (shoePose.front)')
w(f'  fot_fram: {fmt(front)}  # källa: {src["shoePose"]} front – nära kanten av fotens framkant (kortfönstret)')
w(f'  fot_bak: {fmt(back)}  # härlett: fot_fram + bakriktning * langd')
w(f'  fot_mitt: {fmt(mid)}  # härlett')
w(f'  yaw_bakat: {yaw:.3f}  # härlett ur {src["shoePose"]} back = {fmt(dirB)}; skon pekar med fronten mot yaw+180')
w(f'  langd: {S["length"]}  # källa: {src["shoe"]}')
w(f'  bredd: {S["width"]}  # källa: {src["shoe"]}')
w(f'  hojd_bak: {S["backHeight"]}  # källa: {src["shoe"]}')
w(f'  hojd_fram: {S["frontHeight"]}  # källa: {src["shoe"]}')
w(f'  platta_lutning_grader: {deg(S["plateLean"]):.2f}  # källa: {src["shoe"]} plateLean')
w(f'  fonster_lyft: {S["windowLift"]}  # källa: {src["shoe"]} windowLift')
w(f'  fonsterkort_mitt: {fmt(B(sc["centre"]))}  # källa: {src["shoeCard"]} – översta kortets mitt i fönstret (där handen tar)')
w(f'  fonsterkort_upp: {fmt(Bdir(sc["up"]))}  # källa: {src["shoeCard"]}')
w(f'  fonsterkort_tvars: {fmt(Bdir(sc["across"]))}  # källa: {src["shoeCard"]}')
ps = d['shoeAtPlan']
w(f'  kortplanens_skopunkt: {fmt(B(ps))}  # källa: placements/default.json shoe.native (u 0.733, v 0.322) på filten; en planmarkör, inte skons fot')
w('')
# ---------------- KASSERING
w('kassering:  # finns inte i spelet – speglad mot skon på dealerns höger')
w(f'  fot_mitt: [-0.6200, -0.0300, {FELT:.4f}]  # antaget: spegling av skons mitt (X -0,54) något längre ut, utanför brickans urtag (X < -0,30)')
w(f'  yaw: {-yaw:.3f}  # antaget: spegling av skons yaw')
w('  yttermatt: [0.080, 0.105, 0.140]  # antaget: akrylhållare för 8 lekar (inre 68 x 93 mm, 125 mm bunt + marginal)')
w('  vaggtjocklek: 0.004  # antaget: 4 mm akryl')
w('')
# ---------------- BRICKA
tr = b['TRAY']; n = b['notch']
w('markerbricka:  # nedsänkt i filten vid dealerkanten, chipsens toppar i nivå med filten')
w(f'  x0: {tr["x0"]}  # källa: {src["tray"]}')
w(f'  x1: {tr["x1"]}  # källa: {src["tray"]}')
w(f'  s0: {tr["s0"]}  # källa: {src["tray"]} (Y = -s)')
w(f'  s1: {tr["s1"]}  # källa: {src["tray"]}')
w(f'  djup: {tr["depth"]}  # källa: {src["tray"]}')
w(f'  kant_bredd: 0.007  # källa: {src["tray3d"]} (rim = 0.007 m mässingslist i filtnivå)')
w(f'  ror: 12  # källa: {src["tray3d"]} (TRAY_ROWS har 12 rader; TRAY.tubes = 11 i scene3d-props)')
w(f'  urtag: {{x0: {tr["x0"]}, x1: {tr["x1"]}, s1: {tr["s1"]}}}  # källa: {src["tray"]} – exakt brickans ytterkant (mässingsram täcker skarven)')
w(f'  chip_radie: {b["CHIP_RADIUS"]}  # källa: {src["chip"]}')
w(f'  chip_hojd: {b["CHIP_HEIGHT"]:.6f}  # källa: {src["chip"]}')
w('  fyllnad_start: 20  # källa: ' + src['tray3d'] + ' TRAY_FILL.start')
w('  rad_valorer: [5, 5, 25, 25, 100, 100, 500, 1000, 500, 100, 25, 5]  # källa: ' + src['tray3d'])
w('')
# ---------------- DOCKA
f = d['standard']['frame']; m = d['standard']['measures']
sh = [B(x) for x in f['shoulders']]
dy_paow = hip[1] - hip_std[1]  # +0.20 m
sh_adj = [[s[0], s[1] + dy_paow, s[2]] for s in sh]
nk = B(f['neck']); nk_adj = [nk[0], nk[1] + dy_paow, nk[2]]
hd = B(f['head']); hd_adj = [hd[0], hd[1] + dy_paow, hd[2]]
fp = d['paow']['frame']; mp = d['paow']['measures']
w('docka:  # standarddockan bakom dealerkanten. Arm/höjd ur doll.ts STANDARD, men X/Y flyttad till PAOW behindEdge=0,38 m för BORD-02')
w(f'  over_arm: {m["upperArm"]}  # källa: {src["std"]}')
w(f'  underarm: {m["forearm"]}  # källa: {src["std"]}')
w(f'  rackvidd: {m["reach"]}  # källa: {src["std"]} (axel -> handled, något under över_arm+underarm)')
w(f'  hoft_under_filt: {m["hipBelowFelt"]}  # källa: {src["std"]} (hög kasinopall, sits 0,66 m)')
w(f'  mest_lutning_rad: {m["mostLean"]}  # källa: {src["std"]}')
w(f'  mest_vridning_rad: {m["mostTwist"]}  # källa: {src["std"]}')
w(f'  axlar_bakom_kant: {mp["behindEdge"]}  # källa: {src["paow"]} (0,38 m fri från BORD-02 vingar vid 0,24 m; gamla ASSUMED var 0,18 m)')
w(f'  hoft: {fmt(hip)}  # härlett: X,Z ur {src["frame"]}, Y = +0,38 m ur {src["paow"]}')
w(f'  axel_hoger: {fmt(sh_adj[0])}  # härlett (flyttad +0,20 m i Y med höften)')
w(f'  axel_vanster: {fmt(sh_adj[1])}  # härlett')
w(f'  nacke: {fmt(nk_adj)}  # härlett')
w(f'  huvud_mitt: {fmt(hd_adj)}  # härlett')
w(f'  huvud_radie: {f["headRadius"]:.4f}  # källa: {src["frame"]}')
rh = d['restingHand']
w(f'  vilohand_handled: {fmt(B(rh["wrist"]))}  # källa: {src["rest"]}')
w(f'  vilohand_framat: {fmt(Bdir(rh["forward"]))}  # källa: {src["rest"]}')
w('  # Ben och stol finns inte i spelet (stolen syns aldrig i filmen):')
w('  larbenslangd: 0.386  # källa: assets/docka/standarddocka.blend (MPFB, LeftUpLeg-längd efter passning) – spelet har inga ben')
w('  underbenslangd: 0.399  # källa: assets/docka/standarddocka.blend (MPFB, LeftLeg-längd)')
w('  fotledshojd: 0.07  # antaget')
w('  langd_staende: 1.70  # antaget: stämmer med axlarnas 1,30 m och huvudets 1,49 m över golvet sittande')
w('  benamning:  # exportnamn som dealer3d kräver; källa: ' + src['figure'])
w('    kravs: [' + ', '.join(f'"{n}"' for n in ['RightArm','LeftArm','RightForeArm','LeftForeArm','RightHand','LeftHand','RightUpLeg','LeftUpLeg','RightLeg','LeftLeg','RightFoot','LeftFoot','neck','Head','headfront']) + ']')
w('    prefix: ""  # inga mixamorig:-prefix')
w('')
w('docka_paow:  # källa: ' + src['paow'] + ' (uppmätt ur film med SAM 3D Body)')
w(f'  over_arm: {mp["upperArm"]}  # källa: {src["paow"]}')
w(f'  underarm: {mp["forearm"]}  # källa: {src["paow"]}')
w(f'  rackvidd: {mp["reach"]}  # källa: {src["paow"]}')
w(f'  hoft_under_filt: {mp["hipBelowFelt"]}  # källa: {src["paow"]}')
w(f'  axlar_bakom_kant: {mp["behindEdge"]}  # källa: {src["paow"]}')
w(f'  hoft: {fmt(B(fp["hip"]))}  # källa: {src["paow"]}')
w(f'  axel_hoger: {fmt(B(fp["shoulders"][0]))}  # källa: {src["paow"]}')
w(f'  axel_vanster: {fmt(B(fp["shoulders"][1]))}  # källa: {src["paow"]}')
w('')
w('stol:  # dealerns stol – syns inte i filmen')
w(f'  sits_z: {hip[2]-0.09:.4f}  # antaget: höftleden ligger ca 9 cm över sitsen (sittbensknölar + mjukdel)')
w(f'  sits_mitt: [{hip[0]:.4f}, {hip[1]+0.08:.4f}]  # antaget: höftleden över sitsens främre del, sitsdjup 0,40')
w('  sits_bredd: 0.42  # antaget: barstol')
w('  sits_djup: 0.40  # antaget')
w('  ryggstod_hojd_over_sits: 0.35  # antaget')
w('  fotstod_z: 0.22  # antaget: barstolens fotring; dockan når golvet med fötterna i sitt_vila')
w('')
# ---------------- SPELARSTOLAR
def arc(t): return A*math.cos(t), DEP*math.sin(t)  # standardovalens spelarbåge (x, s)
w('spelarplatser:  # var spelare N sitter: på linjen från dealerns höft genom C1/C2-mitten, 0,30 m utanför bordskanten')
w('  # antaget: spelet har inga spelarkroppar; linjen och 0,30 m (stolsmitt bakom vadderingen) är våra')
for N in range(1, 8):
    c1 = next(B(s['at']) for s in d['spots'] if s['id'] == f'P{N}.C1'); c2 = next(B(s['at']) for s in d['spots'] if s['id'] == f'P{N}.C2')
    m2 = [(c1[0]+c2[0])/2, (c1[1]+c2[1])/2]; dx, dy = m2[0]-hip[0], m2[1]-hip[1]; L2 = math.hypot(dx, dy); ux, uy = dx/L2, dy/L2
    best = None
    for i in range(20001):
        t = math.pi*i/20000; x, s = arc(t); px, py = x - hip[0], -s - hip[1]
        cr = abs(px*uy - py*ux); along = px*ux + py*uy
        if along > 0 and (best is None or cr < best[0]): best = (cr, x, -s, along)
    _, ex, ey, al = best
    st = [ex + ux*0.30, ey + uy*0.30]
    yawp = deg(math.atan2(-uy, -ux))
    w(f'  {N}: {{kant: [{ex:.4f}, {ey:.4f}], stol: [{st[0]:.4f}, {st[1]:.4f}], yaw_mot_dealer: {yawp:.2f}}}')
w('')
# ---------------- KAMEROR
def cam_line(name, pos, tgt, lens, note, typ='perspektiv', extra=''):
    w(f'  {name}:')
    w(f'    typ: {typ}')
    w(f'    pos: {fmt(pos)}')
    w(f'    mal: {fmt(tgt)}')
    if typ == 'perspektiv': w(f'    brannvidd_mm: {lens:.4f}')
    else: w(f'    ortho_skala: {lens}')
    if extra: w(extra)
    w(f'    kalla: "{note}"')
def target_on_felt(eye):
    pos = B(eye['position']); fw = Bdir(eye['forward']); t = (pos[2]-FELT)/(-fw[2]); return pos, [pos[i]+fw[i]*t for i in range(3)]
w('kameror:  # alla perspektivkameror: sensor 36 mm horisontellt, upplösning 1764 x 1174 om inget annat sägs; mål = där optiska axeln möter filten')
pos, tg = target_on_felt(d['filmEye'])
cam_line('film', pos, tg, lensmm, f'{src["lens"]} filmEye – exakt spelets filmkamera = spelare 4 (ersätter halvbild)')
for N in range(1, 8):
    pos, tg = target_on_felt(d['seatEyes'][str(N)])
    cam_line(f'spelare_{N}', pos, tg, lensmm, f'{src["seatEye"]} seat {N} ' + (' – ersätter giv-seat-5' if N == 5 else ''))
head = hd_adj
cam_line('dealer_ogon', [head[0], head[1]-0.09, head[2]+0.03], [0.0, -0.30, FELT], 24.0, 'antaget: dealerns ögon 9 cm framför huvudets mitt, 3 cm upp; tittar på P4-området; 24 mm vidvinkel')
cam_line('hander', [0.0, -1.05, FELT+0.40], [0.12, -0.10, FELT+0.02], 85.0, 'antaget: närbild händer/sko/kort från spelarsidan')
cam_line('hel', [1.70, -2.50, 1.70], [0.0, 0.15, 0.85], 35.0, 'antaget: docka, stol och bord för QC')
cam_line('topp', [0.0, -0.40, 4.0], [0.0, -0.40, FELT], 2.30, 'antaget: ortografisk QC rakt uppifrån, täcker 2,3 m', typ='ortografisk')
w('')
w('rackviddstest:  # punkter dockans händer ska nå (handled ovanför punkten)')
w('  mal: ["sko.fonsterkort_mitt", "platser.D.C1", "platser.P1.C1", "platser.P7.C1"]')
w(f'  handled_over_kort: {d["ASSUMED"]["knuckleLift"]}  # källa: {src["assumed"]} knuckleLift')

(ROOT / 'scen' / 'standard.yaml').write_text('\n'.join(L) + '\n', encoding='utf-8')
print(f'scen/standard.yaml skriven: {len(L)} rader.')
