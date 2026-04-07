package com.livebox.tv.data

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class XtreamRepository @Inject constructor(
    private val api: XtreamApi,
    private val credsStore: CredentialsStore,
) {
    suspend fun liveCategories(): List<LiveCategory> {
        val c = credsStore.require()
        return api.liveCategories(XtreamUrls.action(c, "get_live_categories"))
    }

    suspend fun liveChannels(categoryId: String? = null): List<LiveChannel> {
        val c = credsStore.require()
        val extra = categoryId?.let { "&category_id=$it" } ?: ""
        return api.liveStreams(XtreamUrls.action(c, "get_live_streams", extra))
    }

    suspend fun vodCategories(): List<LiveCategory> {
        val c = credsStore.require()
        return api.vodCategories(XtreamUrls.action(c, "get_vod_categories"))
    }

    suspend fun vodItems(categoryId: String? = null): List<VodItem> {
        val c = credsStore.require()
        val extra = categoryId?.let { "&category_id=$it" } ?: ""
        return api.vodStreams(XtreamUrls.action(c, "get_vod_streams", extra))
    }

    suspend fun seriesCategories(): List<LiveCategory> {
        val c = credsStore.require()
        return api.seriesCategories(XtreamUrls.action(c, "get_series_categories"))
    }

    suspend fun series(categoryId: String? = null): List<SeriesItem> {
        val c = credsStore.require()
        val extra = categoryId?.let { "&category_id=$it" } ?: ""
        return api.series(XtreamUrls.action(c, "get_series", extra))
    }

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
