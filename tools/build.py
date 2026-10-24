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
 "pastel":"2dK_dtOMbyg","empanadas":"T8NWbcdnbQ4"}

# ingredientes: (nombre, cantidad, unidad, categoría) — para 2 porciones. cat: verd, carne, lact, alm, pan, pantry
def I(n,q,u,c): return {"n":n,"q":q,"u":u,"c":c}
R = {}
def rec(id, name, tipo, tiempo, kcal, cost, tags, ing, pasos, tip):
    R[id] = {"id":id,"name":name,"tipo":tipo,"tiempo":tiempo,"kcal":kcal,"cost":cost,"tags":tags,"porciones":2,
             "ing":ing,"pasos":pasos,"tip":tip,"yt":YT[id],
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
 ["Lavar la acelga, hervirla 3 min, escurrir y exprimir bien. Picar.","Rehogar la cebolla. Mezclar con la acelga, 3 huevos, el queso en cubos, el untable, la avena y los condimentos.","Volcar en una tartera aceitada (sin masa) o sobre una masa integral.","Hornear a 180 °C unos 30 min hasta que dore."],
 "Fría también es riquísima: la porción que sobra es el almuerzo del día siguiente.")
rec("wok","Wok de pollo y verduras con arroz","plato",25,480,3100,["rápido","una sartén"],
 [I("suprema de pollo",400,"g","carne"),I("zanahoria",1,"u","verd"),I("morrón rojo",1,"u","verd"),I("cebolla",1,"u","verd"),I("brócoli o zapallito",1,"u","verd"),
  I("arroz",120,"g","alm"),I("salsa de soja",3,"cda","pantry"),I("ajo (dientes)",2,"u","verd"),I("jengibre (opcional)",1,"pizca","pantry"),I("aceite",1,"cda","pantry")],
 ["Cocinar el arroz. Cortar el pollo en tiras y las verduras en bastones finos.","Wok o sartén grande muy caliente: dorar el pollo 4 min, retirar.","Saltear las verduras 4 min (tienen que quedar crocantes).","Volver el pollo, agregar soja, ajo y jengibre, 1 min más. Servir sobre el arroz."],
 "Las verduras que sobraron del pollo al horno van directo al wok.")
rec("omelette","Omelette de champiñones y queso light","plato",15,400,2200,["rápido","vegetariano","proteico"],
 [I("huevos",4,"u","lact"),I("champiñones",200,"g","verd"),I("queso port salut light",60,"g","lact"),I("cebolla de verdeo",1,"u","verd"),
  I("aceite o manteca",1,"cdita","pantry"),I("sal y pimienta",1,"pizca","pantry"),I("pan integral (rodajas)",2,"u","pan")],
 ["Saltear los champiñones en láminas a fuego fuerte hasta que doren. Reservar.","Batir los huevos con sal y pimienta.","Volcar en sartén antiadherente a fuego medio; cuando cuaje el borde, poner champiñones, queso y verdeo en una mitad.","Doblar, 1 min más y servir con la tostada."],
 "Bandeja de champiñones en oferta = cena lista en 15 minutos.")
rec("milanesas","Milanesas de pollo al horno con ensalada","plato",35,520,3000,["horno","clásico argentino"],
 [I("suprema de pollo",400,"g","carne"),I("huevos",1,"u","lact"),I("pan rallado",120,"g","alm"),I("ajo (dientes)",1,"u","verd"),I("perejil",1,"pizca","pantry"),
  I("lechuga",1,"u","verd"),I("tomate",2,"u","verd"),I("aceite",1,"cda","pantry"),I("limón",1,"u","verd"),I("sal y pimienta",1,"pizca","pantry")],
 ["Abrir las supremas en filetes finos y aplastarlas un poco.","Batir el huevo con ajo, perejil, sal y pimienta. Pasar las milanesas por huevo y después por pan rallado, apretando.","Placa aceitada, horno a 220 °C: 12 min, dar vuelta, 10 min más hasta dorar.","Ensalada de lechuga y tomate con limón y oliva."],
 "Empaná el doble y congelá crudas separadas con papel: van del freezer al horno.")
rec("lentejas","Guiso de lentejas light","plato",50,480,2300,["económico","batch","rinde"],
 [I("lentejas secas",250,"g","alm"),I("carne picada magra",150,"g","carne"),I("cebolla",1,"u","verd"),I("zanahoria",2,"u","verd"),I("morrón rojo",1,"u","verd"),
  I("zapallo anco / calabaza",300,"g","verd"),I("tomate triturado (lata)",1,"u","alm"),I("ajo (dientes)",2,"u","verd"),I("pimentón, comino, laurel, sal",1,"pizca","pantry"),I("aceite de oliva",1,"cda","pantry")],
 ["Remojar las lentejas 1 hora (o usar las que no necesitan remojo).","Rehogar cebolla, ajo, morrón y zanahoria. Sumar la carne picada y dorar.","Agregar las lentejas, el zapallo en cubos, el tomate y agua hasta cubrir. Pimentón, comino, laurel.","Cocinar a fuego bajo 35-40 min, revolviendo. Ajustar sal al final."],
 "Rinde 4 porciones: congelá la mitad. Sin chorizo ni panceta es igual de sabroso y mucho más liviano.")
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
 [I("tapas para empanadas (docena)",1,"u","alm"),I("carne picada magra",400,"g","carne"),I("cebolla",2,"u","verd"),I("cebolla de verdeo",2,"u","verd"),I("huevos",2,"u","lact"),
  I("aceitunas verdes",12,"u","alm"),I("pimentón, comino, ají molido, sal",1,"pizca","pantry"),I("aceite",2,"cda","pantry")],
 ["Rehogar la cebolla en abundante aceite hasta transparentar. Sumar la carne y cocinar 5 min; condimentar fuerte con pimentón, comino y ají molido.","Fuera del fuego: verdeo picado. Enfriar en la heladera (ideal, 1 hora).","Rellenar las tapas con huevo duro picado y una aceituna; cerrar con repulgue o con tenedor.","Pintar con huevo. Horno a 220 °C 15-18 min."],
 "Salen 12: 3 por persona para el almuerzo del sábado y quedan 6 para la vianda del lunes.")

# ---------- PLAN ----------
start = datetime.date(2026,10,27)
DOW = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
BREAK = ["tostadas","yogur","revueltos","yogur","tostadas","panqueques","revueltos"]
PAIRS = [("pollohorno","sopa"),("merluza","tarta"),("wok","omelette"),("lentejas","atun"),("milanesas","zapallitos")]
WEEKEND = {5:("empanadas","salmon"), 6:("bife","pastel")}
OFFS = [0,2,4,1,3]
MERIENDA = ["Mate con 2 tostadas y queso untable","Yogur natural o una fruta","Mate con fruta (banana o manzana)","Café con leche y 2 galletas de avena","Mate con 2 tostadas y queso untable","Yogur con avena","Mate con fruta"]
weeks = []
for w in range(5):
    days = []
    for d in range(7):
        date = start + datetime.timedelta(days=w*7+d)
        if d >= 5:
            lunch, dinner = WEEKEND[d]
        else:
            lunch, dinner = PAIRS[(d+OFFS[w])%5]
            if w % 2 == 1: lunch, dinner = dinner, lunch
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
    agg[("lact","yogur natural (pote)","u")] = agg.get(("lact","yogur natural (pote)","u"),0) + 3
    agg[("verd","fruta de estación (manzana, naranja, banana)","u")] = agg.get(("verd","fruta de estación (manzana, naranja, banana)","u"),0) + 8
    agg[("pan","pan integral (rodajas)","u")] = agg.get(("pan","pan integral (rodajas)","u"),0) + 8
    bycat = collections.OrderedDict((c,[]) for c in ["verd","carne","lact","alm","pan"])
    for (c,n,u),q in agg.items():
        q = round(q,1)
        bycat[c].append({"n":n,"q":fmtq(q,u),"raw":q,"u":u})
    for c in bycat: bycat[c].sort(key=lambda x:x["n"])
    shopping[wk["n"]] = [{"cat":CATS[c],"items":items} for c,items in bycat.items() if items]
pantry = ["Aceite de girasol y aceite de oliva","Sal, pimienta, pimentón, comino, orégano, ají molido, laurel, nuez moscada, canela","Salsa de soja, vinagre, miel","Yerba mate, café, té","Caldo de verduras en cubos","Pan rallado, avena","Papel manteca / aluminio"]

# ---------- SUPERMERCADOS ----------
stores = [
 {"id":"carrefour","name":"Carrefour","url":"https://www.carrefour.com.ar/","envio":"Se calcula en el checkout según tu dirección (no está publicado).","minimo":"$ 10.000 según las preguntas frecuentes de la app (dato antiguo, verificar).",
  "gratis":"No publicado.","plazo":"Envío en el día / 24 h en CABA sujeto a disponibilidad; 48 h hábiles según los términos y condiciones.","cobertura":"CABA y GBA. También Retiro / Drive en sucursal y 'Entrega inmediata' (Bringo) en zonas con Carrefour Market.",
  "nota":"En los relevamientos de 2026 aparece como la cadena más barata para una compra mensual completa, y en nuestro changuito también quedó primera.","fuente":"https://www.carrefour.com.ar/como-comprar"},
 {"id":"dia","name":"Día","url":"https://diaonline.supermercadosdia.com.ar/","envio":"Se muestra en el carrito antes de pagar (varía por zona).","minimo":"$ 12.000 de compra mínima para envío a domicilio.",
  "gratis":"No publicado. Retiro gratis en la tienda más cercana.","plazo":"Franjas 9:30–13:30, 13:30–17:30 y 17:30–20:30. Mismo día pidiendo con 5 h de anticipación.","cobertura":"Capital Federal y Gran Buenos Aires (almacén, limpieza, congelados, bebidas).",
  "nota":"Marca propia muy barata (arroz, avena, atún). Los miércoles 10 % de descuento con Mercado Pago, también online.","fuente":"https://diaonline.supermercadosdia.com.ar/preguntas-frecuentes"},
 {"id":"jumbo","name":"Jumbo","url":"https://www.jumbo.com.ar/","envio":"$ 3.999 por envío (sin Jumbo Prime). Pack de 3 envíos: $ 11.997.","minimo":"Sin mínimo publicado.",
  "gratis":"Con Jumbo Prime ($ 5.500/mes): envíos ilimitados gratis en compras de $ 60.000 o más.","plazo":"'Envío en el día' / menos de 24 h, sujeto a disponibilidad.","cobertura":"CABA y GBA. Misma plataforma que Disco y Vea (Cencosud).",
  "nota":"El más completo en surtido y marcas premium; precios algo más altos que el promedio.","fuente":"https://jumboprime.com.ar/"},
 {"id":"disco","name":"Disco","url":"https://www.disco.com.ar/","envio":"$ 3.999 por envío (mismo esquema Cencosud que Jumbo).","minimo":"Sin mínimo publicado.",
  "gratis":"Con Jumbo Prime ($ 5.500/mes) en compras de $ 60.000 o más.","plazo":"Envío en el día / menos de 24 h, sujeto a disponibilidad.","cobertura":"CABA y GBA, muchas sucursales de barrio (Palermo, Belgrano, Caballito…).",
  "nota":"Mismo catálogo que Jumbo con precios casi idénticos; conviene por cercanía de sucursal.","fuente":"https://www.disco.com.ar/eventos/descuentos-jumbo-prime"},
 {"id":"vea","name":"Vea","url":"https://www.vea.com.ar/","envio":"No publicado; misma plataforma Cencosud (verificar en el checkout).","minimo":"Sin mínimo publicado.",
  "gratis":"No publicado.","plazo":"Envío en el día según zona; retiro en sucursal.","cobertura":"Más fuerte en GBA e interior que en CABA.",
  "nota":"Precios parecidos a Jumbo/Disco con menos surtido. En CABA conviene mirar primero Disco.","fuente":"https://www.vea.com.ar/"},
 {"id":"coto","name":"Coto Digital","url":"https://www.cotodigital.com.ar/","envio":"$ 3.990 (almacén y similares) / $ 5.999 productos voluminosos, según la página de ayuda.","minimo":"$ 30.000 de compra mínima para envío a domicilio (calculado sobre precios antes de descuentos).",
  "gratis":"No publicado. Retiro en sucursal sin mínimo y sin costo.","plazo":"Se elige franja horaria al comprar; el costo se muestra antes de confirmar.","cobertura":"CABA, GBA, Rosario, Mar del Plata y otras ciudades.",
  "nota":"Muchas promos bancarias y 2x1 en marca propia. Precios de mostrador parecidos a Carrefour.","fuente":"https://www.coto.com.ar/ayuda?s=1"},
 {"id":"changomas","name":"ChangoMás","url":"https://www.masonline.com.ar/","envio":"Se calcula en el checkout según sucursal y zona (no publicado).","minimo":"No publicado.",
  "gratis":"No publicado. PickUp gratis en sucursal: elegís franja y avisás por WhatsApp al llegar.","plazo":"Según sucursal; retiro en el día.","cobertura":"Hipermercados en GBA (ex Walmart); pocas sucursales en CABA.",
  "nota":"Marca propia 'Check' muy barata (yerba, arroz, avena). Útil si estás cerca de un híper.","fuente":"https://www.masonline.com.ar/metodos-de-entrega"},
]
apps = [{"name":"Rappi","url":"https://www.rappi.com.ar/","desc":"Coto, Carrefour, Jumbo, Día y Disco con entrega en 30–60 min. Tarifa de envío variable + precios algo más altos que en la web del súper. Ideal para compras chicas o urgentes."},
        {"name":"PedidosYa Market","url":"https://www.pedidosya.com.ar/","desc":"Supermercado propio de PedidosYa con entrega rápida. Buen surtido básico y promos con PedidosYa Plus."},
        {"name":"Mercado Libre Supermercado","url":"https://www.mercadolibre.com.ar/supermercado","desc":"Envío gratis superando el mínimo de 'Carrito Supermercado'; conviene para almacén no perecedero (yerba, aceite, arroz, latas)."}]

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
data = {"period":{"start":start.isoformat(),"end":(start+datetime.timedelta(days=34)).isoformat(),"label":"27 de octubre → 30 de noviembre de 2026"},
        "weeks":weeks,"recipes":R,"shopping":shopping,"pantry":pantry,"stores":stores,"apps":apps,"basket":basket,"rates":rates,"sources":sources}
os.makedirs("site",exist_ok=True)
with open(OUT,"w",encoding="utf-8") as f:
    f.write("window.DATA = ")
    json.dump(data,f,ensure_ascii=False)
    f.write(";\n")
print("OK", OUT, os.path.getsize(OUT)//1024, "KB; recetas:", len(R))
for wk in weeks:
    print(wk["label"])
    for d in wk["days"]: print("  ",d["label"].ljust(18), d["desayuno"].ljust(11), d["almuerzo"].ljust(11), d["cena"])
