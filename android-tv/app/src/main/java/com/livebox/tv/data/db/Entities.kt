package com.livebox.tv.data.db

import androidx.room.Entity

/**
 * Stream type discriminator used as part of the composite primary key.
 * Mirrors the route segment used in nav: "live", "vod", "series", "episode".
 */
object StreamType {
    const val LIVE = "live"
    const val VOD = "vod"
    const val SERIES = "series"   // a whole show; played via episode entries
    const val EPISODE = "episode"
}

@Entity(tableName = "favorites", primaryKeys = ["type", "id"])
data class FavoriteEntity(
    val type: String,
    val id: Long,
    val name: String,
    val imageUrl: String? = null,
    /** For VOD/episode: container extension needed to build a stream URL. */
    val ext: String? = null,
    val addedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "watch_history", primaryKeys = ["type", "id"])
data class WatchHistoryEntity(
    val type: String,
    val id: Long,
    val name: String,
    val imageUrl: String? = null,
    val ext: String? = null,
    /** Last known playback position in milliseconds. */
    val positionMs: Long = 0,
    /** Total content duration in milliseconds (0 if unknown). */
    val durationMs: Long = 0,
    val updatedAt: Long = System.currentTimeMillis(),
)
