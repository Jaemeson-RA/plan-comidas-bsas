# -*- coding: utf-8 -*-
"""Genera site/data.js a partir de las recetas, el plan, media.json y basket_final.json."""
import json, datetime, collections, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = "../data.js"
media = json.load(open("media.json", encoding="utf-8"))
basket = json.load(open("basket_final.json", encoding="utf-8"))

YT = {  # video elegido por receta
 "tostadas":"rtWvDxVwt_A","yogur":"cXBk-SGyNa4","revueltos":"4TyfZli-n_c","panqueques":"abXvVyaHZ50",
 "pollohorno":"lZJpPfIkn0w","merluza":"gS3UnoERnRE","bife":"xfk1JLjQsgs","atun":"S9XU_A2l_OM",
 "sopa":"NRx0xCYgdJk","tarta":"AXrqVW-ilJA","wok":"S2shSjklAME","omelette":"SA122sMRU6A",
 "milanesas":"epaNw386VYo","lentejas":"qRHymy7Ue4E","zapallitos":"T3jbUQT_z1Q","salmon":"mPpiPFikKcs",
 "pastel":"2dK_dtOMbyg","empanadas":"T8NWbcdnbQ4",
 "noquis":"YvwiyErV6dg","tortilla":"i35SFOnFimQ","albondigas":"ZzQhLPEl7lQ","curry":"qaoKiH_2Fzo","hamburguesas":"rgmUL1g_j6M",
 "garbanzos":"gRvgUZrW6DU","berenjenas":"fmKqVDaKHuA","arrozpollo":"4vEcK1X6VcA","wrap":"H8P6Lcy1cPE","gramajo":"hloFV5P7yMQ",
 "pescadohorno":"rjofAbF4rlo","carbonara":"2ivPPqeaidY",
 "avenamanzana":"WXx3dFfK1zM",
 "chipa":"FNGDishTqA4",
 "tostadafrancesa":"7zbiGqEkbWM",
 "polenta":"MnnENd7rHPc",
 "hamblentejas":"whXi6p7tVQM",
 "pastabrocoli":"q3uUEJ9lTic",
 "garbanzosespinaca":"QG5p3mGzAfQ",
 "revueltozapallitos":"yURAGpCzJu0",
 "bunuelosacelga":"kjipKpITZw0",
 "pizzacasera":"YtFFWpmqaT4",
 "cerdobatata":"kdxjSteQ7NE",
 "pollodisco":"-lSEUaUdKdE",
 "guisofideos":"bslIDRKAosw",
 "bifecriolla":"989XjP0mSyw",
 "licuadobanana":"2kILFe1s884",
 "chiabanana":"0oSTbVeLQOU",
 "tofurevuelto":"om9XGBfFDgU",
 "locrovegano":"oaWywIx2lKc",
 "milanesasberenjena":"pJrDhWmAyzs",
 "currylentejas":"aLh1BjLdKhE",
 "chiliporotos":"s6NO4wKYn8k",
 "woktofu":"JcXWU7QysIc",
 "empanadaslentejas":"2aowdIomktw",
 "falafel":"W55JW5xTAxs"}
# valores nutricionales aproximados por porción: kcal, proteínas g, carbohidratos g, grasas g, fibra g, sal g
NUT = {
 "tostadas":(380,14,40,17,7,1.1),"yogur":(350,14,55,7,6,0.3),"revueltos":(420,24,22,26,3,1.3),"panqueques":(390,14,55,11,6,0.3),
 "pollohorno":(520,55,30,18,7,1.2),"merluza":(380,48,10,15,4,1.0),"bife":(550,52,28,24,5,1.1),"atun":(420,38,14,22,5,1.4),
 "sopa":(320,16,36,12,8,1.6),"tarta":(380,24,20,22,6,1.3),"wok":(480,45,45,12,5,2.4),"omelette":(400,30,10,27,2,1.2),
 "milanesas":(520,50,38,18,4,1.4),"lentejas":(480,32,60,10,16,1.5),"zapallitos":(450,36,18,25,5,1.2),"salmon":(480,40,12,30,4,0.8),
 "pastel":(520,36,48,20,6,1.5),"empanadas":(540,28,50,26,4,1.8),"noquis":(520,16,90,10,7,1.0),"tortilla":(480,20,42,26,5,1.1),
 "albondigas":(580,42,62,18,6,1.6),"curry":(560,46,55,18,4,1.4),"hamburguesas":(620,44,58,24,7,1.7),"garbanzos":(450,18,55,17,13,0.9),
 "berenjenas":(420,24,22,26,8,1.6),"arrozpollo":(560,44,65,14,5,1.8),"wrap":(480,40,38,19,7,1.3),"gramajo":(500,28,42,24,5,1.9),
 "pescadohorno":(480,46,40,15,5,1.0),"carbonara":(650,32,70,27,3,2.1),
 "avenamanzana":(337,14,59,7,8,1.0),
 "chipa":(447,20,47,20,0,1.8),
 "tostadafrancesa":(339,14,45,11,6,0.9),
 "polenta":(484,14,85,12,9,1.4),
 "hamblentejas":(450,25,76,7,14,0.9),
 "pastabrocoli":(563,18,90,16,8,0.9),
 "garbanzosespinaca":(552,23,91,13,18,2.4),
 "revueltozapallitos":(430,25,42,19,7,1.4),
 "bunuelosacelga":(512,25,60,21,8,3.1),
 "pizzacasera":(692,29,87,25,5,2.5),
 "cerdobatata":(617,45,54,25,9,1.5),
 "pollodisco":(538,50,51,14,9,1.3),
 "guisofideos":(615,38,77,18,8,2.8),
 "bifecriolla":(586,49,54,19,9,1.1),
 "licuadobanana":(333,14,51,11,7,0.3),
 "chiabanana":(259,10,38,10,11,0.2),
 "tofurevuelto":(366,28,16,24,9,1.0),
 "locrovegano":(619,23,107,13,21,2.1),
 "milanesasberenjena":(495,18,81,14,18,0.8),
 "currylentejas":(649,27,97,20,14,1.2),
 "chiliporotos":(598,24,113,7,24,3.1),
 "woktofu":(586,34,75,19,11,2.3),
 "empanadaslentejas":(623,25,104,13,11,2.0),
 "falafel":(559,25,76,21,16,0.9)}
MERIENDA_NUT = (200,8,28,6,2,0.4)

# ---------- BASE DE INGREDIENTES (por 100 g: kcal, prot, carb, azúcar, grasa, saturada, fibra, sal) ----------
# Valores aproximados (tablas SARA/USDA redondeadas). 'u' = peso de una unidad en g cuando se mide por unidad.
def ING(n, cat, kcal, prot, carb, sug, fat, sat, fib, sal, u=None, alias=()):
    return {"n":n,"cat":cat,"por100":{"kcal":kcal,"prot":prot,"carb":carb,"sug":sug,"fat":fat,"sat":sat,"fib":fib,"sal":sal},"u":u,"alias":list(alias)}
ING_DB = [
 ING("pasta de maní","alm",588,25,20,9,50,10,6,0.9),
 ING("semillas de chía","alm",486,17,42,0,31,3.3,34,0.04),
 ING("tofu firme","verd",144,15.8,2.8,0.6,8.7,1.3,2.3,0.03),
 ING("maíz blanco partido","alm",365,9.4,74,0.6,4.7,0.7,7.3,0.01),
 ING("porotos alubia cocidos (lata)","alm",114,7.5,20,0.3,0.4,0.1,6,0.6,u=240),
 ING("choclo en grano (lata)","alm",80,2.6,15,4.5,1.2,0.2,2,0.5,u=200),
 ING("harina de garbanzo","alm",387,22,58,11,6.7,0.7,11,0.06),
 ING("porotos negros cocidos (lata)","alm",91,6,16.6,0.3,0.3,0.1,6.9,0.6,u=240),
 ING("tapas para empanadas veganas","alm",320,8,55,2,8,3,2,1.2,u=25),
 ING("garbanzos secos","alm",378,20.5,63,10.7,6,0.6,12,0.06),
 ING("perejil (atado)","verd",36,3,6.3,0.9,0.8,0.1,3.3,0.14,u=100),
 ING("pasta de sésamo (tahini)","alm",595,17,21,0.5,54,7.5,9,0.1),
 ING("bebida de soja","lact",45,3.3,4,2.5,2,0.3,0.5,0.1),
 ING("manzana","verd",52,0.3,14,10,0.2,0,2.4,0,u=180),
 ING("pasas de uva","alm",299,3.1,79,59,0.5,0.1,3.7,0.03),
 ING("fécula de mandioca","alm",358,0.2,88,3.4,0,0,0.9,0),
 ING("harina de maíz (polenta)","alm",362,8.1,77,0.6,1.8,0.3,4,0),
 ING("fideos secos cortos (mostachol o tirabuzón)","alm",371,13,75,2.7,1.5,0.3,3.2,0.01),
 ING("brócoli","verd",34,2.8,6.6,1.7,0.4,0,2.6,0.08,u=400),
 ING("polvo de hornear","pantry",53,0,28,0,0,0,0.2,26.5),
 ING("levadura seca","alm",325,40,41,0,7.6,1,27,0.13,u=10),
 ING("queso mozzarella","lact",280,22,2.2,1,20,12,0,1.2),
 ING("costeletas de cerdo","carne",172,20,0,0,10,3.5,0,0.15),
 ING("pata muslo de pollo","carne",121,19.7,0,0,4.1,1,0,0.2,u=220),
 ING("carne para guiso (paleta o roast beef)","carne",160,20,0,0,9,3.6,0,0.15),
 ING("pan integral","pan",250,9,43,4,3.5,0.7,7,1.1,u=30,alias=["pan integral (rodajas)"]),
 ING("palta","verd",160,2,8.5,0.7,15,2.1,6.7,0.02,u=170),
 ING("queso untable light","lact",150,8,5,4,11,7,0,1.0),
 ING("tomate","verd",18,0.9,3.9,2.6,0.2,0,1.2,0.01,u=150),
 ING("limón","verd",29,1.1,9,2.5,0.3,0,2.8,0,u=60),
 ING("leche","lact",61,3.2,4.8,4.8,3.3,1.9,0,0.1),
 ING("café molido","pantry",2,0.3,0,0,0,0,0,0),
 ING("yogur natural","lact",61,3.5,4.7,4.7,3.3,2.1,0,0.1,u=120,alias=["yogur natural (pote)"]),
 ING("avena","alm",389,17,66,1,7,1.2,10.6,0),
 ING("banana","verd",89,1.1,23,12,0.3,0.1,2.6,0,u=120),
 ING("miel","pantry",304,0.3,82,82,0,0,0.2,0),
 ING("huevos","lact",143,12.6,0.7,0.4,9.5,3.1,0,0.35,u=55),
 ING("yema de huevo","lact",322,16,3.6,0.6,27,10,0,0.1,u=18),
 ING("manteca","lact",717,0.9,0.1,0,81,51,0,0.7,alias=["manteca o aceite","aceite o manteca"]),
 ING("yerba mate","pantry",0,0,0,0,0,0,0,0),
 ING("suprema de pollo","carne",120,22.5,0,0,2.6,0.6,0,0.1),
 ING("zapallo anco / calabaza","verd",34,1,8.6,2.2,0.1,0,1.5,0,u=1500),
 ING("zanahoria","verd",41,0.9,9.6,4.7,0.2,0,2.8,0.17,u=80),
 ING("cebolla","verd",40,1.1,9.3,4.2,0.1,0,1.7,0.01,u=120,alias=["cebolla morada"]),
 ING("aceite de oliva","pantry",884,0,0,0,100,14,0,0,alias=["aceite"]),
 ING("ajo","verd",149,6.4,33,1,0.5,0.1,2.1,0.04,u=4,alias=["ajo (dientes)"]),
 ING("filet de merluza","carne",86,17.8,0,0,1.3,0.3,0,0.3),
 ING("espinaca","verd",23,2.9,3.6,0.4,0.4,0.1,2.2,0.2,u=300,alias=["espinaca fresca (atado)"]),
 ING("nalga / bife magro","carne",150,21,0,0,7,2.8,0,0.15),
 ING("atún al natural","alm",116,26,0,0,1,0.3,0,1.0,u=120,alias=["atún al natural (lata 170 g)"]),
 ING("lechuga","verd",15,1.4,2.9,0.8,0.2,0,1.3,0.07,u=300),
 ING("vinagre","pantry",20,0,0.9,0.4,0,0,0,0,alias=["vinagre o limón"]),
 ING("puerro","verd",61,1.5,14,3.9,0.3,0,1.8,0.05,u=100),
 ING("zapallito","verd",17,1.2,3.1,2.5,0.3,0.1,1,0.02,u=200,alias=["brócoli o zapallito"]),
 ING("zapallitos redondos","verd",17,1.2,3.1,2.5,0.3,0.1,1,0.02,u=150),
 ING("caldo de verduras (cubo)","pantry",220,10,15,5,15,8,0,45,u=10),
 ING("acelga","verd",19,1.8,3.7,1.1,0.2,0,1.6,0.5,u=500,alias=["acelga (atado)"]),
 ING("queso port salut light","lact",250,25,2,1,16,10,0,1.5),
 ING("queso rallado","lact",420,38,4,0,29,19,0,2.0,alias=["queso rallado (sardo o parmesano)"]),
 ING("champiñones","verd",22,3.1,3.3,2,0.3,0,1,0.01),
 ING("cebolla de verdeo","verd",32,1.8,7.3,2.3,0.2,0,2.6,0.04,u=25),
 ING("morrón rojo","verd",31,1,6,4.2,0.3,0,2.1,0.01,u=150),
 ING("arroz","alm",365,7,80,0.1,0.7,0.2,1.3,0),
 ING("salsa de soja","pantry",53,8,5,0.4,0.6,0.1,0.8,14),
 ING("pan rallado","alm",395,13,72,6,5,1.2,4.5,1.8),
 ING("lentejas secas","alm",352,25,63,2,1.1,0.2,11,0.02),
 ING("carne picada magra","carne",170,20,0,0,10,4,0,0.17),
 ING("tomate triturado (lata)","alm",32,1.6,7,4,0.3,0,1.5,0.3,u=400),
 ING("salmón (filet)","carne",208,20,0,0,13,3,0,0.15),
 ING("papa","verd",77,2,17,0.8,0.1,0,2.2,0.02,u=150),
 ING("aceitunas verdes","alm",115,0.8,6,0,11,1.4,3.2,3.5,u=4),
 ING("tapas para empanadas","alm",320,8,55,2,8,4,2,1.2,u=25,alias=["tapas para empanadas (docena)"]),
 ING("harina 0000","alm",364,10,76,0.3,1,0.2,2.7,0),
 ING("curry en polvo","pantry",325,14,56,3,14,2,53,0.1),
 ING("leche de coco","alm",197,2,3,2,21,19,0,0.03,u=400,alias=["leche de coco (lata)"]),
 ING("batata","verd",86,1.6,20,4.2,0.1,0,3,0.14),
 ING("pan de hamburguesa","pan",270,9,48,6,4,1,2.5,1.1,u=60),
 ING("garbanzos cocidos (lata)","alm",139,7.3,22,0.3,2.6,0.3,6.4,0.6,u=240),
 ING("quinoa","alm",368,14,64,0,6,0.7,7,0.01),
 ING("pepino","verd",15,0.7,3.6,1.7,0.1,0,0.5,0,u=250),
 ING("berenjena","verd",25,1,6,3.5,0.2,0,3,0,u=300),
 ING("arvejas (lata o congeladas)","alm",81,5.4,14,5.7,0.4,0.1,5.7,0.01),
 ING("tortillas de harina (rapiditas)","pan",310,8,50,3,8,3,3,1.6,u=45),
 ING("jamón cocido","carne",110,18,1.5,1,3.5,1.2,0,2.3),
 ING("fideos (spaghetti o tallarines)","alm",371,13,75,2.7,1.5,0.3,3.2,0.01,alias=["spaghetti"]),
 ING("panceta ahumada","carne",420,13,1,0,40,14,0,2.5),
 ING("sal","pantry",0,0,0,0,0,0,0,100),
 ING("fruta de estación","verd",55,0.7,13,10,0.2,0,2.2,0,u=150),
]
for i,x in enumerate(ING_DB): x["id"] = "b%02d" % i
ING_IDX = {}
for x in ING_DB:
    ING_IDX[x["n"].lower()] = x
    for a in x["alias"]: ING_IDX[a.lower()] = x
# cucharadas / cucharaditas en gramos según el ingrediente
CDA = {"aceite de oliva":9,"aceite":9,"salsa de soja":15,"pan rallado":8,"harina 0000":8,"miel":20,"curry en polvo":6,"vinagre":15,"vinagre o limón":15}
def grams_of(ing):
    """gramos de un ingrediente de receta a partir de (q,u); None si no hay forma de saberlo"""
    n = ing["n"].lower(); q = ing["q"]; u = ing["u"]
    base = ING_IDX.get(n)
    if u in ("g","ml"): return q
    if u == "cda": return q * CDA.get(n, 10)
    if u == "cdita": return q * (CDA.get(n, 10) / 2.5)
    if u == "pizca": return 1.5 if "sal" in n.split() or n.startswith("sal") or ", sal" in n or " sal" in n else 0.5
    if u == "u" and base and base["u"]: return q * base["u"]
    return None
def nut_from_ing(ings, porciones):
    tot = {"kcal":0,"prot":0,"carb":0,"sug":0,"fat":0,"sat":0,"fib":0,"sal":0}; missing = []
    for ing in ings:
        n = ing["n"].lower(); g = grams_of(ing)
        if g is None: missing.append(ing["n"]); continue
        base = ING_IDX.get(n)
        if base is None:
            if ing["u"] == "pizca":  # condimentos: solo cuenta la sal
                tot["sal"] += g if ("sal" in n) else 0
                continue
            missing.append(ing["n"]); continue
        for k,v in base["por100"].items(): tot[k] += v * g / 100
    return {k: round(v / porciones, 1) for k,v in tot.items()}, missing

# ingredientes: (nombre, cantidad, unidad, categoría) — para 2 porciones. cat: verd, carne, lact, alm, pan, pantry
def I(n,q,u,c): return {"n":n,"q":q,"u":u,"c":c}
R = {}
NUT_LOG = []
def _nut(id, ing, porc=2):
    est = dict(zip(["kcal","prot","carb","fat","fib","sal"],NUT[id]))
    calc, missing = nut_from_ing(ing, porc)
    if missing: NUT_LOG.append((id, "faltan", missing))
    # si el cálculo cubre la receta (menos de 2 ingredientes sin dato) se usa el cálculo; si no, la estimación
    if len(missing) <= 1 and calc["kcal"] > 120:
        NUT_LOG.append((id, "calc", calc["kcal"], "est", est["kcal"]))
        calc["source"] = "ingredientes"; return calc
    est.update({"sug": None, "sat": None, "source": "estimado"}); return est
# Las recetas se escribieron para 2 personas (o 3-4 en los platos de olla). El plan es para UNA persona:
# los platos de olla quedan en 2 porciones (una para hoy, otra para congelar o la vianda), el resto en 1.
OLD_PORC = {"lentejas":4,"empanadas":4,"pastel":4,"noquis":4,"albondigas":3,"arrozpollo":3,"tortilla":3,"curry":3,
 "hamblentejas":2,
 "garbanzosespinaca":2,
 "pollodisco":2,
 "guisofideos":2,
 "locrovegano":2,
 "currylentejas":2,
 "chiliporotos":2,
 "empanadaslentejas":2}
PORCIONES = {"lentejas":2,"empanadas":2,"pastel":2,"noquis":2,"albondigas":2,"arrozpollo":2,"tortilla":2,"curry":2,
 "hamblentejas":2,
 "garbanzosespinaca":2,
 "pollodisco":2,
 "guisofideos":2,
 "locrovegano":2,
 "currylentejas":2,
 "chiliporotos":2,
 "empanadaslentejas":2}
HALVES = {"palta","cebolla","cebolla morada","morrón rojo","limón","tomate","zapallito","berenjena","lechuga","banana","pepino","brócoli o zapallito","puerro","zanahoria","acelga (atado)","espinaca fresca (atado)","garbanzos cocidos (lata)","tomate triturado (lata)","caldo de verduras (cubo)","atún al natural (lata 170 g)"}
def _scale(id, ing):
    f = PORCIONES.get(id,1) / OLD_PORC.get(id,2)
    out = []
    for i in ing:
        q = i["q"] * f; u = i["u"]; n = i["n"]
        if u in ("g","ml"): q = max(5, int(round(q / 5.0)) * 5)
        elif u == "u":
            if q < 1: q = 0.5 if n in HALVES else 1
            else: q = round(q * 2) / 2
        elif u in ("cda","cdita"): q = max(0.5, round(q * 2) / 2)
        out.append(dict(i, q=q))
    return out
def rec(id, name, tipo, tiempo, kcal, cost, tags, ing, pasos, tip):
    ing = _scale(id, ing)
    R[id] = {"id":id,"name":name,"tipo":tipo,"tiempo":tiempo,"kcal":kcal,"cost":cost,"tags":tags,"porciones":PORCIONES.get(id,1),
             "ing":ing,"pasos":pasos,"tip":tip,"yt":YT[id],
             "nut":_nut(id, ing, PORCIONES.get(id,1)),
             "img":media[id]["img"]["file"],"credit":{"title":media[id]["img"]["title"].replace("File:",""),
             "page":media[id]["img"]["page"],"license":media[id]["img"]["license"],"artist":media[id]["img"]["artist"]}}

# ---------- DESAYUNOS ----------
rec("tostadas","Tostadas integrales con palta o queso untable","desayuno",10,380,2400,["rápido","sin cocción"],
 [I("pan integral (rodajas)",4,"u","pan"),I("palta",1,"u","verd"),I("queso untable light",60,"g","lact"),I("tomate",1,"u","verd"),
  I("limón",0.5,"u","verd"),I("leche",300,"ml","lact"),I("café molido",20,"g","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Tostar el pan en tostadora o sartén.","Pisar la palta con limón, sal y pimienta (o untar el queso light).","Cubrir las tostadas, sumar rodajas de tomate.","Preparar el café con leche. Listo en 10 minutos."],
 "Si la palta está cara esa semana, cambiá por queso untable + tomate: mismo tiempo, la mitad del costo.")
rec("yogur","Yogur natural con avena y banana","desayuno",5,350,2100,["rápido","sin cocción","proteico"],
 [I("yogur natural (pote)",2,"u","lact"),I("avena",80,"g","alm"),I("banana",2,"u","verd"),I("miel",2,"cdita","pantry"),I("canela",1,"pizca","pantry")],
 ["Poner el yogur en un bowl.","Sumar la avena y mezclar (si querés más cremoso, dejalo 10 minutos en la heladera).","Cortar la banana en rodajas por arriba.","Terminar con miel y canela."],
 "Versión 'overnight': mezclá yogur + avena la noche anterior y a la mañana solo agregás la banana.")
rec("revueltos","Huevos revueltos con pan integral y mate","desayuno",10,420,1400,["rápido","proteico"],
 [I("huevos",4,"u","lact"),I("pan integral (rodajas)",2,"u","pan"),I("leche",30,"ml","lact"),I("manteca o aceite",1,"cdita","pantry"),I("yerba mate",40,"g","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Batir los huevos con la leche, sal y pimienta.","Calentar la sartén a fuego bajo con un poco de manteca.","Volcar los huevos y revolver despacio hasta que queden cremosos (2-3 min). Retirar antes de que se sequen.","Servir sobre la tostada. Cebar el mate."],
 "El secreto es el fuego bajo: los huevos siguen cocinándose en el plato.")
rec("panqueques","Panqueques de avena y banana","desayuno",15,390,1200,["sin harina","dulce"],
 [I("banana",2,"u","verd"),I("huevos",2,"u","lact"),I("avena",100,"g","alm"),I("leche",50,"ml","lact"),I("canela",1,"pizca","pantry"),I("aceite",1,"cdita","pantry"),I("miel",2,"cdita","pantry")],
 ["Licuar o pisar la banana con los huevos, la avena, la leche y la canela.","Dejar reposar 5 minutos para que la avena absorba.","Cocinar porciones chicas en sartén apenas aceitada, 2 min por lado a fuego medio.","Servir con un hilo de miel o con yogur."],
 "Salen 6-8 panqueques chicos. Se guardan 2 días en la heladera y se recalientan en tostadora.")

# ---------- PLATOS ----------
rec("pollohorno","Pollo al horno con calabaza y zanahoria","plato",50,520,3500,["horno","una sola fuente"],
 [I("suprema de pollo",500,"g","carne"),I("zapallo anco / calabaza",600,"g","verd"),I("zanahoria",2,"u","verd"),I("cebolla",1,"u","verd"),
  I("aceite de oliva",2,"cda","pantry"),I("ajo (dientes)",2,"u","verd"),I("pimentón, orégano, sal, pimienta",1,"pizca","pantry"),I("limón",1,"u","verd")],
 ["Precalentar el horno a 200 °C.","Cortar la calabaza y la zanahoria en cubos, la cebolla en gajos. Ponerlas en una fuente con oliva, sal y orégano.","Condimentar el pollo con pimentón, ajo picado, sal, pimienta y jugo de limón. Apoyarlo sobre las verduras.","Hornear 35-40 min. A mitad de cocción, dar vuelta el pollo y mezclar las verduras.","Servir con el jugo de la fuente."],
 "Hacé el doble de verduras: sobran para la sopa o para el wok del día siguiente.")
rec("merluza","Merluza a la plancha con ensalada de tomate y espinaca","plato",20,380,5000,["rápido","liviano","pescado"],
 [I("filet de merluza",500,"g","carne"),I("tomate",2,"u","verd"),I("espinaca fresca (atado)",0.5,"u","verd"),I("limón",1,"u","verd"),
  I("aceite de oliva",2,"cda","pantry"),I("ajo (dientes)",1,"u","verd"),I("perejil",1,"pizca","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Secar bien los filetes con papel; salpimentar y pasar por apenas de harina si querés que no se peguen.","Sartén bien caliente con un hilo de oliva: 3 min por lado, sin moverlos.","Al final, ajo y perejil picados y jugo de limón.","Ensalada: espinaca cruda, tomate en gajos, oliva, sal, unas gotas de limón."],
 "La merluza congelada 'x 1 kg' sale la mitad que la fresca en bandeja. Descongelala en la heladera desde la mañana.")
rec("bife","Bife de nalga a la plancha con puré de zapallo","plato",30,550,4800,["clásico argentino","proteico"],
 [I("nalga / bife magro",500,"g","carne"),I("zapallo anco / calabaza",600,"g","verd"),I("leche",50,"ml","lact"),I("queso untable light",30,"g","lact"),
  I("aceite",1,"cda","pantry"),I("nuez moscada, sal, pimienta",1,"pizca","pantry")],
 ["Pelar y hervir el zapallo en cubos 15 min; colar bien y pisar con leche, queso light, nuez moscada y sal.","Sacar la carne de la heladera 15 min antes. Secar, salar.","Plancha o sartén muy caliente, apenas aceitada: 3-4 min por lado para punto medio. Dejar reposar 2 min.","Servir con el puré."],
 "Si no hay nalga, la cuadrada o la bola de lomo funcionan igual y suelen estar en oferta.")
rec("atun","Ensalada completa de atún y huevo","plato",15,420,3500,["sin cocción","rápido","proteico"],
 [I("atún al natural (lata 170 g)",2,"u","alm"),I("huevos",2,"u","lact"),I("lechuga",1,"u","verd"),I("tomate",2,"u","verd"),I("zanahoria",1,"u","verd"),
  I("cebolla morada",0.5,"u","verd"),I("aceite de oliva",2,"cda","pantry"),I("vinagre o limón",1,"cda","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Hervir los huevos 10 min, enfriar y pelar.","Lavar y cortar la lechuga, el tomate en cubos, rallar la zanahoria, cortar la cebolla fina.","Escurrir el atún y mezclar todo en un bowl grande.","Aliñar con oliva, vinagre, sal y pimienta. Huevo en cuartos arriba."],
 "Sumale un puñado de arroz o lentejas cocidas que sobraron para que rinda más.")
rec("sopa","Sopa de verduras con huevo duro y tostada","plato",35,320,1600,["liviano","económico","batch"],
 [I("zanahoria",2,"u","verd"),I("zapallo anco / calabaza",300,"g","verd"),I("puerro",1,"u","verd"),I("cebolla",1,"u","verd"),I("zapallito",1,"u","verd"),
  I("huevos",2,"u","lact"),I("pan integral (rodajas)",2,"u","pan"),I("caldo de verduras (cubo)",1,"u","pantry"),I("aceite de oliva",1,"cda","pantry"),I("sal, pimienta, laurel",1,"pizca","pantry")],
 ["Rehogar cebolla y puerro en oliva 3 min.","Sumar el resto de las verduras en cubos, cubrir con 1,2 L de agua y el caldo. Laurel.","Hervir 20-25 min. Licuar la mitad si la querés más cremosa.","Hervir los huevos 10 min. Servir la sopa con medio huevo por plato y la tostada."],
 "Hacé el doble y congelá en porciones: cena resuelta para los días que llegás tarde.")
rec("tarta","Tarta de acelga light (sin masa o con masa integral)","plato",45,380,2500,["horno","vegetariano","rinde"],
 [I("acelga (atado)",1,"u","verd"),I("huevos",3,"u","lact"),I("cebolla",1,"u","verd"),I("queso port salut light",100,"g","lact"),I("queso untable light",50,"g","lact"),
  I("avena",60,"g","alm"),I("aceite de oliva",1,"cda","pantry"),I("nuez moscada, sal, pimienta",1,"pizca","pantry")],
 ["Lavar la acelga, hervirla 3 min, escurrir y exprimir bien. Picar.","Rehogar la cebolla. Mezclar con la acelga, los huevos, el queso en cubos, el untable, la avena y los condimentos.","Volcar en una tartera aceitada (sin masa) o sobre una masa integral.","Hornear a 180 °C unos 30 min hasta que dore."],
 "Fría también es riquísima: la porción que sobra es el almuerzo del día siguiente.")
rec("wok","Wok de pollo y verduras con arroz","plato",25,480,3100,["rápido","una sartén"],
 [I("suprema de pollo",400,"g","carne"),I("zanahoria",1,"u","verd"),I("morrón rojo",1,"u","verd"),I("cebolla",1,"u","verd"),I("brócoli o zapallito",1,"u","verd"),
  I("arroz",120,"g","alm"),I("salsa de soja",2,"cda","pantry"),I("ajo (dientes)",2,"u","verd"),I("jengibre (opcional)",1,"pizca","pantry"),I("aceite",1,"cda","pantry")],
 ["Cocinar el arroz. Cortar el pollo en tiras y las verduras en bastones finos.","Wok o sartén grande muy caliente: dorar el pollo 4 min, retirar.","Saltear las verduras 4 min (tienen que quedar crocantes).","Volver el pollo, agregar soja, ajo y jengibre, 1 min más. Servir sobre el arroz."],
 "Las verduras que sobraron del pollo al horno van directo al wok.")
rec("omelette","Omelette de champiñones y queso light","plato",15,400,2200,["rápido","vegetariano","proteico"],
 [I("huevos",4,"u","lact"),I("champiñones",200,"g","verd"),I("queso port salut light",60,"g","lact"),I("cebolla de verdeo",1,"u","verd"),
  I("aceite o manteca",1,"cdita","pantry"),I("sal y pimienta",1,"pizca","pantry"),I("pan integral (rodajas)",2,"u","pan")],
 ["Saltear los champiñones en láminas a fuego fuerte hasta que doren. Reservar.","Batir los huevos con sal y pimienta.","Volcar en sartén antiadherente a fuego medio; cuando cuaje el borde, poner champiñones, queso y verdeo en una mitad.","Doblar, 1 min más y servir con la tostada."],
 "Bandeja de champiñones en oferta = cena lista en 15 minutos.")
rec("milanesas","Milanesas de pollo al horno con ensalada","plato",35,520,3000,["horno","clásico argentino"],
 [I("suprema de pollo",400,"g","carne"),I("huevos",1,"u","lact"),I("pan rallado",80,"g","alm"),I("ajo (dientes)",1,"u","verd"),I("perejil",1,"pizca","pantry"),
  I("lechuga",1,"u","verd"),I("tomate",2,"u","verd"),I("aceite",1,"cda","pantry"),I("limón",1,"u","verd"),I("sal y pimienta",1,"pizca","pantry")],
 ["Abrir las supremas en filetes finos y aplastarlas un poco.","Batir el huevo con ajo, perejil, sal y pimienta. Pasar las milanesas por huevo y después por pan rallado, apretando.","Placa aceitada, horno a 220 °C: 12 min, dar vuelta, 10 min más hasta dorar.","Ensalada de lechuga y tomate con limón y oliva."],
 "Empaná el doble y congelá crudas separadas con papel: van del freezer al horno.")
rec("lentejas","Guiso de lentejas light","plato",50,480,2300,["económico","batch","rinde"],
 [I("lentejas secas",250,"g","alm"),I("carne picada magra",150,"g","carne"),I("cebolla",1,"u","verd"),I("zanahoria",2,"u","verd"),I("morrón rojo",1,"u","verd"),
  I("zapallo anco / calabaza",300,"g","verd"),I("tomate triturado (lata)",1,"u","alm"),I("ajo (dientes)",2,"u","verd"),I("pimentón, comino, laurel, sal",1,"pizca","pantry"),I("aceite de oliva",1,"cda","pantry")],
 ["Remojar las lentejas 1 hora (o usar las que no necesitan remojo).","Rehogar cebolla, ajo, morrón y zanahoria. Sumar la carne picada y dorar.","Agregar las lentejas, el zapallo en cubos, el tomate y agua hasta cubrir. Pimentón, comino, laurel.","Cocinar a fuego bajo 35-40 min, revolviendo. Ajustar sal al final."],
 "Rinde 2 porciones: una para hoy y otra para congelar. Sin chorizo ni panceta es igual de sabroso y mucho más liviano.")
rec("zapallitos","Zapallitos rellenos con carne y queso","plato",45,450,3000,["horno","clásico argentino"],
 [I("zapallitos redondos",4,"u","verd"),I("carne picada magra",250,"g","carne"),I("cebolla",1,"u","verd"),I("huevos",1,"u","lact"),I("queso port salut light",80,"g","lact"),
  I("pan rallado",2,"cda","alm"),I("ajo (dientes)",1,"u","verd"),I("orégano, sal, pimienta",1,"pizca","pantry"),I("aceite de oliva",1,"cda","pantry")],
 ["Hervir los zapallitos enteros 10 min. Cortar la tapa y ahuecar con cuchara (guardar la pulpa).","Rehogar cebolla y ajo; sumar la carne y dorar. Agregar la pulpa picada, orégano, sal y pimienta. Fuera del fuego, el huevo y la mitad del queso.","Rellenar los zapallitos, cubrir con el resto del queso y pan rallado.","Horno a 200 °C unos 20 min hasta gratinar."],
 "Con la misma mezcla podés rellenar morrones o berenjenas.")
rec("salmon","Salmón al papillote con verduras","plato",30,480,6100,["horno","pescado","liviano"],
 [I("salmón (filet)",360,"g","carne"),I("zapallito",1,"u","verd"),I("zanahoria",1,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("cebolla",0.5,"u","verd"),
  I("limón",1,"u","verd"),I("aceite de oliva",2,"cda","pantry"),I("eneldo o perejil, sal, pimienta",1,"pizca","pantry"),I("papel manteca o aluminio",2,"u","pantry")],
 ["Horno a 200 °C. Cortar las verduras en bastones finos.","Sobre un papel grande, cama de verduras, el salmón arriba, rodajas de limón, oliva, sal, pimienta y hierbas.","Cerrar el paquete bien hermético.","Hornear 18-20 min. Abrir en la mesa."],
 "El plato más caro del plan: queda para el sábado. Si el salmón está imposible, hacelo con merluza o trucha.")
rec("pastel","Pastel de papa light","plato",60,520,2900,["horno","clásico argentino","rinde"],
 [I("papa",700,"g","verd"),I("carne picada magra",300,"g","carne"),I("cebolla",1,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("huevos",2,"u","lact"),
  I("leche",80,"ml","lact"),I("queso port salut light",60,"g","lact"),I("aceitunas verdes",8,"u","alm"),I("pimentón, comino, sal, pimienta",1,"pizca","pantry"),I("aceite",1,"cda","pantry")],
 ["Hervir las papas 20 min y hacer un puré con leche, sal y nuez moscada.","Rehogar cebolla y morrón, dorar la carne con pimentón y comino. Sumar 1 huevo duro picado y las aceitunas.","Fuente: capa de carne, capa de puré, queso rallado arriba.","Horno a 200 °C 20 min hasta gratinar."],
 "Versión light: mitad papa y mitad zapallo en el puré.")
rec("empanadas","Empanadas de carne al horno","plato",60,540,2800,["horno","clásico argentino","finde"],
 [I("tapas para empanadas",12,"u","alm"),I("carne picada magra",400,"g","carne"),I("cebolla",2,"u","verd"),I("cebolla de verdeo",2,"u","verd"),I("huevos",2,"u","lact"),
  I("aceitunas verdes",12,"u","alm"),I("pimentón, comino, ají molido, sal",1,"pizca","pantry"),I("aceite",2,"cda","pantry")],
 ["Rehogar la cebolla en abundante aceite hasta transparentar. Sumar la carne y cocinar 5 min; condimentar fuerte con pimentón, comino y ají molido.","Fuera del fuego: verdeo picado. Enfriar en la heladera (ideal, 1 hora).","Rellenar las tapas con huevo duro picado y una aceituna; cerrar con repulgue o con tenedor.","Pintar con huevo. Horno a 220 °C 15-18 min."],
 "Salen 6: 3 para el almuerzo del sábado y 3 para la vianda del lunes.")

# ---------- MÁS PLATOS ----------
rec("noquis","Ñoquis de calabaza","plato",45,520,1900,["clásico argentino","vegetariano","29 del mes"],
 [I("zapallo anco / calabaza",600,"g","verd"),I("harina 0000",250,"g","alm"),I("huevos",1,"u","lact"),I("queso rallado",40,"g","lact"),I("manteca",20,"g","lact"),I("nuez moscada o salvia, sal",1,"pizca","pantry")],
 ["Cocinar la calabaza al horno (o al vapor) hasta que esté tierna; pisarla y dejar que se enfríe y pierda agua.","Mezclar con el huevo, el queso y sal; sumar la harina de a poco hasta una masa blanda que apenas no se pegue.","Hacer rollitos, cortar trozos de 2 cm y marcarlos con un tenedor.","Hervir en agua con sal: cuando flotan, 1 minuto más. Saltear en manteca con salvia o servir con salsa de tomate."],
 "El 29 se comen ñoquis con un billete abajo del plato: tradición porteña para que no falte plata. Por eso caen el 29 de octubre y el 29 de noviembre.")
rec("tortilla","Tortilla de papas","plato",35,480,1700,["clásico","vegetariano","rinde"],
 [I("papa",600,"g","verd"),I("cebolla",1,"u","verd"),I("huevos",5,"u","lact"),I("aceite",3,"cda","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Cortar las papas en láminas finas y la cebolla en pluma.","Cocinarlas en aceite a fuego medio-bajo 15 min, sin que doren. Escurrir bien.","Mezclar con los huevos batidos y sal; dejar reposar 5 min.","Cuajar en sartén a fuego medio 4 min, dar vuelta con un plato y 3 min más."],
 "Jugosa adentro: sacala cuando el centro todavía tiembla un poco.")
rec("albondigas","Albóndigas con fideos","plato",40,580,3200,["clásico","rinde","batch"],
 [I("carne picada magra",400,"g","carne"),I("pan rallado",3,"cda","alm"),I("huevos",1,"u","lact"),I("ajo (dientes)",2,"u","verd"),I("perejil",1,"pizca","pantry"),I("cebolla",1,"u","verd"),I("tomate triturado (lata)",1,"u","alm"),I("fideos (spaghetti o tallarines)",200,"g","alm"),I("aceite de oliva",1,"cda","pantry"),I("orégano, sal, pimienta",1,"pizca","pantry")],
 ["Mezclar la carne con pan rallado, huevo, un ajo picado, perejil y sal. Formar bolitas del tamaño de una nuez.","Dorarlas en sartén con un hilo de aceite y reservar.","En la misma sartén rehogar la cebolla y el otro ajo; sumar el tomate y el orégano. Volver las albóndigas y cocinar 20 min a fuego bajo.","Hervir los fideos al dente y servir con la salsa."],
 "Rinde 2: congelá la mitad de las albóndigas crudas y tenés otra cena resuelta.")
rec("curry","Pollo al curry con arroz","plato",30,560,3400,["una olla","rápido"],
 [I("suprema de pollo",400,"g","carne"),I("cebolla",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("curry en polvo",1,"cda","pantry"),I("jengibre (opcional)",1,"pizca","pantry"),I("leche de coco",200,"ml","alm"),I("tomate",1,"u","verd"),I("arroz",150,"g","alm"),I("aceite",1,"cda","pantry"),I("sal",1,"pizca","pantry")],
 ["Dorar el pollo en cubos y reservar.","Rehogar cebolla y ajo; agregar el curry y el jengibre 30 segundos.","Sumar la leche de coco, el tomate en cubos y el pollo. Cocinar 15 min a fuego bajo.","Servir con el arroz blanco y perejil o cilantro picado."],
 "Si no hay leche de coco, va con un pote de yogur natural agregado fuera del fuego.")
rec("hamburguesas","Hamburguesas caseras con batatas al horno","plato",40,620,3300,["horno","finde"],
 [I("carne picada magra",300,"g","carne"),I("cebolla",0.5,"u","verd"),I("huevos",1,"u","lact"),I("pan rallado",2,"cda","alm"),I("pan de hamburguesa",2,"u","pan"),I("batata",400,"g","verd"),I("tomate",1,"u","verd"),I("lechuga",0.5,"u","verd"),I("queso port salut light",40,"g","lact"),I("pimentón, sal, pimienta",1,"pizca","pantry"),I("aceite de oliva",1,"cda","pantry")],
 ["Batatas en bastones con oliva, pimentón y sal: horno a 200 °C unos 30 min.","Mezclar la carne con la cebolla rallada, el huevo, el pan rallado y sal. Formar un medallón grande (o dos chicos) sin apretar demasiado.","Plancha caliente: 4 min por lado; el queso arriba en el último minuto.","Armar con lechuga y tomate en el pan tostado."],
 "Cuanto menos amasás la carne, más jugosa queda.")
rec("garbanzos","Ensalada de garbanzos y quinoa","plato",20,450,2300,["vegetariano","proteico","vianda"],
 [I("garbanzos cocidos (lata)",1,"u","alm"),I("quinoa",100,"g","alm"),I("tomate",2,"u","verd"),I("pepino",1,"u","verd"),I("cebolla morada",0.5,"u","verd"),I("perejil",1,"pizca","pantry"),I("limón",1,"u","verd"),I("aceite de oliva",2,"cda","pantry"),I("comino, sal, pimienta",1,"pizca","pantry")],
 ["Enjuagar la quinoa y cocinarla 12 min en el doble de agua; dejar enfriar.","Cortar tomate, pepino y cebolla en cubitos.","Mezclar con los garbanzos escurridos y la quinoa.","Aliñar con oliva, limón, comino, sal y perejil."],
 "Aguanta 2 días en la heladera: la vianda perfecta para llevar.")
rec("berenjenas","Berenjenas a la parmesana light","plato",50,420,2600,["horno","vegetariano"],
 [I("berenjena",2,"u","verd"),I("tomate triturado (lata)",1,"u","alm"),I("ajo (dientes)",2,"u","verd"),I("queso port salut light",120,"g","lact"),I("queso rallado",30,"g","lact"),I("albahaca u orégano",1,"pizca","pantry"),I("aceite de oliva",2,"cda","pantry"),I("sal",1,"pizca","pantry")],
 ["Cortar las berenjenas en rodajas, salarlas 15 min y secarlas.","Dorarlas a la plancha o al horno con apenas de oliva (no fritas).","En una fuente, capas de berenjena, salsa de tomate con ajo y queso; terminar con queso rallado.","Horno a 200 °C unos 25 min hasta gratinar."],
 "Al horno en vez de fritas: la mitad de aceite y el mismo sabor.")
rec("arrozpollo","Arroz con pollo","plato",40,560,3000,["una olla","rinde"],
 [I("suprema de pollo",400,"g","carne"),I("arroz",200,"g","alm"),I("cebolla",1,"u","verd"),I("morrón rojo",1,"u","verd"),I("arvejas (lata o congeladas)",150,"g","alm"),I("ajo (dientes)",2,"u","verd"),I("caldo de verduras (cubo)",1,"u","pantry"),I("pimentón, cúrcuma, sal",1,"pizca","pantry"),I("aceite",1,"cda","pantry")],
 ["Dorar el pollo en trozos y reservar.","Rehogar cebolla, morrón y ajo; sumar el arroz y el pimentón, revolver 1 min.","Agregar el caldo caliente (el doble de volumen que el arroz) y el pollo; tapar y cocinar 18 min a fuego bajo.","Arvejas 5 min antes del final. Reposar tapado 5 min."],
 "El reposo tapado es lo que deja el arroz suelto y húmedo.")
rec("wrap","Wrap de pollo y palta","plato",15,480,3100,["rápido","sin horno"],
 [I("tortillas de harina (rapiditas)",2,"u","pan"),I("suprema de pollo",250,"g","carne"),I("palta",1,"u","verd"),I("lechuga",0.5,"u","verd"),I("tomate",1,"u","verd"),I("yogur natural (pote)",1,"u","lact"),I("limón",0.5,"u","verd"),I("pimentón, sal",1,"pizca","pantry")],
 ["Pollo en tiras con pimentón y sal: plancha 6 min.","Salsa: yogur, jugo de limón, sal.","Armar sobre la tortilla: lechuga, tomate, palta, pollo, salsa.","Cerrar y dorar 1 min por lado en la sartén."],
 "Con pollo que sobró del horno queda listo en 5 minutos.")
rec("gramajo","Revuelto gramajo light","plato",25,500,2400,["clásico argentino","rápido"],
 [I("papa",400,"g","verd"),I("huevos",4,"u","lact"),I("jamón cocido",100,"g","carne"),I("arvejas (lata o congeladas)",100,"g","alm"),I("cebolla",0.5,"u","verd"),I("aceite",1,"cda","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Papas en bastones finos: horno o airfryer a 200 °C unos 20 min con poco aceite (en vez de fritas).","Rehogar la cebolla con el jamón en tiritas.","Sumar las papas y las arvejas.","Volcar los huevos batidos y revolver 1 minuto: tiene que quedar cremoso."],
 "La versión de bodegón lleva papas fritas; al horno pierde la grasa y nada del sabor.")
rec("pescadohorno","Pescado al horno con papas","plato",40,480,5200,["horno","pescado"],
 [I("filet de merluza",500,"g","carne"),I("papa",500,"g","verd"),I("cebolla",1,"u","verd"),I("tomate",2,"u","verd"),I("limón",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("aceite de oliva",2,"cda","pantry"),I("perejil, sal, pimienta",1,"pizca","pantry")],
 ["Papas en rodajas finas y cebolla en pluma en una fuente con oliva y sal: horno a 200 °C 15 min.","Apoyar el pescado arriba con rodajas de tomate, ajo picado, limón y perejil.","Hornear 15 min más hasta que el pescado se deshaga con el tenedor."],
 "También con abadejo o lenguado si está en oferta.")
rec("carbonara","Carbonara cremosa","plato",25,650,3000,["pasta","finde"],
 [I("spaghetti",200,"g","alm"),I("panceta ahumada",100,"g","carne"),I("huevos",2,"u","lact"),I("yema de huevo",1,"u","lact"),I("queso rallado (sardo o parmesano)",60,"g","lact"),I("pimienta negra, sal",1,"pizca","pantry")],
 ["Dorar la panceta en cubitos a fuego medio hasta que quede crocante.","Batir los huevos, la yema, el queso y mucha pimienta.","Hervir la pasta al dente y guardar una taza del agua.","Fuera del fuego: mezclar la pasta con la panceta y la crema de huevo, aflojando con agua de cocción hasta que quede cremosa."],
 "Nunca con la sartén al fuego cuando entra el huevo: se corta y queda revuelto.")

# ---------- PLAN ----------
start = datetime.date(2026,10,27)
DOW = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
# ---------- RECETAS NUEVAS (tools/add_recipes.py) ----------
rec("avenamanzana","Avena cocida con manzana y canela","desayuno",10,337,1300,["rápido", "vegano", "vegetariano", "sin lactosa", "económico"],
 [I("avena",80,"g","alm"),I("bebida de soja",400,"ml","lact"),I("manzana",1,"u","verd"),I("pasas de uva",30,"g","alm"),I("canela",1,"pizca","pantry"),I("sal",1,"pizca","pantry")],
 ["Cortá la manzana en cubitos chicos (con cáscara, si querés).", "Poné en una olla la avena, la bebida de soja, la manzana, las pasas, la canela y una pizca de sal.", "Cociná a fuego bajo 5-6 minutos, revolviendo, hasta que espese y la manzana esté tierna.", "Serví caliente con un poco más de canela por arriba."],
 "Hacé el doble y guardalo en la heladera: al otro día lo recalentás con un chorrito de bebida de soja y queda cremoso igual.")
rec("chipa","Chipá casero","desayuno",35,447,1900,["horno", "vegetariano", "sin gluten"],
 [I("fécula de mandioca",100,"g","alm"),I("queso port salut light",80,"g","lact"),I("queso rallado",30,"g","lact"),I("huevos",1,"u","lact"),I("leche",40,"ml","lact"),I("manteca",15,"g","lact"),I("sal",1,"pizca","pantry")],
 ["Prendé el horno a 200 °C. Rallá o cortá bien chiquito el queso port salut.", "En un bowl mezclá la fécula, los quesos, la sal y la manteca blanda.", "Sumá el huevo y la leche de a poco y amasá hasta tener una masa suave que no se pegue en las manos.", "Armá bolitas del tamaño de una nuez y ponelas en una placa aceitada, separadas.", "Horneá 15-18 minutos, hasta que estén apenas doradas abajo. Comelos tibios."],
 "Si son para alguien celíaco, comprá fécula y quesos con el logo «sin TACC». Crudos se congelan en bolitas y van directo al horno.")
rec("tostadafrancesa","Tostadas francesas con fruta","desayuno",15,339,1300,["rápido", "vegetariano", "económico"],
 [I("pan integral (rodajas)",4,"u","pan"),I("huevos",2,"u","lact"),I("leche",100,"ml","lact"),I("manteca",1,"cdita","lact"),I("miel",2,"cdita","pantry"),I("fruta de estación",1,"u","verd"),I("canela",1,"pizca","pantry")],
 ["Batí los huevos con la leche y la canela en un plato hondo.", "Mojá las rodajas de pan de los dos lados, sin que se desarmen.", "Cocinalas en sartén con apenas de manteca a fuego medio, 2 minutos por lado, hasta que doren.", "Serví con la fruta en rodajas y un hilo de miel."],
 "Es ideal para el pan que quedó un poco duro: absorbe mejor el huevo y no se rompe.")
rec("polenta","Polenta con salsa de tomate y champiñones","plato",25,484,1800,["rápido", "olla", "vegano", "vegetariano", "sin gluten", "sin lactosa", "económico"],
 [I("harina de maíz (polenta)",150,"g","alm"),I("champiñones",250,"g","verd"),I("tomate triturado (lata)",1,"u","alm"),I("cebolla",1,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("aceite de oliva",2,"cda","pantry"),I("orégano, laurel, sal, pimienta",1,"pizca","pantry")],
 ["Picá la cebolla, el morrón y el ajo y rehogalos en una cucharada de aceite 5 minutos.", "Sumá los champiñones en láminas y cociná a fuego fuerte hasta que doren.", "Agregá el tomate, orégano, laurel y sal; dejá 10 minutos a fuego bajo.", "Mientras, hervé 750 ml de agua con sal, echá la polenta en lluvia batiendo y cociná según el paquete (1-5 minutos) hasta que espese. Terminá con la otra cucharada de aceite.", "Serví la polenta con la salsa bien caliente arriba."],
 "La polenta que sobra se enfría en una fuente, se corta en bastones y al otro día va a la plancha o al horno hasta dorarse.")
rec("hamblentejas","Hamburguesas de lentejas con ensalada","plato",40,450,1500,["vegano", "vegetariano", "sin lactosa", "proteico", "económico"],
 [I("lentejas secas",150,"g","alm"),I("avena",40,"g","alm"),I("zanahoria",1,"u","verd"),I("cebolla",1,"u","verd"),I("ajo (dientes)",1,"u","verd"),I("aceite",1,"cda","pantry"),I("comino, pimentón, sal, pimienta",1,"pizca","pantry"),I("lechuga",0.5,"u","verd"),I("tomate",1,"u","verd")],
 ["Hervé las lentejas 20-25 minutos hasta que estén tiernas y colalas muy bien.", "Rehogá la cebolla picada, el ajo y la zanahoria rallada 5 minutos.", "Pisá las lentejas con el rehogado, la avena, comino, pimentón y sal hasta tener una pasta que se pueda moldear.", "Formá 4 medallones y cocinalos en sartén con apenas de aceite, 4 minutos por lado (o al horno a 200 °C unos 20 minutos).", "Serví con ensalada de lechuga y tomate."],
 "Si la mezcla queda húmeda, sumá una cucharada más de avena. Se congelan crudas, separadas con papel.")
rec("pastabrocoli","Fideos con brócoli, ajo y limón","plato",20,563,1700,["rápido", "vegano", "vegetariano", "sin lactosa", "económico"],
 [I("fideos secos cortos (mostachol o tirabuzón)",200,"g","alm"),I("brócoli",350,"g","verd"),I("ajo (dientes)",3,"u","verd"),I("aceite de oliva",3,"cda","pantry"),I("limón",0.5,"u","verd"),I("ají molido, sal, pimienta",1,"pizca","pantry")],
 ["Poné a hervir agua con sal. Separá el brócoli en arbolitos chicos y pelá y cortá el tronco en cubitos.", "Echá los fideos y, 4 minutos antes de que estén, sumá el brócoli a la misma olla.", "En una sartén dorá apenas el ajo en láminas con el aceite y el ají molido, a fuego bajo.", "Colá guardando medio vaso del agua, pasá todo a la sartén y salteá 1 minuto con un chorrito de esa agua.", "Terminá con ralladura y jugo de limón."],
 "Un poco del agua de cocción hace que el aceite se pegue a los fideos y quede una salsa cremosa sin crema ni queso.")
rec("garbanzosespinaca","Guiso de garbanzos con espinaca y arroz","plato",30,552,2000,["olla", "vegano", "vegetariano", "sin gluten", "sin lactosa", "económico"],
 [I("garbanzos cocidos (lata)",1.5,"u","alm"),I("espinaca",1,"u","verd"),I("cebolla",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("tomate triturado (lata)",0.5,"u","alm"),I("arroz",80,"g","alm"),I("aceite de oliva",1.5,"cda","pantry"),I("pimentón, comino, sal, pimienta",1,"pizca","pantry")],
 ["Cociná el arroz en agua con sal y reservá.", "Rehogá la cebolla y el ajo picados en el aceite 5 minutos; sumá pimentón y comino 30 segundos.", "Agregá el tomate y los garbanzos enjuagados con medio vaso de agua; cociná 10 minutos a fuego bajo.", "Sumá la espinaca lavada y picada y revolvé hasta que se achique (2-3 minutos). Ajustá la sal.", "Serví el guiso con el arroz al lado."],
 "Con garbanzos secos sale más barato: remojalos la noche anterior y hervilos 1 hora; congelá lo que sobre en porciones.")
rec("revueltozapallitos","Revuelto de zapallitos con papas","plato",25,430,1900,["rápido", "vegetariano", "sin gluten", "económico"],
 [I("zapallito",3,"u","verd"),I("cebolla",1,"u","verd"),I("huevos",4,"u","lact"),I("papa",300,"g","verd"),I("queso rallado",20,"g","lact"),I("aceite",1,"cda","pantry"),I("sal y pimienta",1,"pizca","pantry")],
 ["Hervé las papas en cubos 12 minutos y colalas.", "Cortá los zapallitos en bastoncitos o cubos y la cebolla en pluma.", "Rehogá la cebolla en el aceite, sumá los zapallitos y cociná 8-10 minutos hasta que estén tiernos y se evapore el agua.", "Agregá las papas, salpimentá y volcá los huevos batidos con el queso.", "Revolvé a fuego bajo 1-2 minutos, hasta que el huevo quede cremoso."],
 "Sin el queso rallado queda sin lactosa y sigue rico: sumale perejil o cebolla de verdeo.")
rec("bunuelosacelga","Buñuelos de acelga con ensalada de tomate","plato",35,512,1600,["vegetariano", "económico"],
 [I("acelga (atado)",1,"u","verd"),I("huevos",2,"u","lact"),I("harina 0000",100,"g","alm"),I("leche",60,"ml","lact"),I("queso rallado",30,"g","lact"),I("cebolla",0.5,"u","verd"),I("ajo (dientes)",1,"u","verd"),I("aceite",2,"cda","pantry"),I("tomate",2,"u","verd"),I("polvo de hornear",1,"cdita","pantry"),I("nuez moscada, sal, pimienta",1,"pizca","pantry")],
 ["Lavá la acelga, hervila 3 minutos, escurrila apretando bien y picala fina.", "Mezclá la acelga con la cebolla y el ajo picados, los huevos, el queso, la leche, sal, pimienta y nuez moscada.", "Sumá la harina y el polvo de hornear hasta tener una pasta espesa.", "Cociná cucharadas de la mezcla en sartén con un poco de aceite, 2-3 minutos por lado, aplastándolas un poco (o al horno a 200 °C unos 20 minutos en placa aceitada).", "Serví con ensalada de tomate."],
 "Escurrí muy bien la acelga: si queda agua, los buñuelos se desarman y absorben más aceite.")
rec("pizzacasera","Pizza casera de muzzarella","plato",90,692,2600,["horno", "vegetariano"],
 [I("harina 0000",200,"g","alm"),I("levadura seca",5,"g","alm"),I("aceite de oliva",1.5,"cda","pantry"),I("tomate triturado (lata)",0.5,"u","alm"),I("queso mozzarella",150,"g","lact"),I("aceitunas verdes",8,"u","alm"),I("orégano, sal",1,"pizca","pantry")],
 ["Mezclá la harina, la levadura, una cucharadita de sal, una cucharada de aceite y unos 130 ml de agua tibia; amasá 5 minutos.", "Dejá levar tapada en un lugar tibio 1 hora, hasta que duplique.", "Estirá en una pizzera aceitada, cubrí con el tomate condimentado con sal y orégano y horneá 10 minutos a 220 °C.", "Sumá la muzzarella en cubos y las aceitunas; volvé al horno 8-10 minutos, hasta que se derrita.", "Terminá con orégano y un hilo de aceite."],
 "Hacé el doble de masa y congelá un bollo: lo sacás a la mañana y a la noche tenés pizza.")
rec("cerdobatata","Costeletas de cerdo con puré de batata","plato",35,617,3800,["sin gluten", "sin lactosa", "proteico"],
 [I("costeletas de cerdo",400,"g","carne"),I("batata",500,"g","verd"),I("aceite de oliva",1,"cda","pantry"),I("ajo (dientes)",1,"u","verd"),I("limón",0.5,"u","verd"),I("lechuga",0.5,"u","verd"),I("romero, nuez moscada, sal, pimienta",1,"pizca","pantry")],
 ["Pelá las batatas, cortalas en cubos y hervilas 15 minutos.", "Colalas y pisalas con media cucharada de aceite, nuez moscada y sal.", "Condimentá las costeletas con ajo picado, romero, sal, pimienta y jugo de limón.", "Cocinalas en plancha o sartén bien caliente con el resto del aceite, 4-5 minutos por lado, hasta que no queden rosadas en el centro.", "Serví con el puré y la lechuga."],
 "Las costeletas finas en bandeja suelen estar en oferta; también va con bondiola en bifes.")
rec("pollodisco","Pollo al disco con papas y morrones (en olla)","plato",50,538,3000,["olla", "sin gluten", "sin lactosa", "proteico"],
 [I("pata muslo de pollo",2,"u","carne"),I("papa",400,"g","verd"),I("cebolla",1,"u","verd"),I("morrón rojo",1.5,"u","verd"),I("tomate",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("aceite",1,"cda","pantry"),I("pimentón, orégano, laurel, sal, pimienta",1,"pizca","pantry")],
 ["Sacale la piel al pollo y separá pata y muslo. Dorá las presas en una olla o sartén grande con el aceite y reservá.", "En la misma olla rehogá la cebolla, el morrón en tiras y el ajo 5 minutos.", "Sumá el tomate en cubos, el pimentón, el orégano y el laurel, y volvé el pollo.", "Agregá las papas en cubos y un vaso de agua; tapá y cociná 30 minutos a fuego bajo, revolviendo cada tanto.", "Destapá los últimos 5 minutos para que espese el jugo y ajustá la sal."],
 "Sin disco no pasa nada: una olla de hierro o una sartén honda con tapa hace lo mismo en la hornalla.")
rec("guisofideos","Guiso de fideos con carne","plato",50,615,3200,["olla", "sin lactosa", "económico"],
 [I("carne para guiso (paleta o roast beef)",250,"g","carne"),I("fideos secos cortos (mostachol o tirabuzón)",120,"g","alm"),I("papa",150,"g","verd"),I("zanahoria",1,"u","verd"),I("cebolla",1,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("tomate triturado (lata)",0.5,"u","alm"),I("caldo de verduras (cubo)",1,"u","pantry"),I("aceite",1,"cda","pantry"),I("pimentón, laurel, pimienta",1,"pizca","pantry")],
 ["Cortá la carne en cubos chicos y dorala en la olla con el aceite.", "Sumá la cebolla, el morrón y la zanahoria picados y rehogá 5 minutos.", "Agregá el tomate, el pimentón, el laurel, el caldo disuelto en 600 ml de agua caliente y cociná tapado 20 minutos a fuego bajo.", "Sumá la papa en cubos y los fideos; cociná 12-15 minutos más, revolviendo y agregando agua caliente si hace falta.", "Apagá cuando los fideos estén a punto y dejá reposar 5 minutos."],
 "Tiene que quedar caldoso: los fideos siguen chupando líquido en el plato.")
rec("bifecriolla","Bifes a la criolla","plato",40,586,4200,["olla", "sin gluten", "sin lactosa", "proteico"],
 [I("nalga / bife magro",400,"g","carne"),I("papa",400,"g","verd"),I("cebolla",1.5,"u","verd"),I("morrón rojo",1,"u","verd"),I("tomate",2,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("aceite",1,"cda","pantry"),I("pimentón, orégano, laurel, sal, pimienta",1,"pizca","pantry")],
 ["Cortá las papas en rodajas de 1 cm, la cebolla y el morrón en aros y el tomate en rodajas.", "En una olla o sartén honda con el aceite, armá capas: papa, cebolla, morrón, tomate y los bifes salpimentados; repetí.", "Espolvoreá pimentón, orégano, ajo picado y laurel entre capas.", "Sumá medio vaso de agua, tapá y cociná a fuego bajo 30-35 minutos, sin revolver, hasta que las papas estén tiernas."],
 "Pedí los bifes finitos de nalga o cuadrada: con la cocción lenta quedan tiernos aunque sean cortes económicos.")

# ---------- RECETAS NUEVAS (tools/add_recipes.py) ----------
rec("licuadobanana","Licuado de banana, avena y pasta de maní","desayuno",5,333,1100,["rápido", "sin cocción", "económico", "vegano", "vegetariano", "sin lactosa"],
 [I("banana",2,"u","verd"),I("avena",40,"g","alm"),I("bebida de soja",400,"ml","lact"),I("pasta de maní",2,"cda","alm"),I("canela",1,"pizca","pantry")],
 ["Pelá las bananas y cortalas en trozos (si están congeladas, mejor: queda más cremoso).", "Poné en la licuadora la banana, la avena, la bebida de soja, la pasta de maní y la canela.", "Licuá 1 minuto, hasta que no queden grumos de avena.", "Serví enseguida; si queda muy espeso, sumá un chorrito más de bebida."],
 "Congelá las bananas bien maduras en rodajas: no se tiran y el licuado sale frío sin hielo.")
rec("chiabanana","Pudding de chía con banana","desayuno",10,259,1600,["sin cocción", "sin gluten", "vegano", "vegetariano", "sin lactosa"],
 [I("semillas de chía",40,"g","alm"),I("bebida de soja",300,"ml","lact"),I("banana",1,"u","verd"),I("fruta de estación",1,"u","verd"),I("canela",1,"pizca","pantry")],
 ["La noche anterior, pisá media banana y mezclala con la chía, la bebida de soja y la canela en un frasco.", "Revolvé bien, esperá 5 minutos y volvé a revolver para que la chía no se pegue en el fondo.", "Tapá y dejá en la heladera toda la noche (mínimo 4 horas).", "A la mañana serví con la otra media banana y la fruta en cubitos."],
 "Armá dos frascos juntos: aguantan 3 días en la heladera y el desayuno queda listo con solo abrir la tapa.")
rec("tofurevuelto","Revuelto de tofu con espinaca y tomate","desayuno",12,366,2600,["rápido", "sin gluten", "proteico", "vegano", "vegetariano", "sin lactosa"],
 [I("tofu firme",300,"g","verd"),I("espinaca",0.5,"u","verd"),I("tomate",1,"u","verd"),I("cebolla",0.5,"u","verd"),I("aceite",1,"cda","pantry"),I("palta",0.5,"u","verd"),I("cúrcuma, sal, pimienta",1,"pizca","pantry")],
 ["Escurrí el tofu apretándolo con papel y desmenuzalo con un tenedor.", "Rehogá la cebolla picada en el aceite 3 minutos.", "Sumá el tofu, la cúrcuma, sal y pimienta y cociná 4 minutos revolviendo, hasta que tome color amarillo.", "Agregá el tomate en cubos y la espinaca picada y revolvé 1-2 minutos, hasta que se achique.", "Serví con la palta en láminas."],
 "La cúrcuma le da el color de huevo revuelto; una pizca de sal negra (kala namak) le suma el sabor, si la conseguís en una dietética.")
rec("locrovegano","Locro vegano","plato",120,619,2200,["olla", "sin gluten", "económico", "vegano", "vegetariano", "sin lactosa"],
 [I("maíz blanco partido",100,"g","alm"),I("porotos alubia cocidos (lata)",1.5,"u","alm"),I("zapallo anco / calabaza",400,"g","verd"),I("choclo en grano (lata)",0.5,"u","alm"),I("cebolla",1,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("cebolla de verdeo",2,"u","verd"),I("aceite",2,"cda","pantry"),I("pimentón, comino, laurel, ají molido, sal",1,"pizca","pantry")],
 ["Dejá el maíz en remojo la noche anterior. Al otro día, colalo y hervilo en 1,2 litros de agua con laurel 1 hora, a fuego bajo.", "Rehogá la cebolla y el morrón picados en una cucharada de aceite y sumalos a la olla con el zapallo en cubos.", "Cociná 40 minutos más, revolviendo seguido para que no se pegue: el zapallo se tiene que deshacer y espesar.", "Agregá los porotos enjuagados y el choclo, con pimentón, comino y sal; 10 minutos más.", "Para la salsita: verdeo picado con la otra cucharada de aceite, pimentón y ají molido. Servila arriba de cada plato."],
 "Rinde mucho y se congela perfecto: hacé el doble el fin de semana y guardá porciones para días de frío.")
rec("milanesasberenjena","Milanesas de berenjena veganas al horno","plato",40,495,2000,["horno", "sin gluten", "vegano", "vegetariano", "sin lactosa"],
 [I("berenjena",2,"u","verd"),I("harina de garbanzo",80,"g","alm"),I("harina de maíz (polenta)",80,"g","alm"),I("ajo (dientes)",1,"u","verd"),I("aceite",2,"cda","pantry"),I("lechuga",0.5,"u","verd"),I("tomate",2,"u","verd"),I("orégano, pimentón, sal, pimienta",1,"pizca","pantry")],
 ["Cortá las berenjenas en rodajas de 1 cm, salalas y dejalas 15 minutos; secalas bien con papel.", "Mezclá la harina de garbanzo con unos 120 ml de agua, el ajo picado, sal y pimentón hasta tener una pasta como de huevo batido.", "Pasá cada rodaja por esa mezcla y después por la polenta con orégano, apretando.", "Acomodalas en una placa aceitada, rociá con el resto del aceite y horneá a 220 °C unos 25 minutos, dándolas vuelta a mitad.", "Serví con ensalada de lechuga y tomate."],
 "La harina de garbanzo reemplaza al huevo; si cocinás para alguien celíaco, comprá harinas con el logo «sin TACC».")
rec("currylentejas","Curry de lentejas con leche de coco y arroz","plato",40,649,2300,["olla", "sin gluten", "proteico", "vegano", "vegetariano", "sin lactosa"],
 [I("lentejas secas",140,"g","alm"),I("leche de coco",150,"ml","alm"),I("tomate triturado (lata)",0.5,"u","alm"),I("cebolla",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("curry en polvo",1,"cda","pantry"),I("espinaca",0.5,"u","verd"),I("arroz",80,"g","alm"),I("aceite",0.5,"cda","pantry"),I("jengibre (opcional)",1,"pizca","pantry"),I("sal",1,"pizca","pantry")],
 ["Cociná el arroz en agua con sal y reservá.", "Rehogá la cebolla y el ajo picados en el aceite 4 minutos; sumá el curry y el jengibre 30 segundos.", "Agregá las lentejas enjuagadas, el tomate y 500 ml de agua; cociná tapado 25-30 minutos a fuego bajo, hasta que estén tiernas.", "Sumá la leche de coco y la espinaca picada y cociná 5 minutos más. Ajustá la sal.", "Serví con el arroz."],
 "El resto de la lata de leche de coco se congela en una cubetera: cada cubito es una cucharada para el próximo curry.")
rec("chiliporotos","Chili de porotos negros y choclo con arroz","plato",35,598,2100,["olla", "sin gluten", "económico", "vegano", "vegetariano", "sin lactosa"],
 [I("porotos negros cocidos (lata)",2,"u","alm"),I("choclo en grano (lata)",0.5,"u","alm"),I("tomate triturado (lata)",1,"u","alm"),I("cebolla",1,"u","verd"),I("morrón rojo",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("arroz",100,"g","alm"),I("aceite",1,"cda","pantry"),I("comino, pimentón, ají molido, sal",1,"pizca","pantry")],
 ["Cociná el arroz y reservá.", "Rehogá la cebolla, el morrón y el ajo picados en el aceite 5 minutos.", "Sumá comino, pimentón y ají molido; revolvé 30 segundos y agregá el tomate.", "Agregá los porotos enjuagados y el choclo y cociná 15 minutos a fuego bajo, hasta que espese. Ajustá la sal.", "Serví con el arroz (y palta, si tenés)."],
 "Enjuagá bien los porotos y el choclo de lata antes de usarlos: baja mucho la sal. Con porotos secos sale la mitad: remojalos la noche anterior y hervilos 1 hora; el chili se congela muy bien.")
rec("woktofu","Wok de tofu y verduras con arroz","plato",25,586,3000,["rápido", "proteico", "vegano", "vegetariano", "sin lactosa"],
 [I("tofu firme",300,"g","verd"),I("brócoli",200,"g","verd"),I("zanahoria",1,"u","verd"),I("morrón rojo",1,"u","verd"),I("cebolla",1,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("salsa de soja",2,"cda","pantry"),I("arroz",120,"g","alm"),I("aceite",1,"cda","pantry"),I("jengibre (opcional)",1,"pizca","pantry")],
 ["Cociná el arroz. Escurrí el tofu apretándolo con papel y cortalo en cubos.", "Dorá el tofu en el wok o sartén grande con la mitad del aceite, sin moverlo mucho, 6-8 minutos; reservá.", "Con el resto del aceite salteá a fuego fuerte la cebolla, la zanahoria y el morrón en bastones y el brócoli en arbolitos, 4-5 minutos.", "Volvé el tofu, sumá el ajo, el jengibre y la salsa de soja y salteá 1 minuto más.", "Serví sobre el arroz."],
 "Si cocinás para alguien celíaco, usá salsa de soja con el logo «sin TACC» y el plato queda apto.")
rec("empanadaslentejas","Empanadas de lentejas veganas al horno","plato",60,623,2400,["horno", "económico", "vegano", "vegetariano", "sin lactosa"],
 [I("tapas para empanadas veganas",8,"u","alm"),I("lentejas secas",120,"g","alm"),I("cebolla",1.5,"u","verd"),I("morrón rojo",0.5,"u","verd"),I("cebolla de verdeo",1,"u","verd"),I("aceite",1,"cda","pantry"),I("pimentón, comino, ají molido, sal",1,"pizca","pantry")],
 ["Hervé las lentejas 20 minutos, hasta que estén tiernas pero enteras, y colalas bien.", "Rehogá la cebolla y el morrón picados en el aceite 8 minutos; condimentá fuerte con pimentón, comino, ají molido y sal.", "Mezclá con las lentejas y el verdeo picado y dejá enfriar el relleno.", "Rellená las tapas, cerralas con repulgue o tenedor y pintalas con un poco de aceite o agua.", "Horneá a 220 °C unos 15-18 minutos, hasta que doren."],
 "Leé la etiqueta de las tapas: muchas criollas llevan grasa vacuna; las de hojaldre con margarina vegetal suelen ser veganas.")
rec("falafel","Falafel al horno con ensalada y salsa de tahini","plato",45,559,1900,["horno", "sin gluten", "económico", "vegano", "vegetariano", "sin lactosa"],
 [I("garbanzos secos",160,"g","alm"),I("cebolla",0.5,"u","verd"),I("ajo (dientes)",2,"u","verd"),I("perejil (atado)",0.5,"u","verd"),I("harina de garbanzo",2,"cda","alm"),I("aceite",2,"cda","pantry"),I("lechuga",0.5,"u","verd"),I("tomate",2,"u","verd"),I("pepino",0.5,"u","verd"),I("pasta de sésamo (tahini)",2,"cda","alm"),I("limón",0.5,"u","verd"),I("comino, sal, pimienta",1,"pizca","pantry")],
 ["Remojá los garbanzos secos en mucha agua toda la noche (no los cocines) y escurrilos muy bien.", "Procesalos con la cebolla, el ajo, el perejil, comino, sal y pimienta hasta una pasta granulosa; sumá la harina de garbanzo.", "Formá bolitas apenas aplastadas, ponelas en una placa aceitada y pincelalas con aceite.", "Horneá a 200 °C unos 25 minutos, dándolas vuelta a mitad, hasta que estén doradas.", "Salsa: tahini con jugo de limón, sal y agua hasta que quede cremosa. Serví con la ensalada de lechuga, tomate y pepino."],
 "Tienen que ser garbanzos remojados crudos: con los de lata la mezcla queda blanda y se desarma.")

BREAK = ["tostadas","yogur","revueltos","yogur","tostadas","panqueques","revueltos"]
LUNCH = ["pollohorno","merluza","wok","lentejas","milanesas","curry","arrozpollo","pescadohorno","albondigas","tortilla","noquis"]
DINNER = ["sopa","tarta","omelette","atun","zapallitos","garbanzos","wrap","gramajo","hamburguesas"]
SAT = [("empanadas","salmon"),("carbonara","berenjenas"),("empanadas","pescadohorno"),("hamburguesas","salmon"),("carbonara","garbanzos")]
SUN = [("bife","pastel"),("noquis","tarta"),("bife","berenjenas"),("pastel","sopa"),("bife","zapallitos")]
MERIENDA = ["Mate con 2 tostadas y queso untable","Yogur natural o una fruta","Mate con fruta (banana o manzana)","Café con leche y 2 galletas de avena","Mate con 2 tostadas y queso untable","Yogur con avena","Mate con fruta"]
weeks = []
for w in range(5):
    days = []
    for d in range(7):
        date = start + datetime.timedelta(days=w*7+d)
        if d >= 5:
            lunch, dinner = (SAT if d == 5 else SUN)[w]
        else:
            k = w*5 + d
            lunch, dinner = LUNCH[k % len(LUNCH)], DINNER[k % len(DINNER)]
        if date.day == 29:  # ñoquis del 29
            if dinner == "noquis": dinner = "sopa"
            lunch = "noquis"
        days.append({"date":date.isoformat(),"dow":DOW[d],"label":f"{DOW[d]} {date.day} {MESES[date.month-1]}",
                     "desayuno":BREAK[(d+w)%7],"almuerzo":lunch,"merienda":MERIENDA[(d+w)%7],"cena":dinner})
    weeks.append({"n":w+1,"start":days[0]["date"],"end":days[-1]["date"],
                  "label":f"Semana {w+1} · {int(days[0]['date'][8:])} {MESES[int(days[0]['date'][5:7])-1]} → {int(days[-1]['date'][8:])} {MESES[int(days[-1]['date'][5:7])-1]}","days":days})

# ---------- LISTA DE COMPRAS por semana ----------
CATS = {"verd":"Verdulería","carne":"Carnicería y pescadería","lact":"Lácteos y huevos","alm":"Almacén","pan":"Panadería","pantry":"Despensa (revisar que haya)"}
def fmtq(q,u):
    if u in ("g","ml") and q >= 1000: return f"{q/1000:g} {'kg' if u=='g' else 'L'}"
    if u == "u": return f"{q:g} u"
    return f"{q:g} {u}"
shopping = {}
for wk in weeks:
    agg = collections.OrderedDict()
    for day in wk["days"]:
        for meal in ("desayuno","almuerzo","cena"):
            for ing in R[day[meal]]["ing"]:
                if ing["c"] == "pantry": continue
                key = (ing["c"], ing["n"], ing["u"])
                agg[key] = agg.get(key,0) + ing["q"]
    # meriendas (aprox. por semana)
    agg[("lact","yogur natural (pote)","u")] = agg.get(("lact","yogur natural (pote)","u"),0) + 2
    agg[("verd","fruta de estación (manzana, naranja, banana)","u")] = agg.get(("verd","fruta de estación (manzana, naranja, banana)","u"),0) + 4
    agg[("pan","pan integral (rodajas)","u")] = agg.get(("pan","pan integral (rodajas)","u"),0) + 4
    bycat = collections.OrderedDict((c,[]) for c in ["verd","carne","lact","alm","pan"])
    for (c,n,u),q in agg.items():
        q = round(q,1)
        bycat[c].append({"n":n,"q":fmtq(q,u),"raw":q,"u":u})
    for c in bycat: bycat[c].sort(key=lambda x:x["n"])
    shopping[wk["n"]] = [{"cat":CATS[c],"items":items} for c,items in bycat.items() if items]
pantry = ["Aceite de girasol y aceite de oliva","Sal, pimienta, pimentón, comino, orégano, ají molido, laurel, nuez moscada, canela","Salsa de soja, vinagre, miel","Yerba mate, café, té","Caldo de verduras en cubos","Pan rallado, avena","Papel manteca / aluminio"]

# ---------- SUPERMERCADOS ----------
stores = [
 {"id":"carrefour","name":"Carrefour","url":"https://www.carrefour.com.ar/","envio":"Se calcula en el checkout según tu dirección (no está publicado).","minimo":"$ 10.000 según las preguntas frecuentes de la app (dato antiguo, verificar).",
  "gratis":"No publicado.","plazo":"Envío en el día / 24 h en CABA sujeto a disponibilidad; 48 h hábiles según los términos y condiciones.","cobertura":"CABA y GBA. También Retiro / Drive en sucursal y 'Entrega inmediata' (Bringo) en zonas con Carrefour Market.",
  "nota":"En los relevamientos de 2026 aparece como la cadena más barata para una compra mensual completa, y en nuestro changuito también quedó primera.","fuente":"https://www.carrefour.com.ar/como-comprar"},
 {"id":"dia","name":"Día","url":"https://diaonline.supermercadosdia.com.ar/","envio":"Se muestra en el carrito antes de pagar (varía por zona).","minimo":"$ 12.000 de compra mínima para envío a domicilio.",
  "gratis":"No publicado. Retiro gratis en la tienda más cercana.","plazo":"Franjas 9:30–13:30, 13:30–17:30 y 17:30–20:30. Mismo día pidiendo con 5 h de anticipación.","cobertura":"Capital Federal y Gran Buenos Aires (almacén, limpieza, congelados, bebidas).",
  "nota":"Marca propia muy barata (arroz, avena, atún). Los miércoles 10 % de descuento con Mercado Pago, también online.","fuente":"https://diaonline.supermercadosdia.com.ar/preguntas-frecuentes"},
 {"id":"jumbo","name":"Jumbo","url":"https://www.jumbo.com.ar/","envio":"$ 3.999 por envío (sin Jumbo Prime). Pack de 3 envíos: $ 11.997.","minimo":"Sin mínimo publicado.",
  "gratis":"Con Jumbo Prime ($ 5.500/mes): envíos ilimitados gratis en compras de $ 60.000 o más.","plazo":"'Envío en el día' / menos de 24 h, sujeto a disponibilidad.","cobertura":"CABA y GBA. Misma plataforma que Disco y Vea (Cencosud).",
  "nota":"El más completo en surtido y marcas premium; precios algo más altos que el promedio.","fuente":"https://jumboprime.com.ar/"},
 {"id":"disco","name":"Disco","url":"https://www.disco.com.ar/","envio":"$ 3.999 por envío (mismo esquema Cencosud que Jumbo).","minimo":"Sin mínimo publicado.",
  "gratis":"Con Jumbo Prime ($ 5.500/mes) en compras de $ 60.000 o más.","plazo":"Envío en el día / menos de 24 h, sujeto a disponibilidad.","cobertura":"CABA y GBA, muchas sucursales de barrio (Palermo, Belgrano, Caballito…).",
  "nota":"Mismo catálogo que Jumbo con precios casi idénticos; conviene por cercanía de sucursal.","fuente":"https://www.disco.com.ar/eventos/descuentos-jumbo-prime"},
 {"id":"vea","name":"Vea","url":"https://www.vea.com.ar/","envio":"No publicado; misma plataforma Cencosud (verificar en el checkout).","minimo":"Sin mínimo publicado.",
  "gratis":"No publicado.","plazo":"Envío en el día según zona; retiro en sucursal.","cobertura":"Más fuerte en GBA e interior que en CABA.",
  "nota":"Precios parecidos a Jumbo/Disco con menos surtido. En CABA conviene mirar primero Disco.","fuente":"https://www.vea.com.ar/"},
 {"id":"coto","name":"Coto Digital","url":"https://www.cotodigital.com.ar/","envio":"$ 3.990 (almacén y similares) / $ 5.999 productos voluminosos, según la página de ayuda.","minimo":"$ 30.000 de compra mínima para envío a domicilio (calculado sobre precios antes de descuentos).",
  "gratis":"No publicado. Retiro en sucursal sin mínimo y sin costo.","plazo":"Se elige franja horaria al comprar; el costo se muestra antes de confirmar.","cobertura":"CABA, GBA, Rosario, Mar del Plata y otras ciudades.",
  "nota":"Muchas promos bancarias y 2x1 en marca propia. Precios de mostrador parecidos a Carrefour.","fuente":"https://www.coto.com.ar/ayuda?s=1"},
 {"id":"changomas","name":"ChangoMás","url":"https://www.masonline.com.ar/","envio":"Se calcula en el checkout según sucursal y zona (no publicado).","minimo":"No publicado.",
  "gratis":"No publicado. PickUp gratis en sucursal: elegís franja y avisás por WhatsApp al llegar.","plazo":"Según sucursal; retiro en el día.","cobertura":"Hipermercados en GBA (ex Walmart); pocas sucursales en CABA.",
  "nota":"Marca propia 'Check' muy barata (yerba, arroz, avena). Útil si estás cerca de un híper.","fuente":"https://www.masonline.com.ar/metodos-de-entrega"},
]
apps = [{"name":"Rappi","url":"https://www.rappi.com.ar/","desc":"Coto, Carrefour, Jumbo, Día y Disco con entrega en 30–60 min. Tarifa de envío variable + precios algo más altos que en la web del súper. Ideal para compras chicas o urgentes."},
        {"name":"PedidosYa Market","url":"https://www.pedidosya.com.ar/","desc":"Supermercado propio de PedidosYa con entrega rápida. Buen surtido básico y promos con PedidosYa Plus."},
        {"name":"Mercado Libre Supermercado","url":"https://www.mercadolibre.com.ar/supermercado","desc":"Envío gratis superando el mínimo de 'Carrito Supermercado'; conviene para almacén no perecedero (yerba, aceite, arroz, latas)."}]

# ---------- PRODUCTOS DE ESTACIÓN (Argentina, zona central / AMBA) ----------
TEMPORADA = [
 {"m":1,"n":"Enero","f":["durazno","ciruela","damasco","sandía","melón","uva","higo","pera Williams","cereza (últimas)"],"v":["tomate","choclo","zapallito","berenjena","morrón","pepino","chaucha","lechuga","albahaca","zapallo"],"tip":"Pleno verano: tomate y choclo al mejor precio del año. Ensaladas, humita y tartas de zapallito."},
 {"m":2,"n":"Febrero","f":["durazno","ciruela","uva","higo","pera","melón","sandía","manzana nueva"],"v":["tomate","choclo","berenjena","morrón","pepino","zapallito","chaucha","acelga"],"tip":"Mes de las berenjenas y los morrones: escabeches y berenjenas a la parmesana."},
 {"m":3,"n":"Marzo","f":["uva","pera","manzana","higo","membrillo","ciruela (últimas)","banana"],"v":["tomate","berenjena","morrón","zapallo","batata","chaucha","acelga","espinaca (empieza)"],"tip":"Última tanda de tomate barato: salsa casera para congelar. Llega el membrillo."},
 {"m":4,"n":"Abril","f":["manzana","pera","membrillo","uva (últimas)","kiwi (empieza)","mandarina (empieza)","banana"],"v":["zapallo","batata","calabaza","acelga","espinaca","brócoli","coliflor","repollo","puerro"],"tip":"Arrancan las calabazas y los zapallos de guarda: sopas, purés y ñoquis de calabaza."},
 {"m":5,"n":"Mayo","f":["mandarina","naranja","pomelo","kiwi","manzana","pera","palta"],"v":["calabaza","batata","brócoli","coliflor","repollo","espinaca","acelga","hinojo","puerro","remolacha"],"tip":"Cítricos a pleno: naranja y mandarina baratísimas. Guisos de lentejas con calabaza."},
 {"m":6,"n":"Junio","f":["naranja","mandarina","pomelo","limón","kiwi","manzana","palta"],"v":["calabaza","brócoli","coliflor","repollo","espinaca","acelga","hinojo","puerro","zanahoria","papa"],"tip":"Invierno: tartas de acelga, pastel de papa, sopas. La palta argentina (Tucumán) está en su mejor momento."},
 {"m":7,"n":"Julio","f":["naranja","mandarina","pomelo","limón","kiwi","palta"],"v":["brócoli","coliflor","repollo","espinaca","acelga","hinojo","puerro","alcaucil (empieza)","rabanito"],"tip":"Mes del locro y las sopas. Empiezan los alcauciles."},
 {"m":8,"n":"Agosto","f":["naranja","mandarina","pomelo","limón","kiwi","palta","frutilla (empieza, Tucumán)"],"v":["alcaucil","brócoli","coliflor","espinaca","acelga","puerro","rabanito","habas (empiezan)"],"tip":"Alcauciles al mejor precio: hervidos con vinagreta o rellenos."},
 {"m":9,"n":"Septiembre","f":["naranja","frutilla","kiwi (últimos)","limón","palta","pomelo"],"v":["alcaucil","espárrago","habas","arvejas","espinaca","acelga","rabanito","lechuga","remolacha"],"tip":"Primavera: espárragos, habas y arvejas frescas. Ideal para el wok y las tortillas."},
 {"m":10,"n":"Octubre","f":["frutilla","naranja (últimas)","limón","palta","níspero","banana"],"v":["espárrago","alcaucil","arvejas","habas","chaucha (empieza)","lechuga","rúcula","zapallito (empieza)","remolacha","zanahoria"],"tip":"La frutilla está en su mejor precio: para el yogur con avena y los panqueques. Primeros zapallitos."},
 {"m":11,"n":"Noviembre","f":["frutilla","cereza (empieza)","damasco (empieza)","níspero","banana","limón"],"v":["arvejas","chaucha","zapallito","tomate (empieza)","lechuga","rúcula","pepino (empieza)","espárrago (últimos)","choclo (fin de mes)"],"tip":"Zapallitos rellenos y ensaladas: ya hay lechuga y tomate de estación. La cereza llega cara, baja en diciembre."},
 {"m":12,"n":"Diciembre","f":["cereza","damasco","durazno","ciruela","frutilla (últimas)","melón","sandía (empieza)","breva"],"v":["tomate","choclo","zapallito","chaucha","pepino","berenjena (empieza)","morrón","albahaca","lechuga"],"tip":"Fiestas: ensaladas frescas, tomate y choclo baratos, fruta de carozo para el postre."},
]
rates = {"date":"23/10/2026","usd_oficial":1550,"usd_blue":1565,"eur_oficial":1714,"eur_blue":round(1565*1714/1550),"source":"dolarapi.com"}
sources = [
 {"t":"Precios de los supermercados: catálogos online de cada cadena consultados el 24/10/2026 (API pública de búsqueda de cada sitio). Pueden variar por sucursal y por día.","u":None},
 {"t":"Cotizaciones del dólar y el euro: DolarApi (BCRA / mercado informal).","u":"https://dolarapi.com/"},
 {"t":"Jumbo Prime — condiciones de envío","u":"https://jumboprime.com.ar/"},
 {"t":"Día — preguntas frecuentes (envío a domicilio)","u":"https://diaonline.supermercadosdia.com.ar/preguntas-frecuentes"},
 {"t":"Coto Digital — ayuda","u":"https://www.coto.com.ar/ayuda?s=1"},
 {"t":"Carrefour — cómo comprar","u":"https://www.carrefour.com.ar/como-comprar"},
 {"t":"ChangoMás — métodos de entrega","u":"https://www.masonline.com.ar/metodos-de-entrega"},
 {"t":"iProfesional — cuál es el supermercado más barato de Argentina en 2026","u":"https://www.iprofesional.com/actualidad/445916-cual-es-el-supermercado-mas-barato-de-argentina-en-2026"},
 {"t":"Fotos de las recetas: Wikimedia Commons, licencias Creative Commons indicadas en cada receta.","u":"https://commons.wikimedia.org/"},
]
# utensilios de cada receta (tools/utensilios.py: se deducen de los pasos y se corrigen a mano en UT_FIX)
from utensilios import utensilios
for rid, r in R.items():
    r["ut"] = utensilios(rid, r)
# fotos: WebP en dos tamaños si existen (tools/build_webp.py); el JPG queda de respaldo
for r in R.values():
    base = os.path.splitext(os.path.basename(r["img"]))[0]
    if os.path.exists(os.path.join("..", "img", "w", f"{base}-900.webp")):
        r["jpg"] = r["img"]; r["img"] = f"img/w/{base}-900.webp"; r["srcset"] = f"img/w/{base}-480.webp 480w, img/w/{base}-900.webp 900w"
# el plan se genera en el navegador a partir de estas rotaciones (desde `epoch`, un lunes), así no se termina nunca
rot = {"epoch": start.isoformat(), "break": BREAK, "lunch": LUNCH, "dinner": DINNER, "sat": [list(x) for x in SAT], "sun": [list(x) for x in SUN], "merienda": MERIENDA}
data = {"period":{"start":start.isoformat(),"label":"plan continuo · se arma solo cada semana"},
        "rot":rot,"recipes":R,"pantry":pantry,"stores":stores,"apps":apps,"basket":basket,"rates":rates,"sources":sources,
        "temporada":TEMPORADA,"meriendaNut":dict(zip(["kcal","prot","carb","fat","fib","sal"],MERIENDA_NUT)),
        "ingredientes":[{"id":x["id"],"n":x["n"],"cat":x["cat"],"por100":x["por100"],"u":x["u"],"alias":x["alias"],"source":"base"} for x in ING_DB]}
for r in R.values():
    r["kcal"] = int(round(r["nut"]["kcal"]))  # la tarjeta muestra el mismo número que el análisis
for l in NUT_LOG: print("NUT", l)
os.makedirs("site",exist_ok=True)
with open(OUT,"w",encoding="utf-8") as f:
    f.write("window.DATA = ")
    json.dump(data,f,ensure_ascii=False,separators=(",",":"))  # compacto: menos peso
    f.write(";\n")
print("OK", OUT, os.path.getsize(OUT)//1024, "KB; recetas:", len(R))
for wk in weeks:
    print(wk["label"])
    for d in wk["days"]: print("  ",d["label"].ljust(18), d["desayuno"].ljust(11), d["almuerzo"].ljust(11), d["cena"])
