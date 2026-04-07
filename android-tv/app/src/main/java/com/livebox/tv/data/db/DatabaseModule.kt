package com.livebox.tv.data.db

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext context: Context): LiveboxDatabase =
        Room.databaseBuilder(context, LiveboxDatabase::class.java, "livebox.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideFavoritesDao(db: LiveboxDatabase): FavoritesDao = db.favoritesDao()
    @Provides fun provideWatchHistoryDao(db: LiveboxDatabase): WatchHistoryDao = db.watchHistoryDao()
}
