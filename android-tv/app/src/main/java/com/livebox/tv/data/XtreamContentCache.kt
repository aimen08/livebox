package com.livebox.tv.data

import android.content.Context
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Singleton in-memory + on-disk cache for the catalog data
 * (live channels, movies, series). Mirrors React's `xtreamCache`
 * localStorage pattern: hydrated synchronously on first construction so
 * the first render of any tab already has data, then refreshed in the
 * background by the repository.
 *
 * Two-tier:
 *  - [snapshot] StateFlow exposes whatever is currently in memory
 *  - filesDir/xtream_cache.json holds the persistent copy
 *
 * Persistence is async (background scope) so it never blocks the UI.
 */
@Singleton
class XtreamContentCache @Inject constructor(
    @ApplicationContext private val context: Context,
    private val json: Json,
) {
    private val file = context.filesDir.resolve("xtream_cache.json")
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _snapshot = MutableStateFlow<XtreamCacheSnapshot?>(null)
    val snapshot: StateFlow<XtreamCacheSnapshot?> = _snapshot.asStateFlow()

    init {
        // Synchronous hydrate so first composition sees cached data.
        runCatching {
            if (file.exists()) {
                _snapshot.value = json.decodeFromString(file.readText())
            }
        }.onFailure { e ->
            Log.w("XtreamContentCache", "Failed to hydrate cache from disk", e)
        }
    }

    /** Replace in-memory + disk snapshot. Disk write is fire-and-forget. */
    fun update(newSnapshot: XtreamCacheSnapshot) {
        _snapshot.value = newSnapshot
        ioScope.launch {
            runCatching { file.writeText(json.encodeToString(newSnapshot)) }
                .onFailure { e -> Log.w("XtreamContentCache", "Failed to persist cache", e) }
        }
    }

    /** Wipe in-memory and on-disk snapshot. */
    fun clear() {
        _snapshot.value = null
        ioScope.launch { runCatching { file.delete() } }
    }
}
