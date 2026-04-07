package com.livebox.tv.data

import com.livebox.tv.data.db.FavoriteEntity
import com.livebox.tv.data.db.FavoritesDao
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FavoritesRepository @Inject constructor(
    private val dao: FavoritesDao,
) {
    fun observeAll(): Flow<List<FavoriteEntity>> = dao.observeAll()
    fun observeByType(type: String): Flow<List<FavoriteEntity>> = dao.observeByType(type)
    fun isFavorite(type: String, id: Long): Flow<Boolean> = dao.isFavorite(type, id)

    suspend fun toggle(
        type: String,
        id: Long,
        name: String,
        imageUrl: String? = null,
        ext: String? = null,
        currentlyFavorite: Boolean,
    ) {
        if (currentlyFavorite) dao.delete(type, id)
        else dao.insert(FavoriteEntity(type, id, name, imageUrl, ext))
    }

    suspend fun add(type: String, id: Long, name: String, imageUrl: String? = null, ext: String? = null) =
        dao.insert(FavoriteEntity(type, id, name, imageUrl, ext))

    suspend fun remove(type: String, id: Long) = dao.delete(type, id)
}
