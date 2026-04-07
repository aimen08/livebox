package com.livebox.tv.data

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class XtreamRepository @Inject constructor(
    private val api: XtreamApi,
    private val credsStore: CredentialsStore,
    private val cache: XtreamContentCache,
) {
    /** Catalog cache snapshot — backs Live/Movies/Series tabs. */
    val cachedSnapshot: StateFlow<XtreamCacheSnapshot?> = cache.snapshot

    /**
     * Fetch every catalog endpoint in parallel and update the cache.
     * Mirrors React's `loadXtreamAPI` flow — single round-trip per endpoint
     * with no category filter, then filtering happens client-side.
     */
    suspend fun refreshAll() = coroutineScope {
        val c = credsStore.require()
        val liveCats = async { api.liveCategories(XtreamUrls.action(c, "get_live_categories")) }
        val live = async { api.liveStreams(XtreamUrls.action(c, "get_live_streams")) }
        val vodCats = async { api.vodCategories(XtreamUrls.action(c, "get_vod_categories")) }
        val vod = async { api.vodStreams(XtreamUrls.action(c, "get_vod_streams")) }
        val serCats = async { api.seriesCategories(XtreamUrls.action(c, "get_series_categories")) }
        val ser = async { api.series(XtreamUrls.action(c, "get_series")) }

        cache.update(
            XtreamCacheSnapshot(
                baseUrl = c.baseUrl,
                username = c.username,
                liveCategories = liveCats.await(),
                liveChannels = live.await(),
                vodCategories = vodCats.await(),
                vodItems = vod.await(),
                seriesCategories = serCats.await(),
                seriesItems = ser.await(),
            )
        )
    }

    fun clearCache() = cache.clear()

    /* ───────── Per-item lookups (not cached — fetched on demand) ───────── */

    suspend fun seriesInfo(seriesId: Long): SeriesInfo {
        val c = credsStore.require()
        return api.seriesInfo(XtreamUrls.action(c, "get_series_info", "&series_id=$seriesId"))
    }

    suspend fun shortEpg(streamId: Long, limit: Int = 4): List<EpgListing> {
        val c = credsStore.require()
        val extra = "&stream_id=$streamId&limit=$limit"
        return api.shortEpg(XtreamUrls.action(c, "get_short_epg", extra)).epgListings
    }

    suspend fun vodInfo(vodId: Long): VodInfoResponse {
        val c = credsStore.require()
        return api.vodInfo(XtreamUrls.action(c, "get_vod_info", "&vod_id=$vodId"))
    }

    /* ───────── Stream URL builders ───────── */

    fun liveStreamUrl(streamId: Long): String =
        XtreamUrls.liveStream(credsStore.require(), streamId)

    fun vodStreamUrl(streamId: Long, ext: String): String =
        XtreamUrls.vodStream(credsStore.require(), streamId, ext)

    fun episodeStreamUrl(episodeId: Long, ext: String): String =
        XtreamUrls.seriesEpisode(credsStore.require(), episodeId, ext)

    /** Resolve a player URL from a route's (type, id, ext) tuple. */
    fun resolveStreamUrl(type: String, id: Long, ext: String): String = when (type) {
        "live" -> liveStreamUrl(id)
        "vod" -> vodStreamUrl(id, ext)
        "episode" -> episodeStreamUrl(id, ext)
        else -> error("Unknown stream type: $type")
    }
}
