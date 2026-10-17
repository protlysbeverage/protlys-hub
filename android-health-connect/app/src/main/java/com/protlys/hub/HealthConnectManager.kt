package com.protlys.hub

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.permission.HealthPermission
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

class HealthConnectManager(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)
    private val zone = ZoneId.of("Africa/Nairobi")

    suspend fun grantedReadSteps(): Boolean {
        val permission = HealthPermission.getReadPermission(StepsRecord::class)
        return client.permissionController.getGrantedPermissions().contains(permission)
    }

    suspend fun todaySteps(): Long {
        val now = ZonedDateTime.now(zone)
        val start = now.toLocalDate().atStartOfDay(zone).toInstant()
        val response = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, Instant.now())
            )
        )
        return response[StepsRecord.COUNT_TOTAL] ?: 0L
    }

    fun todayDate(): String = ZonedDateTime.now(zone).toLocalDate().toString()
    fun nowIso(): String = Instant.now().toString()
}
