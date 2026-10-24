# -*- coding: utf-8 -*-
"""App de Android (Trusted Web Activity con Bubblewrap): compila el APK firmado y el AAB para Google Play.

    python build_android.py                       # compila con el nombre actual
    python build_android.py "Nombre" "Corto"      # cambia el nombre de la app y del ícono, y compila
    python build_android.py --version             # sube el número de versión (necesario para cada envío a Play)

El proyecto de Android y la clave de firma viven FUERA del repositorio público, en
../../plan-comidas-android (android.keystore + keystore.env con las contraseñas).
Sin esa clave no se puede actualizar la app: hacer copia de esa carpeta.

Requisitos (una sola vez): JDK 17 y SDK de Android en ~/.bubblewrap, licencias del SDK aceptadas
(sdkmanager --licenses) y `npm i -g @bubblewrap/cli`.
"""
import json, os, shutil, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
AND = os.path.normpath(os.path.join(ROOT, "..", "plan-comidas-android"))
BW = os.path.join(os.path.expanduser("~"), ".bubblewrap")
cfg = json.load(open(os.path.join(BW, "config.json"), encoding="utf-8"))
env = dict(os.environ, JAVA_HOME=cfg["jdkPath"], ANDROID_HOME=cfg["androidSdkPath"], ANDROID_SDK_ROOT=cfg["androidSdkPath"])
for line in open(os.path.join(AND, "keystore.env"), encoding="utf-8"):
    if "=" in line: k, v = line.strip().split("=", 1); env[k] = v
# Bubblewrap llama a «gradlew.bat» sin ruta: hace falta que Windows lo busque en la carpeta del proyecto
for k in [k for k in env if k.upper() == "NODEFAULTCURRENTDIRECTORYINEXEPATH"]: env.pop(k)
env["PATH"] = os.pathsep.join([AND, os.path.join(cfg["jdkPath"], "bin"), env.get("PATH", "")])  # gradlew.bat y jarsigner
sh = lambda args, **kw: subprocess.run(args, cwd=AND, env=env, check=True, shell=(os.name == "nt"), **kw)

tm_path = os.path.join(AND, "twa-manifest.json"); tm = json.load(open(tm_path, encoding="utf-8"))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
changed = False
if args:
    tm["name"] = args[0]; tm["launcherName"] = args[1] if len(args) > 1 else args[0][:12]; changed = True
if "--version" in sys.argv:
    tm["appVersionCode"] = int(tm["appVersionCode"]) + 1
    major, minor, patch = (tm["appVersionName"].split(".") + ["0", "0"])[:3]
    tm["appVersionName"] = tm["appVersion"] = f"{major}.{minor}.{int(patch) + 1}"; changed = True
if changed:
    json.dump(tm, open(tm_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    sh("bubblewrap update --skipVersionUpgrade", input=b"\n")
print(f"App: {tm['name']} ({tm['launcherName']}) · {tm['packageId']} · v{tm['appVersionName']} ({tm['appVersionCode']})")

# paquetes del SDK que pide el proyecto (las licencias ya tienen que estar aceptadas)
sdkm = os.path.join(cfg["androidSdkPath"], "cmdline-tools", "latest", "bin", "sdkmanager.bat" if os.name == "nt" else "sdkmanager")
sh(f'"{sdkm}" "platforms;android-36" "build-tools;36.1.0" "platform-tools"')
sh("bubblewrap build --skipPwaValidation", input=b"\n")

apk = os.path.join(AND, "app-release-signed.apk"); aab = os.path.join(AND, "app-release-bundle.aab")
os.makedirs(os.path.join(ROOT, "descargas"), exist_ok=True)
shutil.copyfile(apk, os.path.join(ROOT, "descargas", "menuario.apk"))
print("OK descargas/menuario.apk", round(os.path.getsize(apk) / 1048576, 2), "MB")
print("OK AAB para Google Play:", aab)
