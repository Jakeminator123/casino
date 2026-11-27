"""Skriver scen/standard.yaml ur spelets egna mått: ett kommando, och den enda vägen att ändra måttfilen.

    python scen/gen_standard.py

Läser blackjack-dealers kod med scen/las_spelet.ts (Node), räknar om till Blenders koordinater och skriver varje rad
med sin källa. Standarden är livebordet (blackjack-dealer/src/table-live.ts, mätt på filmen av ett riktigt livebord).
Spelet vinner alltid: ändras ett mått där, körs det här om och bord, dockor och stol byggs om.
"""
import math, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from gemensamt.standard import spelets_dump

d = spelets_dump(nytt=True)
LV, LF = d['LIVE'], d['frame']
FZ = LV['floor']['feltOverFloor']; ZE = LV['edge'][2]
def B(p):  # livebordets linsvärld (y upp, kameran rakt över origo, tittar mot -z) -> standard (Blender Z upp)
    x, y, z = p; return [x, -(z - ZE), y + FZ]
def Bdir(v):
    x, y, z = v; return [x, -z, y]
fmt = lambda v, n=4: '[' + ', '.join(f'{a:.{n}f}' for a in v) + ']'
deg = math.degrees

ls = 'blackjack-dealer/src/table-live.ts'
src = {
 'card': 'blackjack-dealer/src/space.ts (CARD)', 'bet': 'blackjack-dealer/src/standard.ts (BET)',
 'chip': 'blackjack-dealer/src/game3d-chips.ts (CHIP_RADIUS, CHIP_HEIGHT)', 'tray3d': 'blackjack-dealer/src/game3d-tray.ts',
 'doll': 'blackjack-dealer/dealer3d/src/doll.ts', 'figure': 'blackjack-dealer/dealer3d/src/figure-model.ts',
}
L = []; w = L.append
w('# STANDARD – en enda sanning för bord, platser, sko, kort, dockor och kameror: livebordet, mätt på film.')
w('# Skriven av scen/gen_standard.py ur spelets egen kod (casino/blackjack-dealer, som scen/las_spelet.ts läser).')
w('# Ändra aldrig för hand: ändra i spelet eller i gen_standard.py och kör python scen/gen_standard.py.')
w('# Varje värde har sin källa eller "antaget" med motivering. Spelet vinner över allt annat.')
w('# mätt = mätt på filmen; skattat = mätt men svagt; slutlett = härlett ur andra mått, inte sett; antaget = vårt, tills det mäts.')
w('#')
w('# KOORDINATER (Blender, Z upp, meter, högerhänt):')
w('#   origo  = golvet rakt under dealerkantens mitt (LIVE.edge)')
w('#   +X     = dealerns vänster = bildens höger sett från spelarna/filmkameran (samma x som spelets linsvärld)')
w('#   +Y     = bakåt, från spelarna mot dealerns rygg (spelarna står på -Y). Blenders "Front"-vy (från -Y) ser alltså dealern framifrån')
w('#   +Z     = upp; filten ligger på Z = filt_z')
w('#   Omräkning från livebordets linsvärld (three.js, y upp, kameran i (0, h, 0) tittar mot -z):')
w(f'#     X = x,  Y = -(z - dealerkant_lins_z) = -(z + {-ZE}),  Z = y + filt_z')
w('#   Vinkel "yaw" = grader moturs sett ovanifrån, 0 = längs +X.')
w('')
w('enhet: m')
w('format_version: 2')
w(f'filt_z: {FZ:.4f}  # slutlett, inte mätt (golvet syns aldrig): ur dealrarnas ögon när de står, ±{LV["floor"]["giveOrTake"]} m; {ls} LIVE.floor')
w('')
cam = LV['camera']; sens = 36.0
w(f'lins:  # livebordets kamera, mätt ur 29 kort på filten (0,54 bildpunkter per hörn); ärlig osäkerhet 5 % på brännvidden, 2-3 cm på höjden, 0,3 grader på lutningen. källa: {ls} LIVE.camera, liveFrame()')
w(f'  focal_px: {cam["focalPx"]}')
w(f'  bild_px: [{cam["film"]["width"]}, {cam["film"]["height"]}]')
w(f'  mitt_px: [{cam["centre"]["x"]}, {cam["centre"]["y"]}]  # där den optiska axeln möter bilden (bildens mitt)')
w(f'  pitch_rad: {cam["pitch"]:.10f}  # = {deg(cam["pitch"]):.3f} grader nedåt')
w(f'  rull_rad: {cam["roll"]:.10f}  # = {deg(cam["roll"]):.3f} grader: en vågrät linje på filten faller åt höger i bilden')
w(f'  hojd_over_filt: {cam["height"]}')
w(f'  dealerkant_lins_z: {ZE}  # mätt: dealerkantens z i livebordets linsvärld (LIVE.edge), för omräkningen i huvudet')
w(f'  sensor_mm: {sens}  # antaget: Blender-standard, sensor_fit HORIZONTAL; brännvidden nedan räknas om så att bilden blir exakt kamerans')
w(f'  brannvidd_mm: {cam["focalPx"] / cam["film"]["width"] * sens:.4f}  # härlett: focal_px / bild_bredd * sensor_mm')
w(f'  pos: {fmt(B(LF["position"]))}')
w(f'  fram: {fmt(Bdir(LF["forward"]), 6)}  # kamerans riktning')
w(f'  hoger: {fmt(Bdir(LF["right"]), 6)}  # bildens höger (med rullningen)')
w(f'  upp: {fmt(Bdir(LF["up"]), 6)}  # bildens upp (med rullningen)')
w('')
# ---------------- BORD
fe = LV['felt']; fc = B(fe['centre']); rl = LV['rail']; hb = math.sqrt(fe['radius'] ** 2 - fc[1] ** 2)
w(f'bord:  # mätt: en halvcirkel med rak kant mot dealern (bågen en cirkel inom 1,8 mm över 1234 punkter); sarg, ben, färger och texturer är vårt utseende. källa: {ls} LIVE.felt, LIVE.rail')
w('  typ: halvcirkel')
w(f'  mitt: [{fc[0]:.4f}, {fc[1]:.4f}]  # bågens mitt, {fc[1] * 100:.2f} cm bakom kanten')
w(f'  radie: {fe["radius"]}')
w(f'  halv_bredd_vid_kanten: {hb:.4f}  # härlett')
w(f'  bredd: {2 * hb:.4f}  # härlett: filtens bredd längs dealerkanten')
w(f'  djup: {fe["depth"]}')
w('  kontur_bagsteg: 180  # antaget: bågens täthet')
w('  vadderad_kant:  # mätt: en låg läderrulle som står på filtens kant, runt bågen och rakt längs kanten mot dealern; sektionen är två halva ellipser kring en mitt bredd/2 ut, i filtens nivå (live-bj/verktyg/reling.py). källa: LIVE.rail')
w(f'    bredd: {rl["width"]}  # mätt: hur långt ut från filtens kant (säker på 1 mm)')
w(f'    over_filt: {rl["above"]}  # mätt svagt: rullens topp över filten (0,009-0,024 passar lika bra)')
w(f'    under_filt: {rl["below"]}  # mätt svagt: hur långt under filtens nivå dess yttre sida går innan den vänder in under bordet')
sh = LV['shelf']; xv = fc[0] - hb
w(f'  hylla:  # mätt: en grund hylla bakom kanten mot dealern, vid hans högra sida (bildens vänster), inramad av samma rulle; botten i filtens nivå (antaget). källa: LIVE.shelf')
w(f'    vanster_inre: {xv:.4f}  # härlett: den vänstra sidan är bågens ände som går rakt bakåt (filtens vänstra hörn)')
w(f'    hoger_yttre: {sh["right"]}  # mätt: den högra sidans ytterkant (X)')
w(f'    bak_yttre: {sh["back"]}  # mätt: bakre sidans ytterkant, bakom kanten mot dealern (Y)')
w('  sarg:  # antaget (vår): valnötssarg under rullens överhäng, höjder relativt filten')
w('    underkant: -0.16')
w('    massingslinje: [-0.002, 0.005]  # mässingslist mot filten, ~2 mm över')
w('    underlagg: -0.008  # underläggets tjocklek, så att filten ligger an')
w('  ben:  # antaget (vårt): två ben (x = ±x, s mot spelarna, Y = -s)')
w('    x: 0.58')
w('    s: 0.25')
w('    radie_topp: 0.07')
w('    radie_fot: 0.09')
w('    platta_radie: 0.10  # mässingsfot')
w('    platta_hojd: 0.015')
w('  filtfarg_srgb: "#134232"  # antaget (vår): spelets gröna filt')
w('  markeringsfarg_srgb: "#d8b665"  # antaget (vår): kortplatsernas och ringarnas guld')
w('  texturer_skala_m:')
w('    filt: [0.40, 0.40]  # antaget: filten upprepas på ca 40 cm')
w('    tra: [1.8, 1.8]  # valnötsfaner (Poly Haven)')
w('    lader: [0.4, 0.4]  # brunt läder')
w('')
# ---------------- KORT
c = d['CARD']
w('kort:')
w(f'  bredd: {c["width"]}  # källa: {src["card"]}')
w(f'  langd: {c["height"]}  # källa: {src["card"]}')
w(f'  tjocklek: {c["thickness"]}  # källa: {src["card"]}')
w(f'  hornradie: {c["corner"]}  # källa: {src["card"]}')
w('  lekar_i_skon: 8  # antaget: vanlig kasinosko 6–8 lekar')
w('  markering:  # kortplatsernas guldram på filten')
w('    marginal: 0.004  # antaget: 4 mm runt kortet så kortet syns inne i ramen')
w('    linjebredd: 0.003  # antaget: tunn tryckt linje')
w('')
# ---------------- PLATSER & INSATSMÄRKEN
w(f'platser:  # mätt: där korten först låg stilla, kortets mitt; yaw_kort = långsidans vridning i grader moturs uppifrån (0 = rakt mot spelaren). källa: {ls} LIVE.cards')
w('  # vinkel: mätt där landningarna är eniga om den, annars spegelbilden av samma kort på den speglade platsen (LIVE.cards[id].turnFrom)')
w('  # platserna räknas ännu från bildens vänster: P1 längst till vänster i bilden (dealerns höger), P7 närmast skon')
for pid, k in LV['cards'].items():
    t = k['turn'] - 180 if k['turn'] > 90 else k['turn']
    w(f'  {pid}: {{pos: {fmt(B(k["at"]))}, yaw_kort: {t:.2f}, landningar: {k["landings"]}, vinkel: "{k["turnFrom"]}"}}')
w('')
bet = d['BET']
w(f'bet_ringar:  # våra insatsringar kring livebordets insatsmärken. källa: {src["bet"]}')
w(f'  radie: {bet["radius"]}')
w('  linjebredd: 0.003  # antaget: samma tryckbredd som kortmarkeringen')
w(f'  platser:  # mätt: mitten av spelets platsknappar, plats 1 till vänster i bilden (dealerns höger). källa: {ls} LIVE.betMarks')
for i, p in enumerate(LV['betMarks']):
    w(f'    P{i + 1}: {fmt(B(p))}')
w('')
# ---------------- SKO
sh, ft = LV['shoe'], LV['shoe']['foot']; sp = d['shoePose']; dirL = Bdir(sp['back']); yawL = deg(math.atan2(dirL[1], dirL[0])); sc = d['shoeCard']
w(f'sko:  # en lång genomskinlig låda, öppen upptill: fronten är en klar ram som lutar bakåt från fotens två främre hörn, med ett fönster där nästa kort syns; kortleken ligger på en bädd som stiger bakåt, varje kort lutat som fronten med långsidan tvärs skon. källa: {ls} LIVE.shoe, liveShoePose(), liveShoeCard()')
w('  genomskinlig: true')
w(f'  fot_fram: {fmt(B(ft["towardPlayers"]))}  # mätt: fotens främre hörn mot spelarna (hörnen lästa för ögat, 1-2 cm)')
w(f'  fot_horn: [{fmt(B(ft["byDealer"]))}, {fmt(B(ft["towardPlayers"]))}, {fmt(B(ft["back"]))}]  # mätt: främre vid dealern, främre mot spelarna, bakre mot spelarna')
w(f'  yaw_bakat: {yawL:.3f}  # härlett ur foten: bakänden vriden mot dealern')
w(f'  langd: {sh["length"]}  # mätt (foten)')
w(f'  bredd: {sh["width"]}  # mätt (foten)')
w(f'  hojd_bak: {sh["backHeight"]}  # mätt ur bilden; väggarnas överkant går rakt från frontens topp hit')
w(f'  hojd_fram: {sh["frontHeight"]}  # mätt: frontens topp (de två topphörnen lästa 0,060 och 0,062)')
w(f'  platta_lutning_grader: {deg(sh["plateLean"]):.2f}  # mätt: från filten (topphörnen lästa 34,0 och 32,8 grader bakåt från lodrätt; kortets rygg i fönstret lutar lika)')
w(f'  fonster_lyft: {sh["windowLift"]}  # mätt: där bädden börjar framtill, kortets underkant över filten')
w(f'  badd_lutning_grader: {deg(sh["bedLean"]):.2f}  # mätt: bädden stiger bakåt, sedd genom den nära väggen')
w(f'  lek_langd: {sh["deckLength"]}  # skattat: hur långt längs bädden kortleken når (0,14 m vid 62 s, 0,23 m vid 600 s i filmen; 0,18 är åtta lekar)')
w(f'  front_horn: [{", ".join(fmt(B(p)) for p in sh["frontCorners"])}]  # mätt: fot vid dealern, fot mot spelarna, topp mot spelarna, topp vid dealern')
w(f'  fonsterkort_mitt: {fmt(B(sc["centre"]))}  # nästa kort i frontens fönster, ryggen utåt; inom 2 mm från mätningens mitt')
w(f'  fonsterkort_langsida: {fmt(Bdir(sc["long"]))}  # kortets långsida, tvärs skon (mot den bortre väggen)')
w(f'  fonsterkort_kortsida: {fmt(Bdir(sc["short"]))}  # kortets kortsida, uppför fronten')
cp = LV['clearPiece']
w(f'los_bit: {{horn: [{", ".join(fmt(B(p)) for p in cp["corners"])}], mitt: {fmt(B(cp["middle"]))}}}  # mätt: en lös klar bit som ligger plant på filten strax framför skon; kortet som dras ut glider över den. källa: LIVE.clearPiece')
w('')
bc, bx = d['box'], LV['box']
w('kassering:  # mätt: en klar låda vid dealerns högra hörn, öppen upptill; de använda korten ligger plant i den, ryggen upp. källa: LIVE.box, liveBox()')
w(f'  fot_mitt: {fmt(B(bc["centre"]))}')
w(f'  yaw: {deg(bc["turn"]):.3f}')
w(f'  yttermatt: [{bx["width"]}, {bx["depth"]}, {bx["height"]:.4f}]  # foten mätt; höjden mätt ur bilden (0,156-0,159)')
w('  vaggtjocklek: 0.004  # antaget: 4 mm akryl')
w(f'  kort_hog: {bx["pile"]}  # skattat: de använda kortens hög, liggande med ryggen upp (2-5 cm genom filmen)')
w(f'skarkort: {{mitt: {fmt(B(LV["cutCard"]["middle"]))}, storlek: {fmt(LV["cutCard"]["size"])}}}  # mätt, men ligger bara ute ibland: byggs inte')
w('')
# ---------------- BRICKA (vårt tillägg)
w('markerbricka:  # mätt: livebordet har ingen (markerna är spelets grafik). Det här är vår, ett tillägg som bara bygg_bord.py --med-bricka lägger in vid dealerkanten')
w('  x0: -0.3  # antaget (vår): metrar tvärs bordet (X)')
w('  x1: 0.24')
w('  s0: 0  # från dealerkanten mot spelarna (Y = -s)')
w('  s1: 0.1')
w('  djup: 0.03')
w(f'  kant_bredd: 0.007  # källa: {src["tray3d"]} (rim = 0.007 m mässingslist i filtnivå)')
w(f'  ror: 12  # källa: {src["tray3d"]} (TRAY_ROWS har 12 rader)')
w('  urtag: {x0: -0.3, x1: 0.24, s1: 0.1}  # exakt brickans ytterkant (mässingsram täcker skarven)')
w(f'  chip_radie: {d["CHIP_RADIUS"]}  # källa: {src["chip"]}')
w(f'  chip_hojd: {d["CHIP_HEIGHT"]:.6f}  # källa: {src["chip"]}')
w(f'  fyllnad_start: 20  # källa: {src["tray3d"]} TRAY_FILL.start')
w(f'  rad_valorer: [5, 5, 25, 25, 100, 100, 500, 1000, 500, 100, 25, 5]  # källa: {src["tray3d"]}')
w('')
# ---------------- DEALERN OCH DOCKORNA
dl = LV['dealer']
w(f'dealer:  # mätt: han sitter, på en hög stol. Djupet är antaget ({dl["behindEdge"]} m bakom kanten); armarna går inte att mäta (dockans egna används). källa: LIVE.dealer')
w(f'  bakom_kant: {dl["behindEdge"]}  # antaget')
for nm, st in dl['styles'].items():
    w(f'  {nm}: {{docka: "{st["name"]}", axlar_mitt: {fmt(B(st["shouldersMiddle"]))}, axelbredd: {st["shoulderWidth"]}, ogon_over_filt: {st["eyesOverFelt"]}, bakom_kant_skattat: {st["behindEdgeEstimated"]}}}')
w('')
def hoft(m):  # höftleden: rakt under axlarnas mitt, i axlarnas plan bakom kanten
    return [m['x'], m['behindEdge'], FZ - m['hipBelowFelt']]
w(f'dockor:  # Danilo och Frasse vid livebordet, efter var sin dealer i filmen. källa: {src["doll"]} (DANILO, FRASSE)')
for nm, m in d['dolls'].items():
    w(f'  {nm}:  # stilen {m["style"]}')
    w(f'    over_arm: {m["upperArm"]}')
    w(f'    underarm: {m["forearm"]}')
    w(f'    rackvidd: {m["reach"]}  # axel -> handled')
    w(f'    hoft_under_filt: {m["hipBelowFelt"]}')
    w(f'    mest_lutning_rad: {m["mostLean"]}')
    w(f'    mest_vridning_rad: {m["mostTwist"]}')
    w(f'    axlar_bakom_kant: {m["behindEdge"]}  # dealer.bakom_kant')
    w(f'    axlar_over_filt: {m["shoulderHeight"]}')
    w(f'    hoft: {fmt(hoft(m))}  # härlett: rakt under axlarnas mitt, hoft_under_filt under filten')
first = next(iter(d['dolls'])); m0 = d['dolls'][first]; h0 = hoft(m0)
w(f'docka:  # dockan scen/bygg_docka.py ställer vid bordet: {first}s plats och mått (dockor.{first})')
w(f'  hoft: {fmt(h0)}')
w(f'  mest_lutning_rad: {m0["mostLean"]}')
w(f'  axlar_bakom_kant: {m0["behindEdge"]}')
w('  benamning:  # exportnamn som dealer3d kräver; källa: ' + src['figure'])
w('    kravs: [' + ', '.join(f'"{n}"' for n in ['RightArm','LeftArm','RightForeArm','LeftForeArm','RightHand','LeftHand','RightUpLeg','LeftUpLeg','RightLeg','LeftLeg','RightFoot','LeftFoot','neck','Head','headfront']) + ']')
w('    prefix: ""  # inga mixamorig:-prefix')
w('')
gv = LV['floor']
w('stol:  # dealerns stol – syns inte i filmen')
w(f'  sits_z: {gv["seatOverFloor"]:.4f}  # slutlett, inte mätt: LIVE.floor.seatOverFloor')
w(f'  sits_mitt: [{h0[0]:.4f}, {h0[1] + 0.08:.4f}]  # antaget: höftleden över sitsens främre del, sitsdjup 0,40')
w('  sits_bredd: 0.42  # antaget: barstol')
w('  sits_djup: 0.40  # antaget')
w('  ryggstod_hojd_over_sits: 0.35  # antaget')
w('  fotstod_z: 0.22  # antaget: barstolens fotring')
w(f'golv: {{filt_over_golv: {FZ}, plus_minus: {gv["giveOrTake"]}, sits_over_golv: {gv["seatOverFloor"]}}}  # slutlett, inte mätt')
w('')
# ---------------- KAMEROR
def cam_line(name, pos, tgt, lens, note, typ='perspektiv'):
    w(f'  {name}:')
    w(f'    typ: {typ}')
    w(f'    pos: {fmt(pos)}')
    w(f'    mal: {fmt(tgt)}')
    if typ == 'perspektiv': w(f'    brannvidd_mm: {lens:.4f}')
    else: w(f'    ortho_skala: {lens}')
    w(f'    kalla: "{note}"')
pos = B(LF['position']); fw = Bdir(LF['forward']); t = (pos[2] - FZ) / -fw[2]
w(f'kameror:  # sensor 36 mm horisontellt, upplösning lins.bild_px; mål = där optiska axeln möter filten (scen/_bpy_hjalp.py make_cameras siktar utan rullning)')
cam_line('film', pos, [pos[i] + fw[i] * t for i in range(3)], cam['focalPx'] / cam['film']['width'] * sens, f'{ls} LIVE_CAMERA, liveFrame(): livebordets kamera; rullningen ({deg(cam["roll"]):.2f} grader) tas inte med')
dk = next(iter(dl['styles'].values())); eye = B(dk['shouldersMiddle'])
p4 = B(LV['cards']['P4.C1']['at']) if 'P4.C1' in LV['cards'] else [0.0, -0.4, FZ]
cam_line('dealer_ogon', [eye[0], eye[1] - 0.09, FZ + dk['eyesOverFelt']], p4, 24.0, f'antaget: {dk["name"]}s ögon 9 cm framför axlarnas plan, i den mätta höjden; tittar på plats 4; 24 mm vidvinkel')
cam_line('hander', [0.0, -1.05, FZ + 0.40], [0.12, -0.10, FZ + 0.02], 85.0, 'antaget: närbild händer/sko/kort från spelarsidan')
cam_line('hel', [1.70, -2.50, FZ + 0.75], [0.0, 0.15, FZ - 0.10], 35.0, 'antaget: docka, stol och bord för QC')
cam_line('topp', [0.0, -0.40, 4.0], [0.0, -0.40, FZ], 2.30, 'antaget: ortografisk QC rakt uppifrån, täcker 2,3 m', typ='ortografisk')
w('')
w('rackviddstest:  # punkter dockans händer ska nå (handled ovanför punkten)')
w('  mal: ["sko.fonsterkort_mitt", "platser.D.C1", "platser.P1.C1", "platser.P7.C1"]')
w('  handled_over_kort: 0.02  # antaget: handleden 2 cm över kortet när handen lägger det')

(ROOT / 'scen' / 'standard.yaml').write_text('\n'.join(L) + '\n', encoding='utf-8', newline='\n')  # radslut som Git har dem, också på Windows
print(f'scen/standard.yaml skriven: {len(L)} rader.')
