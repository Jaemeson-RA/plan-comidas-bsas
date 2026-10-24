package ar.menuario.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;

/**
 * La abre el sitio con «menuario://pasos?accion=activar|sync» (desde la pantalla Pasos).
 * Pide el permiso de actividad física si hace falta, programa las lecturas, lee el contador y vuelve a
 * abrir la app en pasos.html con los pasos de los últimos días en la dirección (?pasos=...).
 */
public class PasosActivity extends Activity {
    static final String SITE = "https://jaemeson-ra.github.io/plan-comidas-bsas/";
    private static final int REQ = 71;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!StepReader.available(this)) { back("nosensor"); return; }
        if (!StepReader.allowed(this) && Build.VERSION.SDK_INT >= 29) {
            requestPermissions(new String[]{Manifest.permission.ACTIVITY_RECOGNITION}, REQ);
            return;
        }
        proceed();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) proceed();
        else back("denegado");
    }

    private void proceed() {
        StepWorker.schedule(this);
        StepReader.readOnce(this, new Handler(getMainLooper()), 2500, new StepReader.Done() {
            @Override public void run(boolean ok) { back(StepStore.param(PasosActivity.this)); }
        });
    }

    private void back(String pasos) {
        String v = "";
        try { v = getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception ignored) { }
        Uri uri = Uri.parse(SITE + "pasos.html").buildUpon()
                .appendQueryParameter("app", "1").appendQueryParameter("v", v)
                .appendQueryParameter("pasos", pasos.isEmpty() ? "vacio" : pasos).build();
        Intent i = new Intent(this, LauncherActivity.class);
        i.setData(uri);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
        finish();
    }
}
