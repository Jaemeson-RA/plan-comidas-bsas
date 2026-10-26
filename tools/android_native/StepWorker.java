package ar.menuario.app;

import android.content.Context;
import android.os.Handler;
import android.os.HandlerThread;

import androidx.annotation.NonNull;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Cada ~15 minutos (cuando Android lo permite) lee el contador para repartir bien los pasos entre los días. */
public class StepWorker extends Worker {
    public StepWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    static void schedule(Context c) {
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(StepWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(c.getApplicationContext()).enqueueUniquePeriodicWork("pasos", ExistingPeriodicWorkPolicy.KEEP, req);
        MidnightReceiver.schedule(c.getApplicationContext());
    }

    @NonNull @Override
    public Result doWork() {
        MidnightReceiver.schedule(getApplicationContext());   // las alarmas se borran al reiniciar el teléfono: se vuelve a poner
        HandlerThread ht = new HandlerThread("pasos");
        ht.start();
        final CountDownLatch latch = new CountDownLatch(1);
        StepReader.readOnce(getApplicationContext(), new Handler(ht.getLooper()), 8000, new StepReader.Done() {
            @Override public void run(boolean ok) { latch.countDown(); }
        });
        try { latch.await(10, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
        ht.quitSafely();
        return Result.success();
    }
}
