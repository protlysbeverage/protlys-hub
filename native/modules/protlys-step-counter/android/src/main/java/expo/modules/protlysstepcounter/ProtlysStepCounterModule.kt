
package expo.modules.protlysstepcounter

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ProtlysStepCounterModule : Module() {

    companion object {
        private const val PREFS = "protlys_step_tracking"
    }

    override fun definition() = ModuleDefinition {

        Name("ProtlysStepCounter")

        Function("isAvailable") {
            val context = appContext.reactContext
                ?: return@Function false

            val manager = context.getSystemService(
                Context.SENSOR_SERVICE
            ) as SensorManager

            manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
        }

        Function("startTracking") { userId: String ->
            require(userId.isNotBlank()) {
                "A valid user ID is required to start step tracking."
            }

            val context = appContext.reactContext
                ?: throw IllegalStateException("Android context is unavailable.")

            val intent = Intent(
                context,
                ProtlysStepCounterService::class.java
            ).apply {
                action = ProtlysStepCounterService.ACTION_START
                putExtra(ProtlysStepCounterService.EXTRA_USER_ID, userId)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }

            true
        }

        Function("isTracking") { userId: String ->
            val context = appContext.reactContext
                ?: return@Function false

            if (userId.isBlank()) return@Function false

            val preferences = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            )

            if (!preferences.getBoolean("tracking_active_$userId", false)) {
                return@Function false
            }

            @Suppress("DEPRECATION")
            val activityManager =
                context.getSystemService(Context.ACTIVITY_SERVICE)
                    as ActivityManager

            @Suppress("DEPRECATION")
            activityManager.getRunningServices(Int.MAX_VALUE).any {
                it.service.className ==
                    ProtlysStepCounterService::class.java.name
            }
        }

        Function("getTodaySteps") { userId: String ->
            require(userId.isNotBlank()) {
                "A valid user ID is required."
            }

            val context = appContext.reactContext
                ?: throw IllegalStateException("Android context is unavailable.")

            val date = SimpleDateFormat(
                "yyyy-MM-dd",
                Locale.US
            ).format(Date())

            val preferences = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            )

            preferences.getLong(
                "steps_${userId}_$date",
                0L
            ).toDouble()
        }

        Function("getRecentDailySteps") { userId: String, days: Int ->
            require(userId.isNotBlank()) {
                "A valid user ID is required."
            }

            val context = appContext.reactContext
                ?: throw IllegalStateException("Android context is unavailable.")

            val safeDays = days.coerceIn(1, 30)
            val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)

            val cutoff = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, -(safeDays - 1))
            }.time

            val cutoffKey = formatter.format(cutoff)
            val todayKey = formatter.format(Date())
            val prefix = "steps_${userId}_"

            val preferences = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            )

            preferences.all.entries.mapNotNull { entry ->
                val key = entry.key
                val value = entry.value

                if (!key.startsWith(prefix) || value !is Long) {
                    return@mapNotNull null
                }

                val date = key.removePrefix(prefix)

                if (
                    date < cutoffKey ||
                    date > todayKey ||
                    value <= 0L
                ) {
                    return@mapNotNull null
                }

                mapOf(
                    "date" to date,
                    "steps" to value.coerceAtMost(60000L).toInt()
                )
            }.sortedBy { it["date"] as String }
        }

        Function("stopTracking") {
            val context = appContext.reactContext
                ?: throw IllegalStateException("Android context is unavailable.")

            val preferences = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
            )

            val activeUser = preferences.getString("active_user_id", null)

            val intent = Intent(
                context,
                ProtlysStepCounterService::class.java
            )

            // Clear the saved user so a later reboot cannot restart
            // tracking for an account that has logged out.
            preferences.edit().apply {
                if (!activeUser.isNullOrBlank()) {
                    putBoolean("tracking_active_$activeUser", false)
                }
                remove("active_user_id")
            }.apply()

            context.stopService(intent)
            true
        }
    }
}
