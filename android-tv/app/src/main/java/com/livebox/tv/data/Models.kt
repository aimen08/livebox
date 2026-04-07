package com.livebox.tv.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Xtream Codes API models.
 *
 * Mirrors the data the existing Electron app pulls from `player_api.php`
 * (see livebox/src/App.jsx). Field names match the JSON exactly.
 */

@Serializable
data class XtreamCredentials(
    val baseUrl: String,
    val username: String,
    val password: String,
) {
    companion object {
        /**
         * Parse an Xtream `get.php` M3U URL like
         * `http://host:port/get.php?username=X&password=Y&type=m3u_plus&output=ts`
         * into [XtreamCredentials]. Returns null if the URL doesn't match.
         */
        private val M3U_REGEX =
            Regex("""^(https?://[^/]+)/get\.php\?[^#]*username=([^&]+)&password=([^&]+)""")

        fun parseM3uUrl(url: String): XtreamCredentials? {
            val match = M3U_REGEX.find(url.trim()) ?: return null
            val (base, user, pass) = match.destructured
            return XtreamCredentials(
                baseUrl = base.trimEnd('/'),
                username = user,
                password = pass,
            )
        }
    }
}

@Serializable
data class LiveCategory(
    @SerialName("category_id") val categoryId: String,
    @SerialName("category_name") val categoryName: String,
)

@Serializable
data class LiveChannel(
    @SerialName("stream_id") val streamId: Long,
    val name: String,
    @SerialName("stream_icon") val streamIcon: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("epg_channel_id") val epgChannelId: String? = null,
    @SerialName("tv_archive") val tvArchive: Int = 0,
)

@Serializable
data class VodItem(
    @SerialName("stream_id") val streamId: Long,
    val name: String,
    @SerialName("stream_icon") val streamIcon: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("container_extension") val containerExtension: String? = null,
    val rating: String? = null,
)

@Serializable
data class SeriesItem(
    @SerialName("series_id") val seriesId: Long,
    val name: String,
    val cover: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val plot: String? = null,
    val rating: String? = null,
)

/**
 * Response shape of `action=get_series_info&series_id=...`.
 *
 * `episodes` is a JSON object keyed by season number (as string) → list of
 * Episode. We deserialize it as Map<String, List<Episode>>.
 */
@Serializable
data class SeriesInfo(
    val info: SeriesInfoMeta? = null,
    val seasons: List<Season> = emptyList(),
    val episodes: Map<String, List<Episode>> = emptyMap(),
)

@Serializable
data class SeriesInfoMeta(
    val name: String? = null,
    val cover: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val releaseDate: String? = null,
    val rating: String? = null,
)

@Serializable
data class Season(
    @SerialName("season_number") val seasonNumber: Int = 0,
    val name: String? = null,
    @SerialName("episode_count") val episodeCount: Int = 0,
    val cover: String? = null,
    val overview: String? = null,
)

@Serializable
data class Episode(
    val id: String,
    @SerialName("episode_num") val episodeNum: Int = 0,
    val title: String? = null,
    @SerialName("container_extension") val containerExtension: String = "mp4",
    val info: EpisodeInfo? = null,
)

@Serializable
data class EpisodeInfo(
    val plot: String? = null,
    val duration: String? = null,
    @SerialName("movie_image") val movieImage: String? = null,
)

/* ---------- EPG ---------- */

@Serializable
data class EpgResponse(
    @SerialName("epg_listings") val epgListings: List<EpgListing> = emptyList(),
)

/**
 * `title` and `description` come back base64-encoded from Xtream's
 * `get_short_epg`. Use [titleDecoded] / [descriptionDecoded] for display.
 */
@Serializable
data class EpgListing(
    val id: String? = null,
    val title: String = "",
    val description: String? = null,
    val start: String? = null,
    val end: String? = null,
    @SerialName("start_timestamp") val startTimestamp: String? = null,
    @SerialName("stop_timestamp") val stopTimestamp: String? = null,
    @SerialName("now_playing") val nowPlaying: Int = 0,
) {
    val titleDecoded: String get() = decodeBase64(title)
    val descriptionDecoded: String get() = decodeBase64(description.orEmpty())
}

private fun decodeBase64(s: String): String = try {
    if (s.isEmpty()) "" else String(android.util.Base64.decode(s, android.util.Base64.DEFAULT))
} catch (_: Exception) { s }

/* ---------- VOD info (movie detail) ---------- */

@Serializable
data class VodInfoResponse(
    val info: VodInfoMeta? = null,
    @SerialName("movie_data") val movieData: VodMovieData? = null,
)

@Serializable
data class VodInfoMeta(
    @SerialName("movie_image") val movieImage: String? = null,
    val plot: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val genre: String? = null,
    val rating: String? = null,
    val duration: String? = null,
    val releasedate: String? = null,
)

@Serializable
data class VodMovieData(
    @SerialName("stream_id") val streamId: Long = 0,
    val name: String = "",
    @SerialName("container_extension") val containerExtension: String = "mp4",
)

/* ---------- Cache snapshot (persisted to disk) ---------- */

/**
 * One-shot snapshot of everything fetched from a provider — equivalent to
 * the React app's `xtreamCache` localStorage entry. Persisted as JSON in
 * the app's files dir so the next launch is instant.
 */
@Serializable
data class XtreamCacheSnapshot(
    val baseUrl: String,
    val username: String,
    val liveCategories: List<LiveCategory> = emptyList(),
    val liveChannels: List<LiveChannel> = emptyList(),
    val vodCategories: List<LiveCategory> = emptyList(),
    val vodItems: List<VodItem> = emptyList(),
    val seriesCategories: List<LiveCategory> = emptyList(),
    val seriesItems: List<SeriesItem> = emptyList(),
    val cachedAt: Long = System.currentTimeMillis(),
)
