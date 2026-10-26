package ar.menuario.app;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Reparte los pasos de una lectura entre los días que abarca, en proporción al tiempo de cada día.
 * Sin esto, los pasos de la noche (Android a veces no deja leer el contador durante horas) iban todos al día siguiente.
 */
final class StepSplit {
    private StepSplit() {}

    static Map<String, Integer> split(long from, long to, int steps, TimeZone tz) {
        Map<String, Integer> out = new LinkedHashMap<>();
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(tz);
        if (steps <= 0) return out;
        if (to <= from) { out.put(f.format(new Date(to)), steps); return out; }   // el reloj cambió: todo al día de hoy
        Calendar cal = Calendar.getInstance(tz, Locale.US);
        long cur = from;
        int given = 0;
        while (cur < to) {
            cal.setTimeInMillis(cur);
            cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
            cal.add(Calendar.DAY_OF_YEAR, 1);
            long end = Math.min(cal.getTimeInMillis(), to);
            int upto = (int) Math.round((double) steps * (end - from) / (to - from));   // acumulado: la suma da justo «steps»
            int n = upto - given;
            given = upto;
            if (n > 0) {
                String k = f.format(new Date(cur));
                Integer prev = out.get(k);
                out.put(k, (prev == null ? 0 : prev) + n);
            }
            cur = end;
        }
        return out;
    }
}
