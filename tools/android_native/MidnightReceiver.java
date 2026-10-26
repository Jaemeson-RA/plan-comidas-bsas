package ar.menuario.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;

import java.util.Calendar;

/** Lee el contador a las 23:59, aunque el teléfono esté en reposo: así los pasos de la noche quedan en el día en que se dieron. */
public class MidnightReceiver extends BroadcastReceiver {

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = PendingIntent.getBroadcast(c, 0, new Intent(c, MidnightReceiver.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 23); cal.set(Calendar.MINUTE, 59); cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 60000L) cal.add(Calendar.DAY_OF_YEAR, 1);
        long t = cal.getTimeInMillis();
        try {
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);   // sin alarma exacta: llega un poco después y StepSplit reparte
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        final Context app = context.getApplicationContext();
        final PendingResult pr = goAsync();
        final HandlerThread ht = new HandlerThread("pasos-noche");
        ht.start();
        StepReader.readOnce(app, new Handler(ht.getLooper()), 8000, new StepReader.Done() {
            @Override public void run(boolean ok) {
                schedule(app);
                ht.quitSafely();
                pr.finish();
            }
        });
    }
}
