package com.livebox.tv.data

import retrofit2.http.GET
import retrofit2.http.Query
import retrofit2.http.Url

/**
 * Xtream Codes `player_api.php` endpoints.
 *
 * Note: baseUrl varies per user, so we pass full URLs via @Url and a tiny
 * helper that builds them. Retrofit base URL is set to a placeholder.
 */
interface XtreamApi {

    @GET
    suspend fun liveCategories(@Url url: String): List<LiveCategory>

    @GET
    suspend fun liveStreams(@Url url: String): List<LiveChannel>

    @GET
    suspend fun vodCategories(@Url url: String): List<LiveCategory>

    @GET
    suspend fun vodStreams(@Url url: String): List<VodItem>

    @GET
    suspend fun seriesCategories(@Url url: String): List<LiveCategory>

    @GET
    suspend fun series(@Url url: String): List<SeriesItem>

    @GET
    suspend fun seriesInfo(@Url url: String): SeriesInfo

    @GET
    suspend fun shortEpg(@Url url: String): EpgResponse

    @GET
    suspend fun vodInfo(@Url url: String): VodInfoResponse
}

object XtreamUrls {
    fun action(creds: XtreamCredentials, action: String, extra: String = ""): String =
        "${creds.baseUrl}/player_api.php" +
                "?username=${creds.username}" +
                "&password=${creds.password}" +
                "&action=$action$extra"

    /** HLS playback URL for a live channel. Falls back to .ts if HLS unavailable. */
    fun liveStream(creds: XtreamCredentials, streamId: Long, ext: String = "m3u8"): String =
        "${creds.baseUrl}/live/${creds.username}/${creds.password}/$streamId.$ext"

    fun vodStream(creds: XtreamCredentials, streamId: Long, ext: String): String =
        "${creds.baseUrl}/movie/${creds.username}/${creds.password}/$streamId.$ext"

    fun seriesEpisode(creds: XtreamCredentials, episodeId: Long, ext: String): String =
        "${creds.baseUrl}/series/${creds.username}/${creds.password}/$episodeId.$ext"
}
