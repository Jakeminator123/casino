"""Standarddockan: MPFB2 (CC0-kropp) + Mixamo-namngivet skelett (52 kropps-/handben + 16 ansiktsben under Head, och två
vridben i varje underarm), ARKit-kompatibla shape keys för ansiktsuttryck, ett ansikte som går att läsa (ögonglober med
iris och pupill, ögonbryn, läppar och en mörk munhåla med tänder; ANSIKTE nedan), egna IK-kontroller, ledgränser och
exportnamn som dealer3d kräver.

Bygger två grunddockor med 100 % identiskt skelett/bennamn så alla rörelser kan återanvändas, med människans mått för
kön och längd (MATT nedan: längderna, armarnas tjocklek, händerna och fötterna mot ANSUR II):
  - standarddocka_kvinna.blend / .glb (1,65 m)
  - standarddocka_man.blend / .glb (1,75 m)
och på samma sätt män med mätta mått: två dealrar i en film (MATT danilo och frasse: mannens kropp med de mätta axlarna,
halsen och huvudet) och en person efter sin egen figur och sina bilder (MATT tomasz_matt: axlarna, bröstet, midjan,
höften, halsen och huvudets höjd, bredd och käke), med --kon <nyckeln i MATT>:
  - standarddocka_danilo.blend / .glb, standarddocka_frasse.blend / .glb, standarddocka_tomasz_matt.blend / .glb
och en person mätt ur sina egna bilder (steg 15, personer/<person>.json), byggd på Danilos eller Frasses docka, med
--kon <dockans namn i filen> (Kenji: --kon kenji -> standarddocka_kenji.blend / .glb).
En ny person är en ny fil i personer/ (eller en nyckel i MATT: grund, passa, kalla); de mått som går att passa står i PASS_TGT.
Med --namn N skrivs standarddocka_<docka>_N.blend/.glb och docka-rapport-<docka>_N.json i stället, så att de modeller som
används inte skrivs över medan en ny prövas. En docka per körning av bygg_en: allt från den förra (också dess vila
sitt_vila) tas bort först, så att varje fil bara har sin egen.

Kräver MPFB2 som Blender-tillägg i användarprofilen (bl_ext.user_default.mpfb).
Kör (utan --factory-startup, annars laddas inte tillägget):
    blender -b --python-exit-code 1 --python scen/bygg_docka.py [-- --kon kvinna|man|bada|danilo|frasse|tomasz_matt] [--namn N]
"""
import argparse, gzip, json, math, os, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from _bpy_hjalp import *  # noqa
import addon_utils
import numpy as np
from gemensamt.riggverktyg import sikta_ben, tvaled_ik, SIDOR, KRAVDA_BEN, satt_rotation_varld, hand_axlar
from gemensamt.sokvagar import slask

OUT = ROOT / 'assets' / 'docka'
D = STD['docka']; FZ = STD['filt_z']

addon_utils.enable('bl_ext.user_default.mpfb', default_set=False)
from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402

ANSIKTSBEN = [
    'jaw', 'eye.L', 'eye.R',
    'orbicularis03.L', 'orbicularis03.R', 'orbicularis04.L', 'orbicularis04.R',
    'oculi01.L', 'oculi01.R', 'oculi02.L', 'oculi02.R',
    'oris01', 'oris05', 'risorius03.L', 'risorius03.R',
]

# ARKit-mappning från MPFB:s inbyggda uttrycks-targets (caucasian + mouth):
# (arkit_namn, [(target_relpath, weight)], split_lr: None | 'L' | 'R')
ARKIT_KARTA = [
    ('eyeBlinkLeft', [('expression/units/caucasian/eye-left-closure.target.gz', 1.0)], None),
    ('eyeBlinkRight', [('expression/units/caucasian/eye-right-closure.target.gz', 1.0)], None),
    ('eyeWideLeft', [('expression/units/caucasian/eye-left-opened-up.target.gz', 1.0)], None),
    ('eyeWideRight', [('expression/units/caucasian/eye-right-opened-up.target.gz', 1.0)], None),
    ('eyeSquintLeft', [('expression/units/caucasian/eye-left-slit.target.gz', 1.0)], None),
    ('eyeSquintRight', [('expression/units/caucasian/eye-right-slit.target.gz', 1.0)], None),
    ('browDownLeft', [('expression/units/caucasian/eyebrows-left-down.target.gz', 1.0)], None),
    ('browDownRight', [('expression/units/caucasian/eyebrows-right-down.target.gz', 1.0)], None),
    ('browInnerUp', [('expression/units/caucasian/eyebrows-left-inner-up.target.gz', 1.0),
                     ('expression/units/caucasian/eyebrows-right-inner-up.target.gz', 1.0)], None),
    ('browOuterUpLeft', [('expression/units/caucasian/eyebrows-left-extern-up.target.gz', 1.0)], None),
    ('browOuterUpRight', [('expression/units/caucasian/eyebrows-right-extern-up.target.gz', 1.0)], None),
    ('jawOpen', [('expression/units/caucasian/mouth-open.target.gz', 1.0)], None),
    ('mouthSmileLeft', [('expression/units/caucasian/mouth-corner-puller.target.gz', 1.0)], 'L'),
    ('mouthSmileRight', [('expression/units/caucasian/mouth-corner-puller.target.gz', 1.0)], 'R'),
    ('mouthFrownLeft', [('expression/units/caucasian/mouth-depression.target.gz', 1.0)], 'L'),
    ('mouthFrownRight', [('expression/units/caucasian/mouth-depression.target.gz', 1.0)], 'R'),
    ('mouthPucker', [('expression/units/caucasian/mouth-pursing.target.gz', 1.0)], None),
    ('mouthFunnel', [('expression/units/caucasian/mouth-protusion.target.gz', 1.0)], None),
    ('mouthPressLeft', [('expression/units/caucasian/mouth-compression.target.gz', 1.0)], 'L'),
    ('mouthPressRight', [('expression/units/caucasian/mouth-compression.target.gz', 1.0)], 'R'),
    ('mouthUpperUpLeft', [('expression/units/caucasian/mouth-elevation.target.gz', 1.0)], 'L'),
    ('mouthUpperUpRight', [('expression/units/caucasian/mouth-elevation.target.gz', 1.0)], 'R'),
    ('mouthLowerDownLeft', [('expression/units/caucasian/mouth-eversion.target.gz', 1.0)], 'L'),
    ('mouthLowerDownRight', [('expression/units/caucasian/mouth-eversion.target.gz', 1.0)], 'R'),
    ('mouthStretchLeft', [('expression/units/caucasian/mouth-retraction.target.gz', 1.0)], 'L'),
    ('mouthStretchRight', [('expression/units/caucasian/mouth-retraction.target.gz', 1.0)], 'R'),
    ('mouthDimpleLeft', [('mouth/mouth-dimples-in.target.gz', 1.0)], 'L'),
    ('mouthDimpleRight', [('mouth/mouth-dimples-in.target.gz', 1.0)], 'R'),
    ('noseSneerLeft', [('expression/units/caucasian/nose-left-elevation.target.gz', 1.0)], None),
    ('noseSneerRight', [('expression/units/caucasian/nose-right-elevation.target.gz', 1.0)], None),
]


# Människans mått för kön och längd. Kroppen är MPFB:s egen för könet och längden (makrot height letas fram, så att
# MPFB:s egna proportioner för just den längden gäller). `passa` flyttar ett mått till människans medel, ANSUR II (US Army
# 2012, de offentliga data) för personer av samma kön och längd ±2 cm, där MPFB:s eget avviker; alla tal är det färdiga
# måttet efter skalningen till längden, och passas tillsammans (passa_matt nedan), eftersom de rör varandra.
# - Leder: överarm = akromion-radiale - 0,0257 x längden (axelleden under akromion) - 0,010 (armbågsleden över radiale);
#   underarm = radiale-stylion + 0,005; axelleder = biakromial bredd - dockans egen hud utanför leden (31 mm hos kvinnan).
#   Hand och fot är hudens mått.
# - Armarnas tjocklek: hudens omkrets i ett snitt vinkelrätt mot benet, som ett måttband (konvext hölje): underarmen där
#   den är tjockast (en tiondel till tre tiondelar från armbågen), handleden (97 % av vägen till handleden) och överarmen
#   på mitten, mot en avslappnad arm (ANSUR mäter underarmen spänd: 309 mm hos männen, 266 hos kvinnorna). MPFB:s egna
#   armar var en femtedel för smala (underarmen 255 mot 290 mm hos mannen).
# - Bara mannen: höftleden och knäleden över golvet (ANSUR trochanterion 896 [855-949], laterala epikondylen 489; MPFB:s
#   egna ben var 3,5 cm för långa), bålen höftled-axelled (ANSUR akromion-trochanter 539 - akromion över axelleden 56) och
#   huvudets bredd (ANSUR 155 [146-164]; hans var 147). Det benen lämnar går till bålen och halsen (hals None: resten, så
#   att huvudet behåller MPFB:s egen storlek och längden står kvar; hans axelleder låg 18 mm högre än ANSUR:s).
MATT = {
    'man': {'langd': 1.75, 'passa': {'ua': 0.279, 'fa': 0.272, 'hand': 0.193, 'fot': 0.271,
                                     'fa_omkr': 0.290, 'handled_omkr': 0.170, 'ua_omkr': 0.320,
                                     'hoft_h': 0.903, 'kna_h': 0.490, 'ht': 0.483, 'hals': None, 'huvud_b': 0.152},
            'kalla': 'längden: ANSUR II män medel 1,756 m; måtten: ANSUR II män 1,73-1,77 m (n 940): akromion-radiale 333,7, '
                     'radiale-stylion 266,7, hand 192,9, fot 270,7, trochanterion 896,1, laterala epikondylen 489,1, '
                     'akromion-trochanter 538,7, huvudets bredd 154,5 mm; armarnas omkrets avslappnad 290/170/320 mm '
                     '(underarm/handled/överarm); MPFB:s egen axelbredd (hud 418 mot 415 mm) behålls'},
    'kvinna': {'langd': 1.65, 'passa': {'ua': 0.263, 'fa': 0.249, 'sw': 0.337, 'hand': 0.1824, 'fot': 0.2488,
                                        'fa_omkr': 0.255, 'handled_omkr': 0.150, 'ua_omkr': 0.285},
               'kalla': 'längden: ANSUR II kvinnor medel 1,629 m, 10 cm under mannen; måtten: ANSUR II kvinnor 1,63-1,67 m (n 442): '
                        'akromion-radiale 315,5, radiale-stylion 244,1, biakromial 368,0, hand 182,4, fot 248,8 mm; armarnas '
                        'omkrets avslappnad 255/150/285 mm (underarm/handled/överarm); MPFB:s egen bål, ben och huvud behålls'},
}
# Danilo och Frasse (Jakob 2026-11-27): två dealrar ur en film, byggda som mannen med det som gick att mäta på dem genom
# kameran (live-bj/data/uppsattning.json, dealer.kameran.body och dealer.bordet.body): axellederna isär (sw) och hakan till
# hjässan (huvud_h, skattad: ansiktets höjd och en fjärdedel för skallen). Bara måtten: ansiktet är dockans eget, och inget
# av deras utseende byggs in. Halsen är mannens (haka None: hakan lika högt över axellederna som hos honom), inte filmens:
# hakan över axellinjen mättes på en sittande dealer genom en kamera som ser 18 grader nedåt, med händerna på bordet,
# axlarna lyfta och huvudet framåt, så den är hållning och synvinkel och hör hemma i rörelsen (dockans huvud och axlar
# ställs per ruta); byggd ur filmen (6,3 och 8,9 cm mot hans 13,3) såg båda ut att sakna hals. Allt annat är mannens: kroppen
# börjar som hans (grund: samma makron och samma MPFB-kropp för hans längd), och armarna, händerna, fötterna, benen, bålen
# och armarnas tjocklek passas till hans mått, så att rörelserna passar. Huvudets bredd är hans i samma förhållande som
# höjden (huvud_b None; huvud_h tar höjden och djupet lika), så att ansiktet bara blir större eller mindre. Midjan och
# höften syntes inte (bordet): hans, och Danilos lite smalare (Jakob: "yngre och smalare"): `som_grund` är målet som en
# andel av måttet på grundens kropp före passningen. Längden (langd None) följer av delarna: höftleden och bålen som
# mannens, halsen och huvudet som de mättes. Ögonen över axellinjen mättes också (Danilo 0,191, Frasse 0,204 m) men
# passas inte: de följer av hakan och dockans eget ansikte, och rapporten skriver var de hamnade (ogon).
_MANNENS = {k: MATT['man']['passa'][k] for k in ('ua', 'fa', 'hand', 'fot', 'fa_omkr', 'handled_omkr', 'ua_omkr', 'hoft_h', 'kna_h', 'ht')}
MATT['danilo'] = {'grund': 'man', 'langd': None, 'passa': {**_MANNENS, 'sw': 0.357, 'haka': None, 'huvud_h': 0.228, 'huvud_b': None,
                                                            'midja_omkr': None, 'hoft_omkr': None},
                  'som_grund': {'midja_omkr': 0.96, 'hoft_omkr': 0.97},
                  'kalla': 'filmen (live-bj, dealer.kameran.body): axellederna 0,357 m isär, hakan till hjässan 0,228 m (skattad); '
                           'halsen mannens (filmens är hållning); midja och höft dolda: mannens, 4 och 3 % smalare; resten mannens'}
MATT['frasse'] = {'grund': 'man', 'langd': None, 'passa': {**_MANNENS, 'sw': 0.348, 'haka': None, 'huvud_h': 0.210, 'huvud_b': None},
                  'kalla': 'filmen (live-bj, dealer.bordet.body): axellederna 0,348 m isär, hakan till hjässan 0,210 m (skattad); '
                           'halsen mannens (filmens är hållning); midja och höft dolda: mannens; resten mannens'}
# En person efter sina mått (Tomasz, Jakob 2026-11-27: "Danilo har ju alla rörelser och fysik vi vill ha, men Tomasz är ju
# mycket större"): mannens kropp med det som skiljer personen från honom mer än mätningens osäkerhet. Tomasz är framställd;
# han är mätt på sin egen figur ur Meshy (assets/docka/standarddocka_tomasz.glb, 1,80 m med skor och hår) och sina bilder
# (output/tomasz/01-referenser/), med samma mätning på mannen bredvid; hur varje tal är mätt och hur osäkert det är står i
# provet tomasz-dockan-pa-hans-matt-20261127. Längden är ett antagande (en framställd bild har inget av känd storlek):
# figurens, ungefär 1,76 m utan skor och hår. Han är bredare: axellederna, bröstet, midjan och höften (huden genom skjortan
# och byxorna, med kläderna avdragna, gissat 4,5, 7,5 och 8 cm i omkrets), halsen och huvudet (höjden och bredden med
# håret avdraget, gissat 1,2 cm överst; käken). Armarna, händerna och bålens och halsens längd mättes inom en till två
# centimeter från mannens, lika med osäkerheten i Meshys leder genom ärmarna, så de är mannens. Huvudets djup följer
# höjden (huvud_h tar båda). Filen heter standarddocka_tomasz_matt, så att hans Meshy-figur (standarddocka_tomasz) står kvar.
MATT['tomasz_matt'] = {'grund': 'man', 'langd': None,
                       'passa': {**_MANNENS, 'sw': 0.39, 'haka': None, 'huvud_h': 0.241, 'huvud_b': 0.160, 'kak_b': 0.141,
                                 'haka_b': 0.1195, 'hals_omkr': 0.398, 'brost_omkr': 1.019, 'midja_omkr': 0.930, 'hoft_omkr': 1.060},
                       'kalla': 'hans Meshy-figur (1,80 m med skor och hår, antaget) och bilderna, mätta bredvid mannen: axellederna 0,39 m '
                                'isär (huden över axlarna +2 %, bröstet under armhålan +9 % mot mannens), bröst/midja/höft 1,019/0,930/1,060 m '
                                '(skjortan och byxorna avdragna, gissat), halsen 0,398 m (som käken mot mannens), hakan till hjässan 0,241 m '
                                'och huvudets bredd 0,160 m (håret avdraget, gissat), käken 0,141 m (huden); armar, händer, ben, bålens '
                                'och halsens längd mannens (inom Meshy-ledernas osäkerhet)'}
PASS_TGT = {  # måttet -> MPFB-targets (utan -incr/-decr), höger och vänster med samma vikt
    'hand': ['hands/r-hand-scale', 'hands/l-hand-scale'],
    'fot': ['feet/r-foot-scale-depth', 'feet/l-foot-scale-depth'],
    'ua': ['arms/measure-upperarm-length'],
    'fa': ['arms/measure-lowerarm-length'],
    'sw': ['torso/measure-shoulder-dist'],
    # underarmens tvärsnitt i båda leden vinkelräta mot den (scale-horiz förlänger den i stället), så att MPFB:s egen form
    # längs den står kvar; handleden har en egen; överarmen MPFB:s måttband
    'fa_omkr': ['arms/r-lowerarm-scale-depth', 'arms/l-lowerarm-scale-depth', 'arms/r-lowerarm-scale-vert', 'arms/l-lowerarm-scale-vert'],
    'handled_omkr': ['hands/measure-wrist-circ'],
    'ua_omkr': ['arms/measure-upperarm-circ'],
    'hoft_h': ['legs/measure-upperleg-height'],
    'kna_h': ['legs/measure-lowerleg-height'],
    'ht': ['torso/measure-napetowaist-dist'],
    'hals': ['neck/measure-neck-height'],
    'huvud_b': ['head/head-scale-horiz'],
    # Danilo och Frasse: hakan över axellinjen med halsens längd, som mannens hals; huvudets höjd och djup lika (bredden är
    # huvud_b; höjden skalas kring ögonen, så hakan flyttas också), midjan och höften med MPFB:s måttband
    'haka': ['neck/measure-neck-height'],
    'huvud_h': ['head/head-scale-vert', 'head/head-scale-depth'],
    'midja_omkr': ['torso/measure-waist-circ'],
    'hoft_omkr': ['torso/measure-hips-circ'],
    # en person efter mått: bröstets omkrets, halsens omkrets, ansiktets bredd vid käken (kinderna) och underkäkens bredd
    # närmare hakan (käkbenen; hakans egen bredd, chin-width, flyttar inte måttet)
    'brost_omkr': ['torso/measure-bust-circ'],
    'hals_omkr': ['neck/measure-neck-circ'],
    'kak_b': ['cheek/r-cheek-volume', 'cheek/l-cheek-volume'],
    'haka_b': ['chin/chin-bones'],
}


# En person ur sina egna bilder (steg 15, personer/<person>.json; Jakob 2026-11-27: "ett generiskt sätt att få en pipeline
# för en helt och hållet ny dealer"): en nyckel i MATT per fil, dockans namn ur filen (docka.namn). Personen byggs på dockan
# vars rörelser den spelar (docka.grund: Danilo för stilen kameran, Frasse för bordet): grundens mått, utom de som
# mätningen skiljer från grundens mer än sin osäkerhet (docka.passa, skrivna av steg 15, inte för hand). Ingen rad här per
# person: en ny person är en ny fil.
def _personer():
    for f in sorted((ROOT / 'personer').glob('*.json')):
        d = json.loads(f.read_text(encoding='utf-8'))['docka']
        g = MATT[d['grund']]
        if d['namn'] in MATT and MATT[d['namn']].get('person') != f.name:
            raise SystemExit(f'personer/{f.name}: dockan {d["namn"]} finns redan i MATT')
        MATT[d['namn']] = {'grund': g.get('grund', d['grund']), 'langd': g['langd'], 'passa': {**g['passa'], **d['passa']}, 'person': f.name,
                           **({'som_grund': g['som_grund']} if 'som_grund' in g else {}),
                           'kalla': f'personer/{f.name} (steg 15, mätt ur bilderna): {", ".join(f"{k} {v}" for k, v in d["passa"].items()) or "inget skiljer"}; '
                                    f'resten {d["grund"]}s ({g["kalla"]})'}


_personer()
# Vridbenen: två per underarm, barn till underarmens ben och liggande längs det, vid en tredjedel och två tredjedelar av
# dess längd. Underarmens vikt delas mellan ForeArm, ForeArmTwist1 och ForeArmTwist2 efter hörnets läge längs underarmen
# (u = 0 vid armbågen, 1 vid handleden): bara ForeArm vid armbågen, lika mycket ForeArm och Twist1 vid u = 0,25, bara
# Twist1 vid u = 0,5, bara Twist2 vid handleden och bortom den (linjärt emellan). Handens egna vikter rörs inte, så en kod
# som inte känner vridbenen (de följer ForeArm) ställer dockan exakt som förut.
VRID_NOD = (0.0, 0.5, 1.0)

# Vilan i Blender (sitt_vila) står som dockan sitter i editorn och studion, så att samma scen inte ställs med två tal.
# Standardramen: meter, Y bakåt från spelets dealerkant, Z upp; höjderna här över filten. Talen ska följa spelet:
# - axellederna: `place` för MAN i blackjack-dealer/dealer3d/src/doll.ts (kind 'seat': shoulderHeight, behindEdge, x),
#   rak bål under dem;
# - låren: LAR i blackjack-dealer/dealer3d/src/sitter.ts (larRiktning), med rörelsens höft (hoft_under_filt) som där;
#   smalbenen som figure-model.ts ställer dem;
# - handlederna: vilan (ankare 1) som editorn spelar den för mannen, på filten framför markerbrickan.
SITT = {'axlar_over_filt': 0.31, 'axlar_bakom_kant': 0.38, 'x': -0.0159, 'hoft_under_filt': 0.162,
        'lar': {'ut': 0.12, 'fall': 0.08, 'fran': -0.19, 'brant': 6},
        'handled': {'Right': (-0.207, 0.0963, 0.0341), 'Left': (0.1793, 0.0948, 0.0294)}}

# Ansiktet (Jakob 2026-11-27: dockan ska kunna titta på spelaren, le och lyfta brynen, och det ska synas i spelets vy).
# Färgerna är hörnfärger (färgattributet 'farg', ett värde per ythörn så att kanterna blir skarpa) på dockans enda
# material, så att modellen förblir en mesh med ett material, i glTF en enda primitiv: dealer3d/tools/modell.ts läser
# den första primitiven och figure-model.ts huden som en mesh. Färgerna är linjära; huden är dockans neutrala grå.
# - Ögonen: en glob per öga på ögonbenet (eye.L/eye.R, vikt 1), med mitten i benets huvud och MPFB:s egen ögonradie (dess
#   hjälpklot, som ögonlocken är formade efter), polen rakt fram (dit figure-model.ts räknar att ögat ser i vila) och
#   ringar vid pupillens och irisens kant (grader från polen), så att de blir runda.
# - Brynen: en tunn yta `over_huden` utanför huden över varje öga, med varje hörn bundet till huden under sig (samma
#   ansiktsformer och vikter, interpolerade på ytan det ligger på), så att brynet följer browInnerUp/browOuterUp/browDown.
#   Formen framifrån i ögats radier R från ögats mitt: tre punkter längs brynet (inre änden, toppen, yttre änden) med
#   läget ut från näsan (`ut`, negativt inåt), höjden över ögats mitt (`hojd`) och tjockleken (`tjock`).
# - Munnen: munhålan mörk och läpparna något mörkare än huden (ytorna MPFB:s egna masker för munnens insida och läpparna
#   täcker på UV), och MPFB:s tänder (hjälpgeometrin; jawOpen och käkbenet flyttar de nedre) står kvar. Tungan
#   (också hjälpgeometri) står inte kvar: jawOpen flyttar den knappt, så den låg kvar uppe vid gommen i en öppen mun.
ANSIKTE = {
    'farg': {'hud': (0.62, 0.6, 0.58), 'vitan': (0.78, 0.76, 0.72), 'iris': (0.03, 0.022, 0.017), 'pupill': (0.002, 0.002, 0.002),
             'bryn': (0.035, 0.028, 0.024), 'munhala': (0.012, 0.005, 0.005), 'lappar': (0.5, 0.42, 0.41), 'tander': (0.72, 0.7, 0.64)},
    'iris_grader': 26, 'pupill_grader': 10, 'ogats_radie': 0.985,  # andel av hjälpklotets radie
    'bryn': {'ut': (-1.2, 0.5, 1.65), 'hojd': (1.15, 1.4, 1.15), 'tjock': (0.45, 0.33, 0.12), 'over_huden': 0.0006, 'delar': 20},
}
TANDER = ('helper-upper-teeth', 'helper-lower-teeth')  # MPFB:s hjälpgrupper som står kvar efter MASK


def las_target(path: Path):
    deltas = {}
    with gzip.open(path, 'rt', encoding='utf-8') as fh:
        for line in fh:
            parts = line.split()
            if len(parts) == 4 and not parts[0].startswith('#'):
                deltas[int(parts[0])] = (float(parts[1]), -float(parts[3]), float(parts[2]))
    return deltas


def _rensa():
    """Tar bort allt från en tidigare docka i samma Blender: objekten och all data, också aktionerna (sitt_vila har en
    falsk användare och följde annars med in i nästa dockas fil)."""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for dblock in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions):
        for item in list(dblock):
            dblock.remove(item)


def _hojd(obj):
    """Kroppens höjd i meter (hjässa till sula, utan hjälpgeometrin), med de shape keys som är på."""
    me = obj.data; n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(n, 3).copy()
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            if kb != me.shape_keys.reference_key and kb.value != 0:
                a = np.empty(n * 3); kb.data.foreach_get('co', a); r = np.empty(n * 3); kb.relative_key.data.foreach_get('co', r)
                co += kb.value * (a - r).reshape(n, 3)
    g = obj.vertex_groups.get('body')
    if g is not None:
        idx = [v.index for v in me.vertices if any(ge.group == g.index for ge in v.groups)]
        co = co[idx]
    return float(co[:, 2].max() - co[:, 2].min())


def _naturlig_kropp(macro, langd):
    """MPFB-kroppen vars egen längd är `langd` m: makrot `height` letas fram, så att MPFB:s proportioner för den längden
    gäller och skalningen efteråt blir nära 1."""
    def ny(h):
        _rensa()
        macro['height'] = h
        b = HumanService.create_human(scale=0.1, macro_detail_dict=macro, feet_on_ground=True)
        return b, _hojd(b)
    h0 = 0.5; b, H0 = ny(h0)
    h1 = 0.6; b, H1 = ny(h1)
    for _ in range(4):
        if abs(H1 - langd) < 0.002 or abs(H1 - H0) < 1e-6:
            break
        h2 = min(1.0, max(0.0, h1 + (langd - H1) * (h1 - h0) / (H1 - H0)))
        h0, H0 = h1, H1
        h1 = h2; b, H1 = ny(h1)
    print(f'MPFB-LÄNGD height={h1:.4f} ger {H1:.4f} m (mål {langd} m)')
    return b, round(h1, 4)


def _hull_omkrets(q):
    """Omkretsen av det konvexa höljet kring punkterna q (N x 2), som ett måttband runt snittet."""
    q = sorted(map(tuple, q))
    if len(q) < 3:
        return 0.0
    def kors(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in q:
        while len(lo) >= 2 and kors(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(q):
        while len(hi) >= 2 and kors(hi[-2], hi[-1], p) <= 0:
            hi.pop()
        hi.append(p)
    h = np.array(lo[:-1] + hi[:-1])
    return float(np.linalg.norm(h - np.roll(h, 1, axis=0), axis=1).sum())


def _omkrets(co, kanter, a, b, t, radie=0.075):
    """Hudens omkrets i planet vinkelrätt mot a->b vid andelen t: kanterna som planet skär, inom `radie` från benet."""
    d = (b - a) / np.linalg.norm(b - a); p = a + t * (b - a)
    s = (co - p) @ d; sa, sb = s[kanter[:, 0]], s[kanter[:, 1]]; m = sa * sb < 0
    f = sa[m] / (sa[m] - sb[m]); pts = co[kanter[m, 0]] + f[:, None] * (co[kanter[m, 1]] - co[kanter[m, 0]])
    pts = pts[np.linalg.norm(pts - p, axis=1) < radie]
    u = np.cross(d, [0, 0, 1.0]); u /= np.linalg.norm(u); w = np.cross(d, u)
    return _hull_omkrets(np.c_[(pts - p) @ u, (pts - p) @ w])


def _vagrat_snitt(co, kanter, z):
    """Punkterna där huden skär det vågräta planet på höjden z."""
    sa, sb = co[kanter[:, 0], 2] - z, co[kanter[:, 1], 2] - z; m = sa * sb < 0
    f = sa[m] / (sa[m] - sb[m]); return co[kanter[m, 0]] + f[:, None] * (co[kanter[m, 1]] - co[kanter[m, 0]])


def _vagrat_omkrets(co, kanter, z, bredd=0.25):
    """Hudens omkrets i det vågräta planet på höjden z (bålen: inom `bredd` från mittlinjen, armarna utanför)."""
    pts = _vagrat_snitt(co, kanter, z)
    return _hull_omkrets(pts[np.abs(pts[:, 0]) < bredd][:, :2])


def _vridben_vikter(body, rig):
    """Högst fyra ben per hörn med summan 1 (det glTF-exporten annars gör själv), och underarmens vikt delad mellan
    ForeArm och de två vridbenen efter VRID_NOD. Returnerar räkningen för rapporten."""
    deform = {b.name for b in rig.data.bones if b.use_deform}
    namn = {g.index: g.name for g in body.vertex_groups}
    vgs = {g.name: g for g in body.vertex_groups}
    begransade = 0
    for v in body.data.vertices:
        infl = sorted(((ge.weight, ge.group) for ge in v.groups if namn[ge.group] in deform and ge.weight > 0), reverse=True)
        tot = sum(w for w, _ in infl[:4])
        if len(infl) > 4 or abs(tot - 1.0) > 1e-6:
            begransade += 1
            for w, g in infl[4:]:
                body.vertex_groups[g].remove([v.index])
            for w, g in infl[:4]:
                body.vertex_groups[g].add([v.index], w / tot, 'REPLACE')
    M = rig.matrix_world.inverted() @ body.matrix_world
    ut = {'hornen_begransade_till_fyra': begransade}
    for side in ('Right', 'Left'):
        fa = rig.data.bones[side + 'ForeArm']; e, wr = fa.head_local, fa.tail_local; dvec = wr - e; L = dvec.length; dvec = dvec / L
        g_fa = vgs[side + 'ForeArm']; g_t = [body.vertex_groups.new(name=f'{side}ForeArmTwist{j}') for j in (1, 2)]
        delade = sammanslagna = 0
        for v in body.data.vertices:
            wf = next((ge.weight for ge in v.groups if ge.group == g_fa.index), 0.0)
            if wf <= 0:
                continue
            u = (M @ v.co - e).dot(dvec) / L
            n0, n1, n2 = VRID_NOD
            if u <= n0:
                del_ = [wf, 0.0, 0.0]
            elif u < n1:
                f = (u - n0) / (n1 - n0); del_ = [wf * (1 - f), wf * f, 0.0]
            elif u < n2:
                f = (u - n1) / (n2 - n1); del_ = [0.0, wf * (1 - f), wf * f]
            else:
                del_ = [0.0, 0.0, wf]
            for i in range(3):  # en liten del (under 0,1 %) läggs till grannen, så att inget ben får en vikt som inget gör
                if 0 < del_[i] < 1e-3 * wf:
                    j = i + 1 if i < 2 and del_[i + 1] > 0 else i - 1
                    del_[j] += del_[i]; del_[i] = 0.0
            antal = sum(1 for ge in v.groups if namn.get(ge.group) in deform and ge.weight > 0) - 1 + sum(1 for x in del_ if x > 0)
            if antal > 4:  # då hela underarmens vikt på det ben som har mest av den
                k = int(np.argmax(del_)); del_ = [wf if i == k else 0.0 for i in range(3)]; sammanslagna += 1
            for g, x in zip([g_fa] + g_t, del_):
                if x > 0:
                    g.add([v.index], x, 'REPLACE')
                elif g is g_fa:
                    g.remove([v.index])
            delade += 1
        ut[side] = {'horn_med_underarmsvikt': delade, 'samlade_pa_ett_ben_for_fyra': sammanslagna}
    return ut


def _ogonklot(mitt, radie, fram, iris, pupill, varv=32):
    """En ögonglob runt `mitt` med polen åt `fram` och ringar vid pupillens och irisens kant (grader från polen), så att
    de blir runda. Returnerar bmesh och varje ytas färg (ANSIKTE['farg']) i ytornas ordning."""
    fram = fram.normalized(); a = fram.orthogonal().normalized(); b = fram.cross(a)
    vinklar = [pupill * 0.5, pupill, (pupill + iris) * 0.5, iris] + [float(x) for x in np.linspace(iris + 9, 170, 9)]
    bm = bmesh.new(); pol = bm.verts.new(mitt + fram * radie); ringar = []
    for th in vinklar:
        t = math.radians(th)
        ringar.append([bm.verts.new(mitt + radie * (math.cos(t) * fram + math.sin(t) * (math.cos(f) * a + math.sin(f) * b)))
                       for f in (2 * math.pi * j / varv for j in range(varv))])
    bak = bm.verts.new(mitt - fram * radie); farg = []
    for j in range(varv):
        bm.faces.new((pol, ringar[0][j], ringar[0][(j + 1) % varv])); farg.append('pupill')
    for k in range(1, len(ringar)):
        vad = 'pupill' if vinklar[k] <= pupill + 1e-6 else 'iris' if vinklar[k] <= iris + 1e-6 else 'vitan'
        for j in range(varv):
            bm.faces.new((ringar[k - 1][j], ringar[k][j], ringar[k][(j + 1) % varv], ringar[k - 1][(j + 1) % varv])); farg.append(vad)
    for j in range(varv):
        bm.faces.new((ringar[-1][j], bak, ringar[-1][(j + 1) % varv])); farg.append('vitan')
    bm.normal_update()
    for f in bm.faces:
        f.smooth = True
        if f.normal.dot(f.calc_center_median() - mitt) < 0:
            f.normal_flip()
    return bm, farg


def _ansikte(body, rig, col, klot, s):
    """Ögon, bryn och munhåla (ANSIKTE ovan) i dockans mesh: kroppens ytor färgas i 'farg', ögongloberna och brynen fogas
    in med sina vikter, färger och (brynen) ansiktsformer. Körs efter vikterna och ansiktsformerna, i OBJECT-läge.
    `klot`: MPFB:s ögonklot per sida (mitt och radie före skalningen `s`). Returnerar det rapporten behöver."""
    from mathutils.bvhtree import BVHTree
    from mathutils.interpolate import poly_3d_calc
    A = ANSIKTE; F = {k: (*v, 1.0) for k, v in A['farg'].items()}
    me = body.data; ut = {}
    till_kropp = body.matrix_world.inverted() @ rig.matrix_world
    deform = {b.name for b in rig.data.bones if b.use_deform}
    vg_namn = {g.index: g.name for g in body.vertex_groups}

    # -- kroppens egna ytor: munhålan och läpparna ur MPFB:s masker (på UV), tänderna ur sina hjälpgrupper
    masker = {}
    for vad, fil in (('munhala', 'mpfb_inside-mouth.jpg'), ('lappar', 'mpfb_lips.jpg')):
        bild = bpy.data.images.load(str(Path(LocationService.get_mpfb_data('textures')) / fil))
        W, H = bild.size; masker[vad] = np.array(bild.pixels[:]).reshape(H, W, 4)[:, :, 0]; bpy.data.images.remove(bild)
    uv = np.empty(len(me.loops) * 2); me.uv_layers['UVMap'].data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
    i_grupp = {}
    for v in me.vertices:
        for ge in v.groups:
            i_grupp.setdefault(vg_namn[ge.group], set()).add(v.index)
    for g in TANDER:
        if not i_grupp.get(g):
            raise SystemExit(f'{g} saknas i dockan: tänderna skulle stå kvar efter MASK')
    tander = set().union(*(i_grupp[g] for g in TANDER))
    hornfarg = np.tile(F['hud'], (len(me.loops), 1)); antal = {'tander': 0, **{k: 0 for k in masker}}
    for p in me.polygons:
        li = list(p.loop_indices)
        vad = 'tander' if set(p.vertices) <= tander else None
        if vad is None:
            u, v = uv[li].mean(axis=0)
            vad = next((k for k, m in masker.items() if m[min(m.shape[0] - 1, max(0, int(v * m.shape[0]))), min(m.shape[1] - 1, max(0, int(u * m.shape[1])))] > 0.5), None)
        if vad:
            hornfarg[li] = F[vad]; antal[vad] += 1
    me.color_attributes.new('farg', 'FLOAT_COLOR', 'CORNER').data.foreach_set('color', hornfarg.ravel())
    ut['ytor'] = antal

    nya = []

    def ny(namn, bm, del_nr, ytfarg, vikter):
        """Ett nytt objekt i kroppens rum ur `bm`, med sin del i 'ansikte_del', en färg per yta och vikterna per hörn."""
        m = bpy.data.meshes.new(namn); bm.to_mesh(m); bm.free()
        o = bpy.data.objects.new(namn, m); col.objects.link(o); o.matrix_world = body.matrix_world.copy()
        m.attributes.new('ansikte_del', 'INT', 'POINT').data.foreach_set('value', [del_nr] * len(m.vertices))
        c = np.zeros((len(m.loops), 4))
        for p in m.polygons:
            c[list(p.loop_indices)] = F[ytfarg[p.index]]
        m.color_attributes.new('farg', 'FLOAT_COLOR', 'CORNER').data.foreach_set('color', c.ravel())
        for vi, par in enumerate(vikter):
            for g, w in par:
                (o.vertex_groups.get(g) or o.vertex_groups.new(name=g)).add([vi], w, 'REPLACE')
        nya.append(o)

    # -- ögonen: mitten i ögonbenets huvud, MPFB:s radie
    ogon = {}
    for sida in ('L', 'R'):
        ben = f'eye.{sida}'; mitt = till_kropp @ rig.data.bones[ben].head_local
        k_mitt, k_radie = klot[sida][0] * s, klot[sida][1] * s
        r = k_radie * A['ogats_radie']; ogon[sida] = (mitt, r)
        bm, ytfarg = _ogonklot(mitt, r, Vector((0, -1, 0)), A['iris_grader'], A['pupill_grader'])
        n = len(bm.verts)
        ny(f'oga_{sida}', bm, 1 if sida == 'L' else 2, ytfarg, [[(ben, 1.0)]] * n)
        ut[ben] = {'mitt_m': [round(x, 4) for x in mitt], 'radie_mm': round(r * 1000, 2),
                   'hjalpklotets_mitt_fran_benet_mm': round((k_mitt - mitt).length * 1000, 2), 'horn': n}

    # -- brynen: bundna till huden under sig
    bas = np.empty(len(me.vertices) * 3); me.shape_keys.reference_key.data.foreach_get('co', bas); bas = bas.reshape(-1, 3)
    trad = BVHTree.FromPolygons([Vector(p) for p in bas], [tuple(p.vertices) for p in me.polygons])
    B = A['bryn']; us, N = B['ut'], B['delar']

    def kvad(u, ys):  # andragradskurvan genom brynets tre punkter
        (u0, u1, u2), (y0, y1, y2) = us, ys
        return (y0 * (u - u1) * (u - u2) / ((u0 - u1) * (u0 - u2)) + y1 * (u - u0) * (u - u2) / ((u1 - u0) * (u1 - u2))
                + y2 * (u - u0) * (u - u1) / ((u2 - u0) * (u2 - u1)))

    def hudvikt(vs, w):  # huden under punkten: vikterna interpolerade, högst fyra ben, summan 1
        acc = {}
        for vi, wi in zip(vs, w):
            for ge in me.vertices[vi].groups:
                g = vg_namn[ge.group]
                if g in deform and ge.weight > 0:
                    acc[g] = acc.get(g, 0.0) + wi * ge.weight
        topp = sorted(acc.items(), key=lambda x: -x[1])[:4]; tot = sum(x for _, x in topp)
        return [(g, x / tot) for g, x in topp]

    bindning = {}
    for sida, del_nr in (('L', 3), ('R', 4)):
        E, R = ogon[sida]; sx = 1.0 if E.x > 0 else -1.0
        bm = bmesh.new(); rader = []; bind = []; vikter = []
        for i in range(N + 1):
            u = us[0] + (us[2] - us[0]) * i / N; h = kvad(u, B['hojd']); t = float(np.interp(u, us, B['tjock']))
            rad = []
            for f in (0.5, 0.0, -0.5):
                loc, nor, fi, _ = trad.ray_cast(Vector((E.x + sx * u * R, E.y - 0.2, E.z + (h + f * t) * R)), Vector((0, 1, 0)))
                if loc is None:
                    raise SystemExit(f'brynet ({sida}) når inte huden vid u={u:.2f}')
                if nor.y > 0:
                    nor = -nor
                vs = list(me.polygons[fi].vertices); w = poly_3d_calc([Vector(bas[k]) for k in vs], loc)
                rad.append(bm.verts.new(loc + nor * B['over_huden'])); bind.append((vs, list(w))); vikter.append(hudvikt(vs, w))
            rader.append(rad)
        for i in range(N):
            for r in range(2):
                bm.faces.new((rader[i][r], rader[i + 1][r], rader[i + 1][r + 1], rader[i][r + 1]))
        bm.normal_update()
        for f in bm.faces:
            f.smooth = True
            if f.normal.y > 0:
                f.normal_flip()
        bindning[del_nr] = bind
        ny(f'bryn_{sida}', bm, del_nr, ['bryn'] * len(bm.faces), vikter)
        ut[f'bryn.{sida}'] = {'horn': len(bind), 'ben': sorted({g for v in vikter for g, _ in v})}

    # -- in i kroppen; brynens hörn får hudens ansiktsformer
    with bpy.context.temp_override(active_object=body, object=body, selected_objects=[body] + nya, selected_editable_objects=[body] + nya):
        bpy.ops.object.join()
    del_av = np.empty(len(me.vertices), dtype=np.int32); me.attributes['ansikte_del'].data.foreach_get('value', del_av)
    ref = np.empty(len(me.vertices) * 3); me.shape_keys.reference_key.data.foreach_get('co', ref); ref = ref.reshape(-1, 3)
    for kb in me.shape_keys.key_blocks:
        if kb == me.shape_keys.reference_key:
            continue
        co = np.empty(len(me.vertices) * 3); kb.data.foreach_get('co', co); co = co.reshape(-1, 3); d = co - ref
        for del_nr, bind in bindning.items():
            idx = np.nonzero(del_av == del_nr)[0]
            if len(idx) != len(bind):
                raise SystemExit(f'brynet {del_nr}: {len(idx)} hörn efter sammanfogningen, {len(bind)} väntades')
            for j, (vs, w) in zip(idx, bind):
                co[j] = ref[j] + sum(wi * d[vi] for vi, wi in zip(vs, w))
        kb.data.foreach_set('co', co.ravel())
    ut['delar_efter_sammanfogning'] = {int(k): int((del_av == k).sum()) for k in np.unique(del_av)}
    me.attributes.remove(me.attributes['ansikte_del'])
    me.color_attributes.active_color = me.color_attributes['farg']
    return ut


def bygg_en(kon: str, suffix: str = ''):
    _rensa()
    sc = bpy.context.scene
    col = coll('standarddocka')
    grund = MATT[kon].get('grund', kon)  # kroppen dockan börjar som (Danilo och Frasse: mannens)
    is_man = (grund == 'man')
    namn = f'{kon}_{suffix}' if suffix else kon
    LANGD = MATT[kon]['langd']  # None: längden följer av delarna (Danilo och Frasse)

    # ---------------------------------------------------------------- 1. kropp + måttpassning + skelett
    macro = TargetService.get_default_macro_info_dict()
    macro.update({
        'gender': 1.0 if is_man else 0.0,
        'age': 0.5,
        'muscle': 0.55 if is_man else 0.5,
        'weight': 0.5,
        'proportions': 0.5,
        'height': 0.5,
    })
    body, mpfb_height = _naturlig_kropp(macro, MATT[grund]['langd'])

    def _koord():
        me = body.data; n = len(me.vertices); base = np.empty(n * 3); me.vertices.foreach_get('co', base); co = base.reshape(n, 3).copy()
        if me.shape_keys:
            ref = me.shape_keys.reference_key
            for kb in me.shape_keys.key_blocks:
                if kb == ref or kb.value == 0:
                    continue
                a = np.empty(n * 3); kb.data.foreach_get('co', a); r = np.empty(n * 3); kb.relative_key.data.foreach_get('co', r)
                co += kb.value * (a - r).reshape(n, 3)
        return co

    _grp = {g.index: g.name for g in body.vertex_groups}
    _idx = {}
    for v in body.data.vertices:
        for ge in v.groups:
            _idx.setdefault(_grp[ge.group], []).append(v.index)
    i_kropp = np.zeros(len(body.data.vertices), bool); i_kropp[_idx['body']] = True
    kanter = np.empty(len(body.data.edges) * 2, dtype=np.int64); body.data.edges.foreach_get('vertices', kanter); kanter = kanter.reshape(-1, 2)
    kanter = kanter[i_kropp[kanter[:, 0]] & i_kropp[kanter[:, 1]]]  # hudens kanter, utan hjälpgeometrin

    def matt():
        """Måtten som passas, i MPFB:s enheter före skalningen (meter vid skalan 1), på kroppen som den står nu."""
        co = _koord(); c = lambda n: co[_idx[n]].mean(axis=0); kropp = co[i_kropp]
        z0 = kropp[:, 2].min()
        rs, re_, rh, ls = c('joint-r-shoulder'), c('joint-r-elbow'), c('joint-r-hand'), c('joint-l-shoulder')
        hip = (c('joint-r-upper-leg') + c('joint-l-upper-leg')) / 2
        m = {'H': kropp[:, 2].max() - z0, 'ua': np.linalg.norm(rs - re_), 'fa': np.linalg.norm(re_ - rh), 'sw': np.linalg.norm(rs - ls),
             'ht': (rs + ls)[2] / 2 - hip[2], 'hoft_h': hip[2] - z0, 'kna_h': c('joint-r-knee')[2] - z0,
             'hals': c('joint-head')[2] - (rs + ls)[2] / 2, 'huvud': kropp[:, 2].max() - c('joint-head')[2]}
        nara = kropp[np.linalg.norm(kropp - c('joint-r-finger-3-4'), axis=1) < 0.03]
        m['hand'] = float(np.linalg.norm(nara - rh, axis=1).max())
        fot = kropp[(kropp[:, 2] < z0 + 0.10) & (kropp[:, 0] < -0.02)]  # hälen till tåspetsen
        m['fot'] = float(fot[:, 1].max() - fot[:, 1].min())
        m['fa_omkr'] = max(_omkrets(co, kanter, re_, rh, t) for t in (0.1, 0.15, 0.2, 0.25, 0.3))
        m['handled_omkr'] = _omkrets(co, kanter, re_, rh, 0.97)
        m['ua_omkr'] = _omkrets(co, kanter, rs, re_, 0.5)
        eye = (c('joint-r-eye') + c('joint-l-eye')) / 2; huv = kropp[kropp[:, 2] > eye[2] + 0.01]
        m['huvud_b'] = max(float(b[:, 0].max() - b[:, 0].min()) for b in (huv[np.abs(huv[:, 2] - z) < 0.004] for z in np.arange(eye[2] + 0.01, kropp[:, 2].max() - 0.02, 0.004)) if len(b))
        # hakan: hudens lägsta punkt på mittlinjen under munnen, högst 2 cm bakom ögonens mitt (längre bak går hakans
        # undersida över i halsen); över axelledernas linje, och till hjässan
        axl = (rs + ls)[2] / 2
        mitt = kropp[(np.abs(kropp[:, 0]) < 0.003) & (kropp[:, 1] < eye[1] + 0.02) & (kropp[:, 2] > eye[2] - 0.16) & (kropp[:, 2] < eye[2] - 0.07)]
        m['haka'] = mitt[:, 2].min() - axl; m['ogon'] = eye[2] - axl; m['huvud_h'] = kropp[:, 2].max() - mitt[:, 2].min()
        # bröstet 0,14 m under axellederna (bålen; armarna utanför), halsen där den är smalast mellan 3 cm över axellederna
        # och 1 cm under hakan, och käkens bredd 45 % av vägen från hakan till ögonen, framför öronen (6 cm bakom ögonen)
        hk = mitt[:, 2].min()
        m['brost_omkr'] = _vagrat_omkrets(co, kanter, axl - 0.14, bredd=0.21)
        m['hals_omkr'] = min(_vagrat_omkrets(co, kanter, z, bredd=0.09) for z in np.arange(axl + 0.03, hk - 0.01, 0.004))
        for k, andel in (('kak_b', 0.45), ('haka_b', 0.30)):  # käken och, närmare hakan, underkäkens bredd
            p = _vagrat_snitt(co, kanter, hk + andel * (eye[2] - hk)); p = p[(p[:, 1] < eye[1] + 0.06) & (np.abs(p[:, 0]) < 0.12)]
            m[k] = p[:, 0].max() - p[:, 0].min()
        # midjan (där bålen är smalast) och höften (4 cm under höftlederna, över sätet) som ett måttband i vågräta snitt,
        # armarna utanför (längre ned växer måttbandet kring båda låren, som går isär)
        m['midja_omkr'] = min(_vagrat_omkrets(co, kanter, z) for z in np.arange(hip[2] + 0.10, hip[2] + 0.255, 0.01))
        m['hoft_omkr'] = _vagrat_omkrets(co, kanter, hip[2] - 0.04)
        return {k: float(v) for k, v in m.items()}

    # Passningen: varje mått har sina targets med en vikt (incr eller decr). Måtten rör varandra (handleden följer
    # underarmen, höften knät, och allt följer skalningen till längden), så de passas tillsammans: F_j = m_j x längden -
    # mål_j x H = 0 för alla j (måttet efter skalningen lika med målet), med Newtons metod och verkan av varje target mätt
    # en gång vid vikten 1.
    tdir = Path(LocationService.get_mpfb_data('targets'))
    PASS = dict(MATT[kon]['passa']); nycklar = list(PASS)
    m0 = matt(); eff = {}
    if 'hals' in PASS and PASS['hals'] is None:  # halsen tar det benen och bålen lämnar, så att huvudet behåller sin storlek
        PASS['hals'] = LANGD - PASS['hoft_h'] - PASS['ht'] - m0['huvud'] * LANGD / m0['H']
    grund_m = {k: v * MATT[grund]['langd'] / m0['H'] for k, v in m0.items()}  # grundens kropp före passningen, i meter
    for k, andel in MATT[kon].get('som_grund', {}).items():
        PASS[k] = grund_m[k] * andel
    if PASS.get('haka', 0) is None:  # mannens haka: där hans hals (hans regel ovan, med hans längd) ställer den
        L = MATT[grund]['langd']; hals = L - PASS['hoft_h'] - PASS['ht'] - m0['huvud'] * L / m0['H']
        PASS['haka'] = grund_m['haka'] + hals - grund_m['hals']  # (halsens längd flyttar huvudet helt, hakan med det)
    if PASS.get('huvud_b', 0) is None:  # grundens huvudbredd i samma förhållande som höjden
        PASS['huvud_b'] = MATT[grund]['passa']['huvud_b'] * PASS['huvud_h'] / grund_m['huvud_h']
    for k in nycklar:
        for d in ('incr', 'decr'):
            sks = [TargetService.load_target(body, str(tdir / f'{t}-{d}.target.gz'), weight=1.0, name=f'fit-{k}-{i}-{d}')
                   for i, t in enumerate(PASS_TGT[k])]
            m = matt(); eff[(k, d)] = {j: m[j] - m0[j] for j in nycklar + ['H']}
            for sk in sks:
                sk.value = 0.0
    # (riktningen ur målet och grundens kropp skalad till grundens längd; den egna längden kommer av passningen)
    riktning = {k: 'incr' if (PASS[k] - grund_m[k]) * eff[(k, 'incr')][k] >= 0 else 'decr' for k in nycklar}
    for k in nycklar:  # ett mått som dess egna targets inte flyttar går inte att passa (Newtons metod blir singulär)
        if abs(eff[(k, 'incr')][k]) < 2e-4 and abs(eff[(k, 'decr')][k]) < 2e-4:
            raise SystemExit(f'{k}: {PASS_TGT[k]} flyttar inte måttet (incr {eff[(k, "incr")][k] * 1000:.2f} mm, '
                             f'decr {eff[(k, "decr")][k] * 1000:.2f} mm)')

    def satt(w):
        for k in nycklar:
            for i in range(len(PASS_TGT[k])):
                for d in ('incr', 'decr'):
                    body.data.shape_keys.key_blocks[f'fit-{k}-{i}-{d}'].value = w[k] if d == riktning[k] else 0.0

    # Följer längden av delarna (langd None: höftleden, bålen, hakan och huvudet passas alla, och de är tillsammans hela
    # höjden) passas måtten i stället i meter med grundens skala s0, F_j = m_j x s0 - mål_j: med längden som villkor
    # också vore ett av villkoren detsamma som de andra (summan av de fyra delarnas F är alltid 0).
    fast = MATT[kon]['langd'] is None; s0 = MATT[grund]['langd'] / m0['H']

    def jacobi():
        if fast:
            return np.array([[s0 * eff[(k, riktning[k])][j] for k in nycklar] for j in nycklar])
        return np.array([[LANGD * eff[(k, riktning[k])][j] - PASS[j] * eff[(k, riktning[k])]['H'] for k in nycklar] for j in nycklar])

    w = {k: 0.0 for k in nycklar}; J = jacobi(); fel = None
    for varv in range(12 if not fast else 20):
        satt(w); m1 = matt()
        if fast:
            F = np.array([m1[j] * s0 - PASS[j] for j in nycklar]); fel = {j: round(float(F[i]) * 1000, 2) for i, j in enumerate(nycklar)}
            if np.abs(F).max() < 2e-4:
                break
        else:
            F = np.array([m1[j] * LANGD - PASS[j] * m1['H'] for j in nycklar])
            fel = {j: round(float(F[i] / m1['H']) * 1000, 2) for i, j in enumerate(nycklar)}  # mm efter skalningen
            if np.abs(F).max() / m1['H'] < 2e-4:
                break
        dw = np.linalg.solve(J, -F); vand = False
        for i, k in enumerate(nycklar):
            nw = w[k] + float(dw[i])
            if nw < -0.02:  # åt andra hållet: decr i stället för incr, eller tvärtom
                riktning[k] = 'decr' if riktning[k] == 'incr' else 'incr'; nw = -nw; vand = True
            w[k] = min(1.0, max(0.0, nw))
        if vand:
            J = jacobi()
    satt(w); m1 = matt()
    vikter = {f'{t}-{riktning[k]}': round(w[k], 3) for k in nycklar for t in PASS_TGT[k]}
    sk_m = s0 if fast else LANGD / float(m1['H'])
    print(f'MPFB EGEN ({namn})', {k: round(v, 4) for k, v in grund_m.items()},
          '-> PASSAD', {k: round(v * sk_m, 4) for k, v in m1.items()}, 'FEL mm', fel, vikter)

    rig = HumanService.add_builtin_rig(body, 'mixamo')
    TargetService.bake_targets(body)
    for o in (body, rig):
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)
    body.name = 'docka_kropp'; rig.name = 'docka_rigg'; rig.data.name = 'docka_rigg'
    rig['standarddocka'] = True
    rig['kon'] = 'man' if is_man else 'kvinna'

    # Spara MakeHuman-vertexindex före MASK så både ansiktsvikter och blendshapes träffar exakt rätt
    mh_attr = body.data.attributes.new('mh_idx', 'INT', 'POINT')
    mh_attr.data.foreach_set('value', np.arange(len(body.data.vertices), dtype=np.int32))

    # Läs in ansiktsbenens vikter innan MASK (dras av från mixamorig:Head så summan = 1,0)
    rigs_dir = Path(LocationService.get_mpfb_data('rigs')) / 'standard'
    rig_def = json.loads((rigs_dir / 'rig.default.json').read_text(encoding='utf-8'))
    weights_def = json.loads((rigs_dir / 'weights.default.json').read_text(encoding='utf-8'))['weights']
    head_vg = body.vertex_groups.get('mixamorig:Head') or body.vertex_groups.get('Head')
    for fbone in ANSIKTSBEN:
        vg = body.vertex_groups.new(name=fbone)
        for vi, wval in weights_def.get(fbone, []):
            if vi >= len(body.data.vertices) or wval <= 1e-5:
                continue
            vg.add([vi], float(wval), 'REPLACE')
            if head_vg:
                try:
                    cur_hw = head_vg.weight(vi)
                except RuntimeError:
                    cur_hw = 0.0
                if cur_hw > 0.0:
                    nw = max(0.0, cur_hw - float(wval))
                    if nw > 1e-5:
                        head_vg.add([vi], nw, 'REPLACE')
                    else:
                        head_vg.remove([vi])

    # Beräkna ansiktsbenens rest-positioner i body-lokala koordinater (före MASK)
    co_pre = np.empty(len(body.data.vertices) * 3)
    body.data.vertices.foreach_get('co', co_pre)
    co_pre = co_pre.reshape(-1, 3)

    def _mpfb_pt(spec):
        if spec.get('strategy') == 'CUBE' and spec.get('cube_name') in _idx:
            return Vector(co_pre[_idx[spec['cube_name']]].mean(axis=0))
        if spec.get('strategy') == 'VERTEX' and spec.get('vertex_index') is not None:
            return Vector(co_pre[int(spec['vertex_index'])])
        dp = spec['default_position']
        return Vector((dp[0], -dp[2], dp[1])) * 0.1

    ansikts_geometri = {}
    for fbone in ANSIKTSBEN:
        info = rig_def[fbone]
        h_pt = _mpfb_pt(info['head'])
        t_pt = _mpfb_pt(info['tail'])
        if (t_pt - h_pt).length < 1e-4:
            t_pt = h_pt + Vector((0, -0.02, 0))
        ansikts_geometri[fbone] = (h_pt, t_pt)
    # MPFB:s ögonklot (hjälpgeometrin som ögonlocken är formade efter): mitt och radie, för ögongloberna (_ansikte)
    klot = {}
    for sida in ('L', 'R'):
        p = co_pre[_idx[f'helper-{sida.lower()}-eye']]; c = p.mean(axis=0)
        klot[sida] = (Vector(c), float(np.linalg.norm(p - c, axis=1).mean()))

    # Ta bort hjälpgeometri via MASK; tänderna står kvar (jawOpen och käkbenet flyttar de nedre redan)
    for g in TANDER:
        body.vertex_groups['body'].add(_idx[g], 1.0, 'REPLACE')
    bpy.context.view_layer.objects.active = body
    for m in list(body.modifiers):
        if m.type == 'MASK':
            with bpy.context.temp_override(object=body, active_object=body):
                bpy.ops.object.modifier_apply(modifier=m.name)

    # ---------------------------------------------------------------- 2. namn: utan mixamorig:, neck med litet n
    for b in rig.data.bones:
        if b.name.startswith('mixamorig:'):
            b.name = b.name[len('mixamorig:'):]
    rig.data.bones['Neck'].name = 'neck'

    # ---------------------------------------------------------------- 3. skala till längden
    def head_pos(n):
        return rig.matrix_world @ rig.data.bones[n].head_local

    s = sk_m
    bpy.ops.object.select_all(action='DESELECT')
    for o in (rig, body):
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    was_child = body.parent == rig
    if was_child:
        mwb = body.matrix_world.copy(); body.parent = None; body.matrix_world = mwb
    rig.scale = (s, s, s); body.scale = (s, s, s); body.location = body.location * s
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if was_child:
        body.parent = rig; body.matrix_parent_inverse = rig.matrix_world.inverted()
    for m in body.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    ua = (head_pos('RightArm') - head_pos('RightForeArm')).length
    fa = (head_pos('RightForeArm') - head_pos('RightHand')).length
    langd = max(v.co.z for v in body.data.vertices) - min(v.co.z for v in body.data.vertices)

    # ---------------------------------------------------------------- 3b. ARKit-kompatibla Shape Keys på slutliga meshen
    n_post = len(body.data.vertices)
    mh_indices = np.empty(n_post, dtype=np.int32)
    body.data.attributes['mh_idx'].data.foreach_get('value', mh_indices)
    mh_to_post = {int(mh_i): post_i for post_i, mh_i in enumerate(mh_indices)}
    base_co = np.empty(n_post * 3)
    body.data.vertices.foreach_get('co', base_co)
    base_co = base_co.reshape(n_post, 3)

    basis_sk = body.shape_key_add(name='Basis', from_mix=False)
    rig_world_scale = 0.1 * s
    feather = 0.015  # 1,5 cm mjuk övergång över mittlinjen för L/R-munnycklar
    for ar_name, srcs, split_lr in ARKIT_KARTA:
        delta = np.zeros((n_post, 3), dtype=np.float32)
        for rel, wgt in srcs:
            tpath = tdir / rel
            if not tpath.exists():
                continue
            for mh_vi, (dx, dy, dz) in las_target(tpath).items():
                pi = mh_to_post.get(mh_vi)
                if pi is not None:
                    delta[pi, 0] += dx * rig_world_scale * wgt
                    delta[pi, 1] += dy * rig_world_scale * wgt
                    delta[pi, 2] += dz * rig_world_scale * wgt
        if split_lr == 'L':
            mask = np.clip((base_co[:, 0] + feather) / (2 * feather), 0.0, 1.0)[:, None]
            delta *= mask
        elif split_lr == 'R':
            mask = np.clip((-base_co[:, 0] + feather) / (2 * feather), 0.0, 1.0)[:, None]
            delta *= mask
        kb = body.shape_key_add(name=ar_name, from_mix=False)
        kb.value = 0.0
        kb.data.foreach_set('co', (base_co + delta).reshape(-1))
    body.data.attributes.remove(body.data.attributes['mh_idx'])

    # ---------------------------------------------------------------- 4. extra ben: headfront, ansiktsben, vridben, IK-mål och polar
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    eb = rig.data.edit_bones
    hb = eb['Head']
    hf = eb.new('headfront'); hf.head = hb.head + Vector((0, -0.10, 0.06)); hf.tail = hf.head + Vector((0, -0.04, 0)); hf.parent = hb; hf.use_deform = False

    # Ansiktsben (barn till Head, deformerande)
    for fbone in ANSIKTSBEN:
        h_pt, t_pt = ansikts_geometri[fbone]
        fb = eb.new(fbone)
        fb.head = h_pt * s
        fb.tail = t_pt * s
        fb.parent = hb
        fb.use_deform = True

    # Vridbenen (VRID_NOD ovan): barn till underarmen, längs den med dess egen rullning, så att deras lokala Y är
    # underarmens längd och en rullning kring den är underarmens vridning
    for side in ('Right', 'Left'):
        fe = eb[side + 'ForeArm']
        for j, (t0, t1) in enumerate(((1 / 3, 2 / 3), (2 / 3, 1.0)), start=1):
            tb = eb.new(f'{side}ForeArmTwist{j}')
            tb.head = fe.head.lerp(fe.tail, t0); tb.tail = fe.head.lerp(fe.tail, t1); tb.roll = fe.roll
            tb.parent = fe; tb.use_connect = False; tb.use_deform = True

    root = eb.new('rot'); root.head = (0, 0, 0); root.tail = (0, 0.25, 0); root.use_deform = False
    eb['Hips'].parent = root
    for k, side in SIDOR.items():
        suf = '.' + k
        h = eb[side + 'Hand']; ik = eb.new('IK_hand' + suf); ik.head = h.head.copy(); ik.tail = h.tail.copy(); ik.roll = h.roll; ik.parent = root; ik.use_deform = False
        e = eb[side + 'ForeArm']; out = 1 if side == 'Left' else -1
        pol = eb.new('pol_armbage' + suf); pol.head = e.head + Vector((0.35 * out, 0.30, -0.15)); pol.tail = pol.head + Vector((0, 0.05, 0)); pol.parent = root; pol.use_deform = False
        f = eb[side + 'Foot']; ikf = eb.new('IK_fot' + suf); ikf.head = f.head.copy(); ikf.tail = f.tail.copy(); ikf.roll = f.roll; ikf.parent = root; ikf.use_deform = False
        kn = eb[side + 'Leg']; pk = eb.new('pol_kna' + suf); pk.head = kn.head + Vector((0, -0.5, 0)); pk.tail = pk.head + Vector((0, -0.05, 0)); pk.parent = root; pk.use_deform = False
    bpy.ops.object.mode_set(mode='POSE')
    pbs = rig.pose.bones
    vridinfo = _vridben_vikter(body, rig)
    for side in ('Right', 'Left'):
        fa_b = rig.data.bones[side + 'ForeArm']; e0 = fa_b.head_local; L0 = fa_b.length
        for j in (1, 2):
            tb = rig.data.bones[f'{side}ForeArmTwist{j}']
            vinkel = math.degrees((fa_b.matrix_local.to_quaternion().rotation_difference(tb.matrix_local.to_quaternion())).angle)
            vridinfo[f'{side}ForeArmTwist{j}'] = {'foralder': tb.parent.name, 'huvud_andel_av_underarmen': round((tb.head_local - e0).length / L0, 4),
                                                  'svans_andel': round((tb.tail_local - e0).length / L0, 4), 'huvud_m': [round(x, 4) for x in tb.head_local],
                                                  'svans_m': [round(x, 4) for x in tb.tail_local], 'vinkel_mot_underarmen_grader': round(vinkel, 4)}

    def bend_axis(pb, framat):
        b = pb.bone; m = (rig.matrix_world.to_3x3() @ b.matrix_local.to_3x3())
        ydir = m.col[1].normalized(); a = ydir.cross(framat).normalized()
        loc = m.inverted() @ a
        i = 0 if abs(loc.x) >= abs(loc.z) else 2
        return i, (1 if loc[i] > 0 else -1)

    def gangjarn(pb, framat, maxgrader):
        i, sg = bend_axis(pb, framat)
        pb.lock_ik_y = True
        for j, ax in ((0, 'x'), (2, 'z')):
            if j == i:
                setattr(pb, f'use_ik_limit_{ax}', True)
                lo, hi = (0, maxgrader) if sg > 0 else (-maxgrader, 0)
                setattr(pb, f'ik_min_{ax}', math.radians(lo)); setattr(pb, f'ik_max_{ax}', math.radians(hi))
            else:
                setattr(pb, f'lock_ik_{ax}', True)
        return i, sg

    def limit(pb, x, y, z):
        c = pb.constraints.new('LIMIT_ROTATION'); c.owner_space = 'LOCAL'; c.name = 'ledgrans'
        for ax, v in (('x', x), ('y', y), ('z', z)):
            setattr(c, f'use_limit_{ax}', True); setattr(c, f'min_{ax}', math.radians(-v)); setattr(c, f'max_{ax}', math.radians(v))

    gransinfo = {}
    for k, side in SIDOR.items():
        suf = '.' + k
        c = pbs[side + 'ForeArm'].constraints.new('IK'); c.name = 'IK'; c.target = rig; c.subtarget = 'IK_hand' + suf
        c.pole_target = rig; c.pole_subtarget = 'pol_armbage' + suf; c.chain_count = 2
        cr = pbs[side + 'Hand'].constraints.new('COPY_ROTATION'); cr.name = 'IK_rot'; cr.target = rig; cr.subtarget = 'IK_hand' + suf
        c2 = pbs[side + 'Leg'].constraints.new('IK'); c2.name = 'IK'; c2.target = rig; c2.subtarget = 'IK_fot' + suf
        c2.pole_target = rig; c2.pole_subtarget = 'pol_kna' + suf; c2.chain_count = 2
        gransinfo[side + 'ForeArm'] = gangjarn(pbs[side + 'ForeArm'], Vector((0, -1, 0)), 150)
        gransinfo[side + 'Leg'] = gangjarn(pbs[side + 'Leg'], Vector((0, 1, 0)), 150)
        for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
            for n in (1, 2, 3):
                limit(pbs[f'{side}Hand{f}{n}'], 100, 25, 100)
        for j in (1, 2):  # vridbenen tar bara rullning kring underarmens längd (lokal Y)
            pt = pbs[f'{side}ForeArmTwist{j}']; pt.lock_rotation = (True, False, True); limit(pt, 0, 120, 0)
    for n in ('Spine', 'Spine1', 'Spine2'):
        limit(pbs[n], 30, 25, 25)
    limit(pbs['neck'], 35, 40, 30); limit(pbs['Head'], 35, 45, 30)
    limit(pbs['jaw'], 35, 5, 10)
    for ebone in ('eye.L', 'eye.R'):
        limit(pbs[ebone], 30, 5, 35)
    rig['ik_kontroller'] = 'IK_hand.R/L, pol_armbage.R/L, IK_fot.R/L, pol_kna.R/L under benet "rot"'
    rig['vridben'] = ('RightForeArmTwist1/2 och LeftForeArmTwist1/2: barn till ForeArm vid 1/3 och 2/3 av den, bara rullning '
                      'kring lokal Y; underarmens hud delad ForeArm -> Twist1 (mitten) -> Twist2 (handleden)')

    for k, side in SIDOR.items():
        for leg in (side + 'ForeArm', side + 'Leg'):
            best = None
            for ang in range(-180, 180, 5):
                pbs[leg].constraints['IK'].pole_angle = math.radians(ang); bpy.context.view_layer.update()
                err = ((rig.matrix_world @ pbs[leg].matrix).translation - (rig.matrix_world @ pbs[leg].bone.matrix_local).translation).length
                if best is None or err < best[0]:
                    best = (err, ang)
            pbs[leg].constraints['IK'].pole_angle = math.radians(best[1])

    # ---------------------------------------------------------------- 5. material: neutral grå docka, ansiktet i hörnfärger
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o not in (body,) and o.parent == rig:
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    ansiktsinfo = _ansikte(body, rig, col, klot, s)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
    mat = pbr('docka_neutral', ANSIKTE['farg']['hud'] + (1,), rough=0.6)
    hornfarg = mat.node_tree.nodes.new('ShaderNodeVertexColor'); hornfarg.layer_name = 'farg'
    mat.node_tree.links.new(hornfarg.outputs['Color'], next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'])
    body.data.materials.clear(); body.data.materials.append(mat)

    for c in [c for p in pbs for c in p.constraints if c.name in ('IK', 'IK_rot')]:
        c.influence = 0.0
    bpy.context.view_layer.update()

    # ---------------------------------------------------------------- 6. sittande vila (Action "sitt_vila"), som i editorn (SITT)
    hoft = Vector(D['hoft'])
    rig.location = (hoft.x, hoft.y, 0.0)  # objektets läge som förut; dockan ställs med Hips nedan
    bpy.context.view_layer.update()
    for p in pbs:
        p.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    W = lambda n: (rig.matrix_world @ pbs[n].matrix).translation.copy()
    axlar_mal = Vector((SITT['x'], SITT['axlar_bakom_kant'], FZ + SITT['axlar_over_filt']))
    hips = pbs['Hips']
    mw_h = rig.matrix_world @ hips.matrix
    mw_h.translation += axlar_mal - (W('RightArm') + W('LeftArm')) / 2  # rak bål: axellederna där rörelsen har dem
    hips.matrix = rig.matrix_world.inverted() @ mw_h
    bpy.context.view_layer.update()
    fall = SITT['lar']['fall'] + max(0.0, -SITT['hoft_under_filt'] - SITT['lar']['fran']) * SITT['lar']['brant']
    for side, ut in (('Right', -1), ('Left', 1)):
        sikta_ben(rig, pbs[side + 'UpLeg'], Vector((ut * SITT['lar']['ut'], -1, -fall))); bpy.context.view_layer.update()
        sikta_ben(rig, pbs[side + 'Leg'], Vector((0, -0.08, -1))); bpy.context.view_layer.update()
    for side in ('Right', 'Left'):
        mal = Vector(SITT['handled'][side]) + Vector((0, 0, FZ))
        sh = W(side + 'Arm')
        pol = sh + Vector((0.5 * (-1 if side == 'Right' else 1), 0.4, -0.6))
        el, ok = tvaled_ik(sh, mal, pol, ua, fa)
        sikta_ben(rig, pbs[side + 'Arm'], el - sh); bpy.context.view_layer.update()
        sikta_ben(rig, pbs[side + 'ForeArm'], mal - el); bpy.context.view_layer.update()
        f = (mal - el); f.z = 0; f = f.normalized() + Vector((0, 0, -0.1))  # handen som underarmen, lite ned mot filten
        sikta_ben(rig, pbs[side + 'Hand'], f); bpy.context.view_layer.update()
    hoft = (W('RightUpLeg') + W('LeftUpLeg')) / 2  # höftledernas mitt i vilan (räckvidden och rapporten nedan)
    act = bpy.data.actions.new('sitt_vila'); rig.animation_data_create(); rig.animation_data.action = act
    for p in pbs:
        p.keyframe_insert('location', frame=1)
        p.keyframe_insert('rotation_quaternion' if p.rotation_mode == 'QUATERNION' else 'rotation_euler', frame=1)
    for p in pbs:
        for c in p.constraints:
            if c.name in ('IK', 'IK_rot'):
                c.keyframe_insert('influence', frame=1)
    act.use_fake_user = True

    # ---------------------------------------------------------------- 7. mått + räckvidd
    W = lambda n: (rig.matrix_world @ pbs[n].matrix).translation.copy()
    skuld = {'hoger': W('RightArm'), 'vanster': W('LeftArm')}
    mal = {
        'sko_fonsterkort': Vector(STD['sko']['fonsterkort_mitt']),
        'D.C1': Vector(STD['platser']['D.C1']['pos']),
        'P1.C1': Vector(STD['platser']['P1.C1']['pos']),
        'P7.C1': Vector(STD['platser']['P7.C1']['pos']),
    }
    lift = Vector((0, 0, STD['rackviddstest']['handled_over_kort']))
    rack = {}
    for nm, p in mal.items():
        t = p + (lift if nm != 'sko_fonsterkort' else Vector())
        rad = {}
        for sn, spos in skuld.items():
            dd = (t - spos).length
            behov = None
            for steg in range(0, 61):
                th = D['mest_lutning_rad'] * steg / 60
                ax = Vector((0, 0, 1)).cross(t - hoft); ax = ax.normalized() if ax.length > 1e-6 else Vector((1, 0, 0))
                sp = hoft + (Matrix.Rotation(th, 3, ax) @ (spos - hoft))
                if (t - sp).length <= ua + fa:
                    behov = round(math.degrees(th), 1); break
            rad[sn] = {'avstand_axel_handled_m': round(dd, 4), 'nar_utan_lutning': dd <= ua + fa, 'marginal_m': round(ua + fa - dd, 4),
                       'lutning_som_behovs_grader': behov}
        rack[nm] = rad
    rapport = {
        'kon': kon, 'grund': grund,
        'kalla': 'MPFB 2.0.18 (CC0-tillgångar) + mixamo-skelett + 16 ansiktsben + 4 vridben + ARKit-shapekeys + ansiktet (ANSIKTE), bygg_docka.py',
        'mpfb_height': mpfb_height, 'passat_mot': {k: round(v, 4) for k, v in PASS.items()},'kalla_matten': MATT[kon]['kalla'],
        'passat_blev': {k: round(v * sk_m, 4) for k, v in m1.items()}, 'passning_fel_mm': fel,
        'mpfb_passning_vikter': vikter,
        'skalfaktor_fran_mpfb': round(s, 4), 'langd_staende_m': round(langd, 4),
        'over_arm_m': round(ua, 4), 'underarm_m': round(fa, 4),
        'axelbredd_led_m': round((skuld['hoger'] - skuld['vanster']).length, 4),
        'axlar_sittande': {k: [round(c, 4) for c in v] for k, v in skuld.items()},
        'hoft_till_axel_m': round(skuld['hoger'].z - hoft.z, 4),
        'hoft_led_mitt': [round(c, 4) for c in hoft], 'rackvidd_arm_m': round(ua + fa, 4), 'rackvidd': rack,
        'ben': len(rig.data.bones), 'deformerande': sum(1 for b in rig.data.bones if b.use_deform),
        'ansiktsben': ANSIKTSBEN, 'vridben': vridinfo, 'ansikte': ansiktsinfo,
        'shapekeys': [k.name for k in body.data.shape_keys.key_blocks] if body.data.shape_keys else [],
        'kravda_ben_saknas': [n for n in KRAVDA_BEN if n not in rig.data.bones],
        'gangjarn': {k: {'lokal_axel': 'XZ'[0 if v[0] == 0 else 1], 'tecken': v[1]} for k, v in gransinfo.items()},
        'aktioner': [a.name for a in bpy.data.actions],
    }
    (slask('bygge') / f'docka-rapport-{namn}.json').write_text(json.dumps(rapport, indent=1, ensure_ascii=False), encoding='utf-8')
    print(f'RAPPORT ({namn})', json.dumps({k: rapport[k] for k in ('kon', 'langd_staende_m', 'over_arm_m', 'underarm_m', 'axelbredd_led_m', 'hoft_till_axel_m', 'ben', 'deformerande', 'kravda_ben_saknas', 'aktioner', 'ansikte')}, ensure_ascii=False))

    bpy.ops.object.mode_set(mode='OBJECT')
    for p in pbs:
        p.custom_shape = None
    for o in list(bpy.data.objects):
        if o not in (body, rig):
            bpy.data.objects.remove(o, do_unlink=True)
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    blend_kon = OUT / f'standarddocka_{namn}.blend'
    glb_kon = OUT / f'standarddocka_{namn}.glb'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_kon))
    # GLB:n skrivs under ett annat namn och byts in hel, så att editorn och studion (som läser den) aldrig får en halv fil
    ny = OUT / f'standarddocka_{namn}.ny.glb'
    bpy.ops.export_scene.gltf(filepath=str(ny), export_format='GLB', export_apply=True, export_animations=True,
                              export_yup=True, use_selection=False)
    for forsok in range(40):
        try:
            os.replace(ny, glb_kon); break
        except PermissionError:  # Windows: någon läser den gamla filen just nu
            time.sleep(0.25)
    else:
        raise SystemExit(f'kunde inte byta in {glb_kon} (filen är upptagen); den nya ligger i {ny}')
    for f in OUT.glob('*.blend1'):
        os.remove(f)
    print('BYGGT', blend_kon)


ap = argparse.ArgumentParser()
ap.add_argument('--kon', choices=[*MATT, 'bada'], default='bada',
                help='dockan (en nyckel i MATT); bada: kvinnan och mannen (de mätta byggs var för sig)')
ap.add_argument('--namn', default='', help='skriver standarddocka_<docka>_<namn>.blend/.glb (och rapporten med samma namn) i stället '
                                          'för de modeller som används; små bokstäver, siffror och understreck')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
if args.namn and not re.fullmatch(r'[a-z0-9_]+', args.namn):
    raise SystemExit('--namn tar små bokstäver, siffror och understreck, till exempel naturlig')
for kon in (['kvinna', 'man'] if args.kon == 'bada' else [args.kon]):
    bygg_en(kon, args.namn)
