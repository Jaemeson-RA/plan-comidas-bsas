package ar.menuario.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;

/** Una lectura del contador de pasos del teléfono (se registra, toma el primer valor y se desregistra). */
final class StepReader {
    interface Done { void run(boolean ok); }

    private StepReader() {}

    static boolean available(Context c) {
        SensorManager sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
        return sm != null && sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
    }

    static boolean allowed(Context c) {
        return Build.VERSION.SDK_INT < 29
                || c.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED;
    }

    static void readOnce(final Context c, final Handler h, long timeoutMs, final Done done) {
        final SensorManager sm = (SensorManager) c.getSystemService(Context.SENSOR_SERVICE);
        final Sensor s = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (s == null || !allowed(c)) { done.run(false); return; }
        final boolean[] fired = {false};
        final SensorEventListener l = new SensorEventListener() {
            @Override public void onSensorChanged(SensorEvent e) {
                if (fired[0]) return;
                fired[0] = true;
                sm.unregisterListener(this);
                StepStore.record(c, e.values[0]);
                done.run(true);
            }
            @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
        };
        sm.registerListener(l, s, SensorManager.SENSOR_DELAY_NORMAL, h);
        h.postDelayed(new Runnable() {
            @Override public void run() {
                if (fired[0]) return;
                fired[0] = true;
                sm.unregisterListener(l);
                done.run(false);
            }
        }, timeoutMs);
    }
}
