# -*- coding: utf-8 -*-
"""Monta los videos a partir de los cuadros compuestos (media/frames/f_h_*.png y f_v_*.png):
Ken Burns, fundidos cruzados, música suave y, opcionalmente, la voz.
  python tools/video/montar.py                    -> media/intro.mp4 (16:9) y media/intro-vertical.mp4 (9:16)
  python tools/video/montar.py --voz media/voz.m4a  (mezcla la voz con ducking de la música)"""
import os, sys, subprocess, shutil, glob, argparse
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MEDIA = os.path.join(ROOT, "media"); FR = os.path.join(MEDIA, "frames")
ap = argparse.ArgumentParser(); ap.add_argument("--voz", help="un solo audio con toda la voz"); ap.add_argument("--voces", help="carpeta con voz_01..voz_13 (un archivo por escena)"); ap.add_argument("--musica"); ap.add_argument("--solo", choices=["h", "v"]); a = ap.parse_args()

def find_ffmpeg():
    c = shutil.which("ffmpeg")
    if c: return c
    for pat in [r"C:\Users\Jaeme\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\**\ffmpeg.exe", r"C:\ffmpeg\bin\ffmpeg.exe"]:
        hits = glob.glob(pat, recursive=True)
        if hits: return hits[0]
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: pass
    sys.exit("No encuentro ffmpeg: pip install imageio-ffmpeg")
FF = find_ffmpeg(); print("ffmpeg:", FF)
musica = a.musica or next((os.path.join(MEDIA, f) for f in ("musica.mp3", "musica.m4a", "musica.wav") if os.path.exists(os.path.join(MEDIA, f))), None) or sys.exit("Falta media/musica.*: corré tools/video/musica.py")

import re
def audio_len(path):
    r = subprocess.run([FF, "-i", path], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
VOICES = []  # [(ruta, duración)] por escena, o None
if a.voces:
    for i in range(1, 14):
        hits = glob.glob(os.path.join(a.voces, f"voz_{i:02d}.*"))
        VOICES.append((hits[0], audio_len(hits[0])) if hits else None)
    print("voces:", sum(1 for v in VOICES if v), "de 13", [f"{v[1]:.1f}s" if v else "-" for v in VOICES])
# (cuadro, duración s, movimiento) — sigue el guion de docs/video-guion.md (≈ 39 s)
SHOTS = [
 ("00_intro", 3.4, "in"), ("01_inicio", 2.8, "out"), ("02_calendario", 3.2, "in"), ("03_receta", 2.8, "out"),
 ("04_compras", 3.4, "in"), ("05_super", 3.6, "out"),
 ("06_cuenta", 2.4, "in"), ("06_editor", 2.6, "out"), ("07_ingrediente", 2.6, "in"), ("08_ranking", 2.8, "out"),
 ("09_nutricion", 3.6, "in"), ("10_temporada", 2.6, "out"), ("99_cierre", 3.6, "in"),
]
XF = 0.5; FPS = 30

def build(o):
    W, H = (1920, 1080) if o == "h" else (1080, 1920)
    out = os.path.join(MEDIA, "intro.mp4" if o == "h" else "intro-vertical.mp4")
    shots = []
    for i, (n, d, m) in enumerate(SHOTS):
        if not os.path.exists(os.path.join(FR, f"f_{o}_{n}.png")): continue
        v = VOICES[i] if i < len(VOICES) else None
        if v: d = max(d, v[1] + 0.9)   # la escena dura al menos lo que dura la frase
        shots.append((n, d, m, v))
    missing = [n for n, _, _ in SHOTS if not os.path.exists(os.path.join(FR, f"f_{o}_{n}.png"))]
    if missing: print("faltan cuadros", o, missing)
    total = sum(x[1] for x in shots) - XF * (len(shots) - 1)
    print(f"[{o}] {len(shots)} planos · {total:.1f} s")
    inputs, filters = [], []
    for i, (n, d, m, v) in enumerate(shots):
        inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", os.path.join(FR, f"f_{o}_{n}.png")]
        frames = int(d * FPS)
        z = "min(1+0.0008*on,1.08)" if m == "in" else "max(1.08-0.0008*on,1.0)"
        big = "3840:-2" if o == "h" else "-2:3840"
        filters.append(f"[{i}:v]scale={big},zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},format=yuv420p,setsar=1[v{i}]")
    prev = "v0"; off = 0.0
    for i in range(1, len(shots)):
        off += shots[i - 1][1] - XF
        outl = f"x{i}" if i < len(shots) - 1 else "vout"
        filters.append(f"[{prev}][v{i}]xfade=transition=fade:duration={XF}:offset={off:.2f}[{outl}]"); prev = outl
    if len(shots) == 1: filters.append("[v0]copy[vout]")
    ai = len(shots); inputs += ["-stream_loop", "-1", "-i", musica]
    if a.voces and any(x[3] for x in shots):
        # una pista por escena, cada una retrasada al inicio de su escena
        vz = []; off = 0.0; k = ai + 1
        for i, (n, d, m, v) in enumerate(shots):
            if v:
                inputs += ["-i", v[0]]; ms = int((off + 0.25) * 1000)
                filters.append(f"[{k}:a]loudnorm=I=-16:TP=-1.5:LRA=11,adelay={ms}|{ms}[vz{i}]"); vz.append(f"[vz{i}]"); k += 1
            off += d - XF
        filters.append("".join(vz) + f"amix=inputs={len(vz)}:normalize=0,apad,asplit=2[vm1][vm2]")
        filters.append(f"[{ai}:a]volume=-15dB,atrim=0:{total:.2f}[m];[m][vm1]sidechaincompress=threshold=0.03:ratio=6:attack=80:release=600[duck];[duck][vm2]amix=inputs=2:duration=first:normalize=0,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")
    elif a.voz:
        inputs += ["-i", a.voz]
        filters.append(f"[{ai}:a]volume=-15dB,atrim=0:{total:.2f}[m];[{ai+1}:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad[vz];[m][vz]sidechaincompress=threshold=0.03:ratio=6:attack=80:release=600[duck];[duck][vz]amix=inputs=2:duration=first:dropout_transition=2,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")
    else:
        filters.append(f"[{ai}:a]volume=-13dB,atrim=0:{total:.2f},afade=t=in:d=1.2,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")
    tmp = out + ".full.mp4"
    cmd = [FF, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.2f}",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", tmp]
    print(f"[{o}] montando…"); r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0: print(r.stderr[-3000:]); sys.exit(1)
    full = os.path.join(MEDIA, ("intro-1080.mp4" if o == "h" else "intro-vertical-full.mp4")); shutil.move(tmp, full)
    scale = "scale=1280:-2" if o == "h" else "scale=-2:1280"
    subprocess.run([FF, "-y", "-i", full, "-vf", scale, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k", "-movflags", "+faststart", out], capture_output=True)
    subprocess.run([FF, "-y", "-ss", "1", "-i", out, "-frames:v", "1", "-q:v", "3", os.path.join(MEDIA, "intro-poster.jpg" if o == "h" else "intro-vertical-poster.jpg")], capture_output=True)
    print(f"[{o}] OK {os.path.basename(out)} {os.path.getsize(out)/1e6:.1f} MB (completo: {os.path.basename(full)}, fuera del repo)")

for o in (["h", "v"] if not a.solo else [a.solo]): build(o)
