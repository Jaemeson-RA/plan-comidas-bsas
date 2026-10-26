package ar.menuario.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Pasos por día a partir del contador del teléfono (TYPE_STEP_COUNTER, que cuenta desde el último reinicio).
 * Cada lectura reparte la diferencia con la anterior entre los días transcurridos (StepSplit); a las 23:59 hay una lectura fija (MidnightReceiver). Se guarda en SharedPreferences "pasos":
 * last = última lectura del contador, days = {"2026-10-25": 5234, ...} (últimos 70 días).
 */
final class StepStore {
    static final String PREFS = "pasos";

    private StepStore() {}

    static String day(Date d) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(d);
    }

    static synchronized void record(Context c, float counter) {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long now = System.currentTimeMillis(), at = sp.getLong("at", now);
        String today = day(new Date(now));
        float last = sp.getFloat("last", -1f);
        JSONObject days;
        try { days = new JSONObject(sp.getString("days", "{}")); } catch (Exception e) { days = new JSONObject(); }
        try {
            if (last >= 0f) {
                float delta = counter - last;
                if (delta < 0f) delta = counter;           // el teléfono se reinició: el contador volvió a cero
                float span = Math.max(1f, (now - at) / 86400000f + 1f);   // hasta 80.000 pasos por cada día que abarca la lectura
                if (delta > 0f && delta < 80000f * span) {
                    // los pasos desde la lectura anterior se reparten entre los días que pasaron, no van todos a hoy
                    for (Map.Entry<String, Integer> e : StepSplit.split(at, now, Math.round(delta), TimeZone.getDefault()).entrySet())
                        days.put(e.getKey(), days.optInt(e.getKey(), 0) + e.getValue());
                }
            } else if (!days.has(today)) {
                days.put(today, 0);                        // primera lectura: se empieza a contar desde ahora
            }
            Calendar lim = Calendar.getInstance();
            lim.add(Calendar.DAY_OF_YEAR, -70);
            String min = day(lim.getTime());
            List<String> old = new ArrayList<>();
            for (Iterator<String> it = days.keys(); it.hasNext(); ) { String k = it.next(); if (k.compareTo(min) < 0) old.add(k); }
            for (String k : old) days.remove(k);
        } catch (Exception ignored) { }
        sp.edit().putFloat("last", counter).putString("days", days.toString()).putLong("at", now).apply();
    }

    static boolean started(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).contains("last");
    }

    /** Últimos 35 días como "20261025:5234,20261024:8012" para pasarlos al sitio en la dirección. */
    static String param(Context c) {
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        StringBuilder out = new StringBuilder();
        try {
            JSONObject days = new JSONObject(sp.getString("days", "{}"));
            Calendar cal = Calendar.getInstance();
            for (int i = 0; i < 35; i++) {
                String k = day(cal.getTime());
                if (days.has(k)) {
                    if (out.length() > 0) out.append(',');
                    out.append(k.replace("-", "")).append(':').append(days.optInt(k, 0));
                }
                cal.add(Calendar.DAY_OF_YEAR, -1);
            }
        } catch (Exception ignored) { }
        return out.toString();
    }
}
