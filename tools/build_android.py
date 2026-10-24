# -*- coding: utf-8 -*-
"""App de Android (Trusted Web Activity con Bubblewrap): compila el APK firmado y el AAB para Google Play.

    python build_android.py                       # compila con el nombre actual
    python build_android.py "Nombre" "Corto"      # cambia el nombre de la app y del ícono, y compila
    python build_android.py --version --notas="Qué trae"   # versión nueva: los que tienen el APK ven el aviso para actualizar

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
# el APK abre el sitio con ?v=<versión> (también los accesos directos): así el sitio sabe si hay uno más nuevo para ofrecer
V = tm["appVersionName"]
start = f"/plan-comidas-bsas/index.html?app=1&v={V}"
if tm.get("startUrl") != start:
    tm["startUrl"] = start; changed = True
for sc in tm.get("shortcuts", []):
    u = sc["url"].split("&v=")[0]
    if sc["url"] != f"{u}&v={V}": sc["url"] = f"{u}&v={V}"; changed = True
if changed:
    json.dump(tm, open(tm_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    sh("bubblewrap update --skipVersionUpgrade", input=b"\n")
print(f"App: {tm['name']} ({tm['launcherName']}) · {tm['packageId']} · v{tm['appVersionName']} ({tm['appVersionCode']})")

# código nativo propio (podómetro, tools/android_native): Bubblewrap regenera el proyecto, así que se vuelve a poner cada vez
NAT = os.path.join(ROOT, "tools", "android_native")
JAVA = os.path.join(AND, "app", "src", "main", "java", *tm["packageId"].split("."))
LAUNCH = """        Uri uri = super.getLaunchingUrl();
        // Menuario: los pasos del podómetro del teléfono van en la dirección (solo si la persona lo activó en Pasos)
        try {
            if (StepReader.allowed(this) && StepReader.available(this) && StepStore.started(this)) {
                StepWorker.schedule(this);
                String p = StepStore.param(this);
                if (uri != null && !p.isEmpty() && uri.getQueryParameter("pasos") == null) uri = uri.buildUpon().appendQueryParameter("pasos", p).build();
                StepReader.readOnce(getApplicationContext(), new android.os.Handler(getMainLooper()), 3000, new StepReader.Done() { @Override public void run(boolean ok) { } });
            }
        } catch (Exception ignored) { }
"""
PERM = """    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
    <uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false"/>
"""
ACT = """        <activity android:name=".PasosActivity" android:exported="true" android:excludeFromRecents="true"
            android:theme="@android:style/Theme.Translucent.NoTitleBar">
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="menuario" android:host="pasos"/>
            </intent-filter>
        </activity>
"""
def apply_native():
    for f in os.listdir(NAT):
        if f.endswith(".java"): shutil.copyfile(os.path.join(NAT, f), os.path.join(JAVA, f))
    la = os.path.join(JAVA, "LauncherActivity.java"); s = open(la, encoding="utf-8").read()
    if "StepStore" not in s:
        assert "        Uri uri = super.getLaunchingUrl();\n" in s, "LauncherActivity cambió de forma"
        s = s.replace("        Uri uri = super.getLaunchingUrl();\n", LAUNCH, 1); open(la, "w", encoding="utf-8").write(s)
    mf = os.path.join(AND, "app", "src", "main", "AndroidManifest.xml"); s = open(mf, encoding="utf-8").read()
    if "ACTIVITY_RECOGNITION" not in s:
        s = s.replace("    <application", PERM + "    <application", 1).replace("    </application>", ACT + "    </application>", 1)
        open(mf, "w", encoding="utf-8").write(s)
    bg = os.path.join(AND, "app", "build.gradle"); s = open(bg, encoding="utf-8").read()
    if "androidx.work" not in s:
        s = s.replace("implementation 'com.google.androidbrowserhelper:androidbrowserhelper:", "implementation 'androidx.work:work-runtime:2.9.1'\n        implementation 'com.google.androidbrowserhelper:androidbrowserhelper:", 1)
        open(bg, "w", encoding="utf-8").write(s)
apply_native()

# paquetes del SDK que pide el proyecto (las licencias ya tienen que estar aceptadas)
sdkm = os.path.join(cfg["androidSdkPath"], "cmdline-tools", "latest", "bin", "sdkmanager.bat" if os.name == "nt" else "sdkmanager")
sh(f'"{sdkm}" "platforms;android-36" "build-tools;36.1.0" "platform-tools"')
sh("bubblewrap build --skipPwaValidation", input=b"\n")
sh("gradlew.bat --stop" if os.name == "nt" else "./gradlew --stop")  # que el demonio de Gradle no deje archivos trabados para la próxima

apk = os.path.join(AND, "app-release-signed.apk"); aab = os.path.join(AND, "app-release-bundle.aab")
os.makedirs(os.path.join(ROOT, "descargas"), exist_ok=True)
shutil.copyfile(apk, os.path.join(ROOT, "descargas", "menuario.apk"))
notes = next((x.split("=", 1)[1] for x in sys.argv if x.startswith("--notas=")), "Mejoras y arreglos.")
json.dump({"apk": V, "code": tm["appVersionCode"], "notes": notes, "at": __import__("datetime").date.today().isoformat()},
          open(os.path.join(ROOT, "descargas", "version.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("OK descargas/menuario.apk", round(os.path.getsize(apk) / 1048576, 2), "MB")
print("OK AAB para Google Play:", aab)
