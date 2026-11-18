
package expo.modules.protlysstepcounter

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.roundToLong

class ProtlysStepCounterService : Service(), SensorEventListener {

    companion object {
        const val ACTION_START = "protlys.steps.START"
        const val ACTION_STOP = "protlys.steps.STOP"
        const val EXTRA_USER_ID = "user_id"

        private const val CHANNEL_ID = "protlys_step_tracking"
        private const val NOTIFICATION_ID = 7301
        private const val PREFS = "protlys_step_tracking"

        fun todayKey(): String = dateKey(System.currentTimeMillis())

        private fun dateKey(timeMillis: Long): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(timeMillis))
    }

    private var sensorManager: SensorManager? = null
    private var userId: String? = null
    private var lastNotificationSteps = -1

    private val prefs by lazy {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    private fun setTrackingActive(active: Boolean) {
        val activeUser = userId ?: return
        prefs.edit()
            .putBoolean("tracking_active_$activeUser", active)
            .apply()
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        if (intent?.action == ACTION_STOP) {
            stopTracking()
            stopSelf()
            return START_NOT_STICKY
        }

        userId = intent?.getStringExtra(EXTRA_USER_ID)
            ?: prefs.getString("active_user_id", null)

        if (userId.isNullOrBlank()) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        prefs.edit()
            .putString("active_user_id", userId)
            .apply()

        setTrackingActive(false)

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
                != PackageManager.PERMISSION_GRANTED
        ) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf(startId)
            return START_NOT_STICKY
        }

        val manager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val stepSensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)

        if (stepSensor == null) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf(startId)
            return START_NOT_STICKY
        }

        try {
            startTrackingNotification()

            sensorManager?.unregisterListener(this)
            sensorManager = manager

            val registered = manager.registerListener(
                this,
                stepSensor,
                SensorManager.SENSOR_DELAY_NORMAL
            )

            if (!registered) {
                sensorManager?.unregisterListener(this)
                sensorManager = null
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf(startId)
                return START_NOT_STICKY
            }

            setTrackingActive(true)
            return START_STICKY
        } catch (error: Exception) {
            sensorManager?.unregisterListener(this)
            sensorManager = null
            setTrackingActive(false)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf(startId)
            return START_NOT_STICKY
        }
    }

    private fun startTrackingNotification() {
        val notification = buildNotification(
            "Your daily steps are being counted."
        )

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(message: String): Notification {
        val launchIntent = packageManager
            .getLaunchIntentForPackage(packageName)

        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or
                    PendingIntent.FLAG_IMMUTABLE
            )
        }

        return Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Protlys is tracking your movement")
            .setContentText(message)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Protlys step tracking active."
            }

            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (
            event?.sensor?.type != Sensor.TYPE_STEP_COUNTER ||
            event.values.isEmpty()
        ) return

        val activeUser = userId ?: return
        val currentTotal = event.values[0].toLong()
        val currentElapsed = event.timestamp
        val currentWall = System.currentTimeMillis()

        val totalKey = "last_sensor_total_$activeUser"
        val elapsedKey = "last_sensor_elapsed_$activeUser"
        val wallKey = "last_sensor_wall_$activeUser"

        val previousTotal = prefs.getLong(totalKey, -1L)
        val previousElapsed = prefs.getLong(elapsedKey, -1L)
        val previousWall = prefs.getLong(wallKey, -1L)

        fun saveBaseline() {
            prefs.edit()
                .putLong(totalKey, currentTotal)
                .putLong(elapsedKey, currentElapsed)
                .putLong(wallKey, currentWall)
                .apply()
        }

        // First reading: establish a baseline without inventing steps.
        if (previousTotal < 0L || previousElapsed < 0L || previousWall < 0L) {
            saveBaseline()
            updateNotification(
                prefs.getLong("steps_${activeUser}_${todayKey()}", 0L).toInt()
            )
            return
        }

        // The hardware counter can reset after a reboot.
        if (currentTotal < previousTotal) {
            saveBaseline()
            return
        }

        val delta = currentTotal - previousTotal

        // Save the new baseline before updating daily totals.
        saveBaseline()

        if (delta <= 0L) return

        // Split the interval's steps if it crossed local midnight.
        // This is an estimate: the hardware sensor does not timestamp
        // each individual step, so steps are distributed by elapsed time.
        addStepsAcrossDates(
            activeUser,
            previousWall,
            currentWall,
            delta
        )

        updateNotification(
            prefs.getLong(
                "steps_${activeUser}_${todayKey()}",
                0L
            ).toInt()
        )
    }

    private fun addStepsAcrossDates(
        activeUser: String,
        startMillis: Long,
        endMillis: Long,
        totalSteps: Long
    ) {
        if (endMillis <= startMillis) {
            addToDailyTotal(activeUser, todayKey(), totalSteps)
            return
        }

        val totalDuration = endMillis - startMillis
        var cursor = startMillis
        var allocated = 0L

        while (cursor < endMillis) {
            val calendar = Calendar.getInstance().apply {
                timeInMillis = cursor
            }

            val dayKey = dateKey(cursor)

            calendar.add(Calendar.DAY_OF_YEAR, 1)
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)

            val nextMidnight = calendar.timeInMillis
            val segmentEnd = minOf(endMillis, nextMidnight)

            if (segmentEnd <= cursor) break

            val segmentSteps = if (segmentEnd >= endMillis) {
                totalSteps - allocated
            } else {
                (totalSteps.toDouble() *
                    (segmentEnd - cursor).toDouble() /
                    totalDuration.toDouble()).roundToLong()
                    .coerceIn(0L, totalSteps - allocated)
            }

            addToDailyTotal(activeUser, dayKey, segmentSteps)
            allocated += segmentSteps
            cursor = segmentEnd
        }

        if (allocated < totalSteps) {
            addToDailyTotal(activeUser, todayKey(), totalSteps - allocated)
        }
    }

    private fun addToDailyTotal(
        activeUser: String,
        date: String,
        steps: Long
    ) {
        if (steps <= 0L) return

        val key = "steps_${activeUser}_$date"
        val current = prefs.getLong(key, 0L)
        val updated = (current + steps).coerceAtMost(60000L)

        prefs.edit()
            .putLong(key, updated)
            .apply()
    }

    private fun updateNotification(steps: Int) {
        if (steps == lastNotificationSteps) return

        lastNotificationSteps = steps

        getSystemService(NotificationManager::class.java)
            .notify(
                NOTIFICATION_ID,
                buildNotification("$steps steps recorded today.")
            )
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    override fun onBind(intent: Intent?): IBinder? = null

    private fun stopTracking() {
        sensorManager?.unregisterListener(this)
        sensorManager = null
        setTrackingActive(false)
        stopForeground(STOP_FOREGROUND_REMOVE)

        prefs.edit()
            .remove("active_user_id")
            .apply()
    }

    override fun onDestroy() {
        sensorManager?.unregisterListener(this)
        sensorManager = null
        setTrackingActive(false)
        super.onDestroy()
    }
}
