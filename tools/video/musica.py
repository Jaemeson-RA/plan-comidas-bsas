# -*- coding: utf-8 -*-
"""Genera media/musica.wav: loop instrumental alegre y suave (~40 s), sin derechos de terceros.
Progresión I–V–vi–IV en Do mayor, arpegio de 'marimba' + bajo redondo + pulso de shaker. 100 % sintetizado con numpy."""
import numpy as np, wave, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SR = 44100
BPM = 112
beat = 60 / BPM
DUR = 40.0
t_total = int(SR * DUR)
out = np.zeros(t_total)

def note(freq, start, length, kind="marimba", vol=0.3):
    n = int(SR * length); i0 = int(SR * start)
    if i0 >= t_total: return
    n = min(n, t_total - i0)
    t = np.arange(n) / SR
    if kind == "marimba":
        env = np.exp(-t * 6.0) * (1 - np.exp(-t * 400))
        sig = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 18) + 0.15 * np.sin(2 * np.pi * freq * 2.01 * t)
    elif kind == "bass":
        env = np.minimum(1, t * 60) * np.exp(-t * 2.2)
        sig = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t) + 0.1 * np.sign(np.sin(2 * np.pi * freq * t)) * np.exp(-t * 8)
    elif kind == "pad":
        env = np.minimum(1, t * 3) * np.minimum(1, (length - t) * 3)
        sig = (np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 1.5 * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t)) * (1 + 0.02 * np.sin(2 * np.pi * 5 * t))
    else:
        env = np.exp(-t * 40); sig = np.random.randn(n) * 0.6  # shaker
        sig = np.convolve(sig, np.ones(8) / 8, mode="same")
    out[i0:i0 + n] += sig * env * vol

def f(midi): return 440 * 2 ** ((midi - 69) / 12)
# acordes (MIDI): C (60 64 67), G (55 59 62), Am (57 60 64), F (53 57 60)
chords = [(48, [60, 64, 67, 72]), (43, [55, 59, 62, 67]), (45, [57, 60, 64, 69]), (41, [53, 57, 60, 65])]
pattern = [0, 1, 2, 3, 2, 1, 3, 0]  # arpegio por compás (corcheas)
bar = beat * 4
nbars = int(DUR / bar) + 1
melody_seq = [72, 74, 76, 79, 76, 74, 72, 69, 71, 72, 74, 76, 74, 72, 71, 67]
for b in range(nbars):
    root, ch = chords[b % 4]
    start = b * bar
    # bajo: negra en 1 y 3, octava en 2.5
    note(f(root), start, beat * 1.2, "bass", 0.35); note(f(root), start + beat * 2, beat * 1.2, "bass", 0.3); note(f(root + 12), start + beat * 2.5, beat * 0.5, "bass", 0.15)
    # pad suave
    for m in ch[:3]: note(f(m - 12), start, bar, "pad", 0.045)
    # arpegio marimba en corcheas
    for k, idx in enumerate(pattern): note(f(ch[idx]), start + k * beat / 2, beat * 0.9, "marimba", 0.22 if k % 2 == 0 else 0.16)
    # melodía ligera cada dos compases (entra después de la intro)
    if b >= 2:
        for k in range(4):
            m = melody_seq[(b * 4 + k) % len(melody_seq)]
            note(f(m), start + k * beat, beat * 0.95, "marimba", 0.2 if k in (0, 2) else 0.13)
    # shaker en contratiempos + pulso suave en 2 y 4
    for k in range(8): note(0, start + k * beat / 2, 0.08, "shaker", 0.05 if k % 2 else 0.025)
# fade in / out
fade = int(SR * 1.5); out[:fade] *= np.linspace(0, 1, fade); out[-int(SR * 3):] *= np.linspace(1, 0, int(SR * 3))
# limitador suave + normalización a -14 dBFS aprox.
out = np.tanh(out * 1.2)
out = out / (np.max(np.abs(out)) + 1e-9) * 0.5
os.makedirs(os.path.join(os.path.dirname(__file__), "..", "..", "media"), exist_ok=True)
path = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "media", "musica.wav"))
with wave.open(path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    stereo = np.stack([out, np.roll(out, 300)], axis=1)  # leve ensanchamiento
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("OK", path, round(DUR), "s")
