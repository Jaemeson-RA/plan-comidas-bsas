# -*- coding: utf-8 -*-
"""Muestra el detalle de media/qa/_report.json. Uso: python tools/qa_report.py clave1 clave2 …  (o «resumen»)"""
import json, os, sys, collections
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
r = json.load(open(os.path.join(ROOT, "media", "qa", "_report.json"), encoding="utf-8"))
args = sys.argv[1:] or ["resumen"]
if args == ["resumen"]:
    for kind in ("off", "overlap", "small", "tiny", "img", "errors"):
        c = collections.Counter()
        for k, v in r.items():
            for x in v.get(kind, []): c[x.split(" [")[0].split("  ×  ")[0][:70] if kind != "overlap" else x[:120]] += 1
        print(f"\n## {kind}: {sum(c.values())} ({len(c)} distintos)")
        for x, n in c.most_common(14): print(f"  {n:3d}  {x}")
else:
    for k in args:
        v = r.get(k); print(f"\n===== {k}  overflow={v and v['overflow']}")
        if not v: continue
        for kind in ("off", "overlap", "small", "tiny", "img", "errors"):
            if v.get(kind): print(f"  {kind}:"); [print("     -", x) for x in v[kind][:12]]
