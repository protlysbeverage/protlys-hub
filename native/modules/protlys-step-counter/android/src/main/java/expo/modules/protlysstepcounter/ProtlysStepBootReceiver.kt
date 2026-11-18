
package expo.modules.protlysstepcounter

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Build
import android.util.Log

class ProtlysStepBootReceiver : BroadcastReceiver() {

    companion object {
        private const val PREFS = "protlys_step_tracking"
        private const val TAG = "ProtlysStepBoot"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (
            intent?.action != Intent.ACTION_BOOT_COMPLETED &&
            intent?.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return

        val preferences = context.getSharedPreferences(
            PREFS,
            Context.MODE_PRIVATE
        )

        val userId = preferences.getString("active_user_id", null)

        if (userId.isNullOrBlank()) return

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            context.checkSelfPermission(
                Manifest.permission.ACTIVITY_RECOGNITION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.i(TAG, "Step tracking permission is not granted.")
            return
        }

        val sensorManager = context.getSystemService(
            Context.SENSOR_SERVICE
        ) as SensorManager

        if (
            sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) == null
        ) {
            Log.i(TAG, "Step counter sensor is unavailable.")
            return
        }

        val serviceIntent = Intent(
            context,
            ProtlysStepCounterService::class.java
        ).apply {
            action = ProtlysStepCounterService.ACTION_START
            putExtra(
                ProtlysStepCounterService.EXTRA_USER_ID,
                userId
            )
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (error: Exception) {
            Log.e(TAG, "Unable to restart step tracking.", error)
        }
    }
}
