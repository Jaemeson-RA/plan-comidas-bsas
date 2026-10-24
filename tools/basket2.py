import json, re, sys, time, urllib.request, urllib.parse, statistics
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
VTEX={"Jumbo":"www.jumbo.com.ar","Disco":"www.disco.com.ar","Vea":"www.vea.com.ar","Carrefour":"www.carrefour.com.ar","Día":"diaonline.supermercadosdia.com.ar","ChangoMás":"www.masonline.com.ar"}
FRESH=r"\bkg\b|x kg|por kg|\bun\b|unidad|por u\b|x u\b|atado|paquete|\bpaq\b|pieza|\bu\.|x unidad|\bkgs?\b|\buni\b"
# id,label,term,musts,excl,qty,qtylabel,mode,ref
P=[
 ("leche","Leche entera 1 L","leche entera 1 l",[r"leche",r"entera",r"\b1\s?(l|lt|lts|litro)\b|\b1000"],r"polvo|chocol|descrem|deslact|parcial|bebida",4,"4 × 1 L","pack",None),
 ("huevos","Huevos x 12","huevos",[r"huevo",r"\b12\b|docena|\bdoc\b"],r"codorniz|kinder|chocolate|pascua|color|revuelto",2,"2 docenas","pack",None),
 ("pollo","Pechuga / suprema de pollo","pollo",[r"pechuga|suprema"],r"milanesa|rebozad|empanad|nugget|fiambre|jamon|jamón|arrollado|pate|paté|salchicha|mortadela|apanad|pavo|cerdo|merluza|pescado|hamburg|medall|salsa|caldo|sopa|empanada|crocante|finitas|formita|rellen|congelad",1.5,"1,5 kg","kg",None),
 ("picada","Carne picada especial","carne picada especial",[r"picada"],r"pollo|cerdo|soja|hamburgues|congelad|salsa",1,"1 kg","kg",None),
 ("nalga","Nalga / tapa de nalga","nalga",[r"nalga"],r"cerdo|pollo|milanesa|congelad",1,"1 kg","kg",None),
 ("merluza","Filet de merluza","filet de merluza",[r"merluza"],r"rebozad|empanad|medallon|medallón|bastones|pate|paté|apanad|milanesa|romana|crocante|formita",1,"1 kg","kg",None),
 ("arroz","Arroz largo fino 1 kg","arroz largo fino 1 kg",[r"arroz",r"\b1\s?kg|1000"],r"integral|yamani|yamaní|parboil|preparado|risotto",1,"1 kg","pack",None),
 ("lentejas","Lentejas 400 g","lentejas 400",[r"lenteja",r"400"],r"sopa|guiso|lata|conserva|hamburg|medall",2,"2 × 400 g","pack",None),
 ("avena","Avena (400 g)","avena",[r"avena",r"400|500"],r"galletit|barra|bebida|leche|cookies|granola|alfajor|yogur|harina",1,"400 g","g",400),
 ("pan","Pan lactal integral","pan lactal integral",[r"pan",r"integral"],r"rallado|hamburgues|pancho|tostada|galleta",2,"2 paquetes","pack",None),
 ("yogur","Yogur natural (pote)","yogur natural",[r"yog",r"natural"],r"bebible|griego|frutilla|vainilla|cereal|coco|helado|\b1 kg|900|800",7,"7 potes","pack",None),
 ("untable","Queso untable light (200 g)","queso untable light",[r"untable|crema",r"light|descremado"],r"dulce|cheddar|roquefort|mayonesa",1,"200 g","g",200),
 ("girasol","Aceite de girasol 1,5 L","aceite girasol",[r"aceite",r"girasol",r"1[,.]5"],r"spray|oliva|mezcla|mayonesa",1,"1,5 L","pack",None),
 ("oliva","Aceite de oliva 500 ml","aceite de oliva 500",[r"aceite de oliva|oliva (extra|virgen)",r"500"],r"spray|saborizado|ajo|trufa|mayonesa|mezcla|girasol",1,"500 ml","pack",None),
 ("calabaza","Zapallo / calabaza","zapallo",[r"zapallo|calabaza|anco",FRESH],r"semilla|sopa|pure|puré|congelad|ñoqui|noqui|ravioles|tarta|ensalada|medall|risotto|mila|halloween|vincha|disfraz|decor|cubeteado|relleno|zapallito",2,"2 kg","kg",None),
 ("tomate","Tomate redondo","tomate redondo",[r"tomate",FRESH+r"|500"],r"lata|pure|puré|salsa|triturado|perita|seco|deshidrat|cherry|jugo|ketchup|sopa|conserva",2,"2 kg","kg",None),
 ("banana","Banana","banana",[r"banana",FRESH+r"|ecuador|bolivia|cavendish"],r"yogur|leche|licuado|chips|helado|galletit|postre|deshidrat|alfajor|bebida|cereal|barra|jugo|polvo|tang|pure|puré|split",2,"2 kg","kg",None),
 ("acelga","Acelga (atado)","acelga",[r"acelga",FRESH],r"tarta|tortilla|bud[ií]n|congelad|ravioles|empanad|ñoqui|noqui|canelon|sopa|semilla|pascualina",2,"2 atados","pack",None),
 ("atun","Atún al natural (170 g)","atun al natural 170",[r"at[uú]n",r"natural|agua"],r"aceite|pate|paté|ensalada",4,"4 latas","g",170),
 ("yerba","Yerba mate 1 kg","yerba mate 1 kg",[r"yerba",r"\b1\s?kg|1000"],r"saborizad|mate cocido|saquito|organica|orgánica|compuesta|hierbas",1,"1 kg","pack",None),
]
UNITW={'banana':0.17,'acelga':0.5,'calabaza':1.5,'tomate':0.15}
def grams(name):
    m=re.search(r'(\d+(?:[.,]\d+)?)\s?(kg|kgs|g|gr|grs|grm|cc|ml|lt|l)\b',name.lower())
    if not m: return None
    v=float(m.group(1).replace(',','.')); u=m.group(2)
    return v*1000 if u in('kg','kgs','lt','l') else v
def normalize(pid,mode,ref,price,unit,name):
    g=grams(name)
    if mode=='kg':
        if unit=='kg': per=price
        elif g: per=price/(g/1000)
        elif pid in UNITW: per=price/UNITW[pid]
        else: per=price
        return per,'por kg'
    if mode=='g':
        if unit=='kg': per=price/1000*ref
        elif g: per=price/g*ref
        else: per=price
        return per,f'por {ref} g'
    if unit=='kg' and pid=='acelga': return price*UNITW['acelga'],'por atado (≈500 g)'
    return price,'por unidad'
def get(url,tries=3):
    last=None
    for i in range(tries):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json"})
            with urllib.request.urlopen(req,timeout=50) as r: return json.loads(r.read().decode("utf-8"))
        except Exception as e: last=e; time.sleep(2)
    raise last
def match(name,musts,excl):
    n=name.lower()
    return all(re.search(m,n) for m in musts) and not (excl and re.search(excl,n))
out={}
COTO_ONLY="--coto-only" in sys.argv
if COTO_ONLY:
    prev=json.load(open("basket_final.json",encoding="utf-8"))["sites"]
    out={s:{pid:(None if v.get("estimated") else v) for pid,v in prev[s].items()} for s in VTEX}
for site,host in ([] if COTO_ONLY else VTEX.items()):
    out[site]={}
    for pid,label,term,musts,excl,qty,ql,mode,ref in P:
        url=f"https://{host}/api/catalog_system/pub/products/search/?ft={urllib.parse.quote(term)}&_from=0&_to=29"
        best=None
        try: data=get(url)
        except Exception as e: print(site,pid,"ERR",str(e)[:60]); out[site][pid]=None; continue
        for p in data:
            name=p.get("productName","")
            if not match(name,musts,excl): continue
            for it in p.get("items",[]):
                for s in it.get("sellers",[]):
                    co=s.get("commertialOffer",{}); pr=co.get("Price") or 0
                    if pr<=0 or not co.get("IsAvailable",True): continue
                    unit=it.get("measurementUnit",""); per,ul=normalize(pid,mode,ref,pr,unit,name)
                    if best is None or per<best["unitprice"]:
                        best={"name":name,"raw":pr,"rawunit":unit,"unitprice":round(per),"ulab":ul,"cost":round(per*qty),"link":f"https://{host}/{p.get('linkText')}/p"}
        out[site][pid]=best
        print(site,"|",label,"|",(best or {}).get("name","-")[:50],"|",(best or {}).get("unitprice"),(best or {}).get("ulab"))
        time.sleep(0.25)
# ---- Coto
site="Coto"; out[site]={}
def walk(o,recs):
    if isinstance(o,dict):
        if 'records' in o and isinstance(o['records'],list): recs.extend(o['records'])
        for v in o.values(): walk(v,recs)
    elif isinstance(o,list):
        for v in o: walk(v,recs)
for pid,label,term,musts,excl,qty,ql,mode,ref in P:
    cterm={"pollo":"suprema de pollo","acelga":"acelga fresca","zapallo":"zapallo anco"}.get(pid,term)
    url="https://www.cotodigital.com.ar/sitios/cdigi/browse/_/N-0?Ntt="+urllib.parse.quote(cterm)+"&format=json"
    best=None
    try: d=get(url)
    except Exception as e: print(site,pid,"ERR",str(e)[:60]); out[site][pid]=None; continue
    recs=[]; walk(d,recs)
    for r in recs:
        a=dict(r.get('attributes',{}))
        for sub in r.get('records',[]) or []: a.update(sub.get('attributes',{}))
        name=(a.get('product.displayName') or [''])[0]
        if not name or not match(name,musts,excl): continue
        try: pr=float((a.get('sku.activePrice') or ['0'])[0])
        except Exception: pr=0
        try:
            dd=json.loads((a.get('product.dtoDescuentos') or ['[]'])[0])
            for x in dd:
                pdsc=float(x.get('precioDesc') or 0)
                if pdsc>0 and not x.get('textoLlevando'): pr=min(pr,pdsc)
        except Exception: pass
        if pr<=0: continue
        du=(a.get('product.unidades.descUnidad') or [''])[0].upper()
        unit='kg' if du.startswith('KG') or re.search(r'x kg|por kg',name.lower()) else 'un'
        per,ul=normalize(pid,mode,ref,pr,unit,name)
        if best is None or per<best["unitprice"]:
            rs=r.get('detailsAction',{}).get('recordState','').split('?')[0]
            best={"name":name,"raw":pr,"rawunit":unit,"unitprice":round(per),"ulab":ul,"cost":round(per*qty),"link":"https://www.cotodigital.com.ar/sitios/cdigi"+rs}
    out[site][pid]=best
    print(site,"|",label,"|",(best or {}).get("name","-")[:50],"|",(best or {}).get("unitprice"),(best or {}).get("ulab"))
    time.sleep(0.5)
# fill missing
for pid,label,term,musts,excl,qty,ql,mode,ref in P:
    ups=[out[s][pid]['unitprice'] for s in out if out[s][pid]]
    for s in out:
        if not out[s][pid]:
            m=round(statistics.mean(ups)); out[s][pid]={"name":"Sin resultado en la búsqueda: se usa el promedio de las otras cadenas","unitprice":m,"ulab":"estimado","cost":round(m*qty),"link":None,"estimated":True}
tot={s:sum(v['cost'] for v in out[s].values()) for s in out}
for s,t in sorted(tot.items(),key=lambda x:x[1]): print(f'{s:10s} {t:>10,.0f} ARS')
json.dump({"date":"2026-10-24","products":[{"id":p[0],"label":p[1],"qty":p[5],"qtylabel":p[6]} for p in P],"sites":out,"totals":tot},open("basket_final.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print("DONE")
