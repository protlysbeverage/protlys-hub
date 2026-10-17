package com.protlys.hub

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val text = TextView(this).apply {
            text = "Protlys Hub reads your daily step count from Health Connect to automatically update your movement tracking."
            setPadding(48, 48, 48, 48)
        }
        setContentView(text)
    }
}
