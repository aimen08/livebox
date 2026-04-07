package com.livebox.tv.data

import com.livebox.tv.data.db.WatchHistoryDao
import com.livebox.tv.data.db.WatchHistoryEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchHistoryRepository @Inject constructor(
    private val dao: WatchHistoryDao,
) {
    /**
     * Application-lifetime scope used by [savePositionInBackground] so the
     * write survives the cancellation of any short-lived ViewModel scope
     * (e.g. PlayerViewModel disposing as the player screen closes).
     */
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Fire-and-forget position update — safe to call from onDispose. */
    fun savePositionInBackground(type: String, id: Long, positionMs: Long, durationMs: Long) {
        ioScope.launch { updatePosition(type, id, positionMs, durationMs) }
    }

    fun observeRecent(limit: Int = 50): Flow<List<WatchHistoryEntity>> =
        dao.observeRecent(limit)

    suspend fun get(type: String, id: Long): WatchHistoryEntity? = dao.get(type, id)

    /** Insert/refresh metadata for a watch entry without changing position. */
    suspend fun touch(
        type: String,
        id: Long,
        name: String,
        imageUrl: String? = null,
        ext: String? = null,
    ) {
        val existing = dao.get(type, id)
        dao.upsert(
            WatchHistoryEntity(
                type = type,
                id = id,
                name = name,
                imageUrl = imageUrl,
                ext = ext,
                positionMs = existing?.positionMs ?: 0L,
                durationMs = existing?.durationMs ?: 0L,
            )
        )
    }

    /** Update only the position/duration of an existing entry. No-op if missing. */
    suspend fun updatePosition(type: String, id: Long, positionMs: Long, durationMs: Long) {
        // Ignore tiny / invalid durations and positions near the very end (treat as completed).
        if (durationMs in 1 until 30_000) return
        val effectivePosition = if (durationMs > 0 && positionMs > durationMs - 10_000) 0L
        else positionMs
        dao.updatePosition(type, id, effectivePosition, durationMs)
    }

    suspend fun delete(type: String, id: Long) = dao.delete(type, id)
}
