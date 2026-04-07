package com.livebox.tv.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoritesDao {

    @Query("SELECT * FROM favorites ORDER BY addedAt DESC")
    fun observeAll(): Flow<List<FavoriteEntity>>

    @Query("SELECT * FROM favorites WHERE type = :type ORDER BY addedAt DESC")
    fun observeByType(type: String): Flow<List<FavoriteEntity>>

    @Query("SELECT EXISTS(SELECT 1 FROM favorites WHERE type = :type AND id = :id)")
    fun isFavorite(type: String, id: Long): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(fav: FavoriteEntity)

    @Query("DELETE FROM favorites WHERE type = :type AND id = :id")
    suspend fun delete(type: String, id: Long)

    @Query("DELETE FROM favorites")
    suspend fun clear()
}

@Dao
interface WatchHistoryDao {

    @Query("SELECT * FROM watch_history ORDER BY updatedAt DESC LIMIT :limit")
    fun observeRecent(limit: Int = 50): Flow<List<WatchHistoryEntity>>

    @Query("SELECT * FROM watch_history WHERE type = :type AND id = :id LIMIT 1")
    suspend fun get(type: String, id: Long): WatchHistoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: WatchHistoryEntity)

    @Query(
        "UPDATE watch_history SET positionMs = :positionMs, durationMs = :durationMs, " +
                "updatedAt = :updatedAt WHERE type = :type AND id = :id"
    )
    suspend fun updatePosition(
        type: String,
        id: Long,
        positionMs: Long,
        durationMs: Long,
        updatedAt: Long = System.currentTimeMillis(),
    )

    @Query("DELETE FROM watch_history WHERE type = :type AND id = :id")
    suspend fun delete(type: String, id: Long)

    @Query("DELETE FROM watch_history")
    suspend fun clear()
}
