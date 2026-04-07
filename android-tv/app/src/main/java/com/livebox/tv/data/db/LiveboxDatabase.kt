package com.livebox.tv.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [FavoriteEntity::class, WatchHistoryEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class LiveboxDatabase : RoomDatabase() {
    abstract fun favoritesDao(): FavoritesDao
    abstract fun watchHistoryDao(): WatchHistoryDao
}
