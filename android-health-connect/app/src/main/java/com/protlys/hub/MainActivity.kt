package com.protlys.hub

import android.content.ComponentName
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.browser.customtabs.CustomTabsCallback
import androidx.browser.customtabs.CustomTabsClient
import androidx.browser.customtabs.CustomTabsServiceConnection
import androidx.browser.customtabs.CustomTabsSession
import androidx.browser.trusted.TrustedWebActivityIntentBuilder
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    companion object {
        private const val TAG = "ProtlysHealthConnect"
        private val ORIGIN = Uri.parse("https://hub.protlys.com")
        private val LAUNCH_URL = Uri.parse("https://hub.protlys.com/")
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var client: CustomTabsClient? = null
    private var session: CustomTabsSession? = null
    private var channelReady = false
    private var validated = false

    private val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class)
    )

    private val permissionLauncher =
        registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { granted ->
            if (granted.containsAll(requiredPermissions)) sendStepsToWeb()
            else sendStatusToWeb("permission_denied")
        }

    private val callback = object : CustomTabsCallback() {
        override fun onRelationshipValidationResult(
            relation: Int,
            requestedOrigin: Uri,
            result: Boolean,
            extras: Bundle?
        ) {
            validated = result
            Log.d(TAG, "Digital Asset Links validation: " + result)
        }

        override fun onNavigationEvent(navigationEvent: Int, extras: Bundle?) {
            if (navigationEvent == CustomTabsCallback.NAVIGATION_FINISHED) requestPostMessageChannel()
        }

        override fun onMessageChannelReady(extras: Bundle?) {
            channelReady = true
            sendStatusToWeb("channel_ready")
            sendStepsToWeb()
        }

        override fun onPostMessage(message: String, extras: Bundle?) {
            if (message == "PROTLYS_REQUEST_NATIVE_STEPS") sendStepsToWeb()
        }
    }

    private val serviceConnection = object : CustomTabsServiceConnection() {
        override fun onCustomTabsServiceConnected(name: ComponentName, customTabsClient: CustomTabsClient) {
            client = customTabsClient
            customTabsClient.warmup(0L)
            session = customTabsClient.newSession(callback)
            session?.let {
                it.validateRelationship(
                    androidx.browser.customtabs.CustomTabsService.RELATION_HANDLE_ALL_URLS,
                    ORIGIN,
                    null
                )
                TrustedWebActivityIntentBuilder(LAUNCH_URL)
                    .build(it)
                    .launchTrustedWebActivity(this@MainActivity)
            }
        }

        override fun onServiceDisconnected(name: ComponentName) {
            client = null
            session = null
            channelReady = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        connectBrowser()
        requestHealthConnectPermissionIfNeeded()
    }

    override fun onResume() {
        super.onResume()
        if (channelReady) sendStepsToWeb()
    }

    private fun connectBrowser() {
        val browserPackage = CustomTabsClient.getPackageName(this, null) ?: return
        CustomTabsClient.bindCustomTabsService(this, browserPackage, serviceConnection)
    }

    private fun requestPostMessageChannel() {
        val currentSession = session ?: return
        val requested = currentSession.requestPostMessageChannel(ORIGIN, ORIGIN, Bundle())
        Log.d(TAG, "PostMessage channel requested: " + requested)
    }

    private fun requestHealthConnectPermissionIfNeeded() {
        scope.launch {
            val status = HealthConnectClient.getSdkStatus(
                this@MainActivity,
                "com.google.android.apps.healthdata"
            )
            if (status != HealthConnectClient.SDK_AVAILABLE) {
                sendStatusToWeb("unavailable")
                return@launch
            }
            val manager = HealthConnectManager(this@MainActivity)
            if (manager.grantedReadSteps()) sendStepsToWeb()
            else permissionLauncher.launch(requiredPermissions)
        }
    }

    private fun sendStepsToWeb() {
        if (!channelReady) return
        scope.launch {
            try {
                val manager = HealthConnectManager(this@MainActivity)
                if (!manager.grantedReadSteps()) return@launch
                val steps = manager.todaySteps()
                val date = manager.todayDate()
                val timestamp = manager.nowIso()
                val message =
                    "{\"type\":\"PROTLYS_NATIVE_STEPS\",\"steps\":" +
                        steps + ",\"date\":\"" + date + "\",\"timestamp\":\"" + timestamp + "\"}"
                session?.postMessage(message, null)
            } catch (error: Exception) {
                Log.e(TAG, "Unable to read step data", error)
                sendStatusToWeb("read_error")
            }
        }
    }

    private fun sendStatusToWeb(status: String) {
        if (!channelReady) return
        session?.postMessage(
            "{\"type\":\"PROTLYS_NATIVE_STATUS\",\"status\":\"" + status + "\"}",
            null
        )
    }

    override fun onDestroy() {
        scope.cancel()
        runCatching { unbindService(serviceConnection) }
        session = null
        client = null
        super.onDestroy()
    }
}
