# -*- coding: utf-8 -*-
"""Monta media/intro.mp4 a partir de media/frames/*.png: Ken Burns, fundidos cruzados, música suave y (opcional) voz.
Uso: python tools/video/montar.py [--voz media/voz.m4a] [--musica media/musica.mp3]"""
import os, sys, subprocess, shutil, glob, argparse
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MEDIA = os.path.join(ROOT, "media"); FR = os.path.join(MEDIA, "frames")
ap = argparse.ArgumentParser(); ap.add_argument("--voz"); ap.add_argument("--musica"); ap.add_argument("--out", default=os.path.join(MEDIA, "intro.mp4")); a = ap.parse_args()

def find_ffmpeg():
    c = shutil.which("ffmpeg")
    if c: return c
    for pat in [r"C:\Users\Jaeme\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\**\ffmpeg.exe", r"C:\ffmpeg\bin\ffmpeg.exe", r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"]:
        hits = glob.glob(pat, recursive=True)
        if hits: return hits[0]
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: pass
    sys.exit("No encuentro ffmpeg. Instalalo (winget install Gyan.FFmpeg) o pip install imageio-ffmpeg.")
FF = find_ffmpeg(); print("ffmpeg:", FF)

# (archivo, duración s, movimiento) — total ≈ 38 s, pensado para el guion de docs/video-guion.md
SHOTS = [
 ("00_c_intro", 3.2, "in"), ("01_inicio", 3.0, "out"), ("02_calendario", 3.4, "in"), ("03_receta", 2.8, "out"),
 ("04_recetas", 2.2, "in"), ("05_compras", 3.6, "out"), ("06_super", 3.8, "in"),
 ("00_c_cuenta", 2.2, "in"), ("07_cuenta", 1.6, "out"), ("08_editor", 2.4, "in"), ("09_ingrediente", 2.4, "out"), ("09b_ranking", 2.6, "in"),
 ("10_nutricion", 3.2, "in"), ("11_nutricion_barras", 2.4, "out"), ("12_temporada", 2.4, "in"), ("00_c_cierre", 3.4, "out"),
]
XF = 0.45  # duración del fundido
FPS = 30; W, H = 1920, 1080
shots = [(n, d, m) for n, d, m in SHOTS if os.path.exists(os.path.join(FR, n + ".png"))]
missing = [n for n, _, _ in SHOTS if not os.path.exists(os.path.join(FR, n + ".png"))]
if missing: print("faltan capturas:", missing)
total = sum(d for _, d, _ in shots) - XF * (len(shots) - 1)
print(f"{len(shots)} planos · {total:.1f} s")

inputs, filters = [], []
for i, (n, d, m) in enumerate(shots):
    inputs += ["-loop", "1", "-t", f"{d:.2f}", "-i", os.path.join(FR, n + ".png")]
    frames = int(d * FPS)
    # Ken Burns: zoom lento hacia adentro o hacia afuera, centrado; escala previa grande para evitar vibración
    z = f"min(1+0.0009*on,1.10)" if m == "in" else f"max(1.10-0.0009*on,1.0)"
    filters.append(f"[{i}:v]scale=3840:-2,zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},format=yuv420p,setsar=1[v{i}]")
# cadena de fundidos cruzados
prev = "v0"; off = 0.0
for i in range(1, len(shots)):
    off += shots[i - 1][1] - XF
    out = f"x{i}" if i < len(shots) - 1 else "vout"
    filters.append(f"[{prev}][v{i}]xfade=transition=fade:duration={XF}:offset={off:.2f}[{out}]")
    prev = out
if len(shots) == 1: filters.append("[v0]copy[vout]")

# audio
musica = a.musica or next((os.path.join(MEDIA, f) for f in ("musica.mp3", "musica.m4a", "musica.wav") if os.path.exists(os.path.join(MEDIA, f))), None) or sys.exit("Falta media/musica.*: corré tools/video/musica.py")
ai = len(shots)
inputs += ["-stream_loop", "-1", "-i", musica]
if a.voz:
    inputs += ["-i", a.voz]
    # música -17 dB con ducking cuando habla la voz; voz normalizada
    filters.append(f"[{ai}:a]volume=-15dB,atrim=0:{total:.2f}[m];[{ai+1}:a]loudnorm=I=-16:TP=-1.5:LRA=11,apad[vz];[m][vz]sidechaincompress=threshold=0.03:ratio=6:attack=80:release=600[duck];[duck][vz]amix=inputs=2:duration=first:dropout_transition=2,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")
else:
    filters.append(f"[{ai}:a]volume=-13dB,atrim=0:{total:.2f},afade=t=in:d=1.2,afade=t=out:st={total-2.5:.2f}:d=2.5[aout]")

cmd = [FF, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.2f}",
       "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", a.out]
print("montando…"); r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
if r.returncode != 0: print(r.stderr[-3000:]); sys.exit(1)
# póster (frame del segundo 1) y versión comprimida para la web si pesa mucho
subprocess.run([FF, "-y", "-ss", "1", "-i", a.out, "-frames:v", "1", "-q:v", "3", os.path.join(MEDIA, "intro-poster.jpg")], capture_output=True)
print("OK", a.out, round(os.path.getsize(a.out) / 1e6, 1), "MB")
# versión liviana para la web (720p) y copia 1080p fuera del repo
web = a.out; full = os.path.join(MEDIA, "intro-1080.mp4")
if os.path.getsize(web) > 8e6:
    shutil.move(web, full)
    subprocess.run([FF, "-y", "-i", full, "-vf", "scale=1280:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k", "-movflags", "+faststart", web], capture_output=True)
    print("web 720p:", round(os.path.getsize(web) / 1e6, 1), "MB · 1080p guardado en media/intro-1080.mp4 (fuera del repo)")
