package com.livebox.tv.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector

/**
 * ExoPlayer factory tuned for IPTV.
 *
 * Two profiles:
 *  - LIVE: tight 2–8 s buffer, low-latency mode, accept faster catch-up.
 *    Mirrors the hls.js settings used in livebox/src/components/Player.jsx
 *    (lowLatencyMode + small live sync window).
 *  - VOD: 15–60 s buffer, optimized for scrubbing.
 */
object LiveboxPlayer {

    private const val UA = "LiveboxTV/1.0 (compatible; ExoPlayer)"

    fun build(context: Context, isLive: Boolean): ExoPlayer {
        val httpFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(UA)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(30_000)

        val mediaSourceFactory = DefaultMediaSourceFactory(context)
            .setDataSourceFactory(httpFactory)

        val loadControl = if (isLive) {
            // Live: tight buffer to stay near edge. Tolerates rebuffers.
            DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    /* minBufferMs = */ 2_000,
                    /* maxBufferMs = */ 8_000,
                    /* bufferForPlaybackMs = */ 1_000,
                    /* bufferForPlaybackAfterRebufferMs = */ 2_000,
                )
                .setPrioritizeTimeOverSizeThresholds(true)
                .build()
        } else {
            // VOD: larger buffer for smooth scrubbing.
            DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    /* minBufferMs = */ 15_000,
                    /* maxBufferMs = */ 60_000,
                    /* bufferForPlaybackMs = */ 2_500,
                    /* bufferForPlaybackAfterRebufferMs = */ 5_000,
                )
                .build()
        }

        return ExoPlayer.Builder(context)
            .setMediaSourceFactory(mediaSourceFactory)
            .setTrackSelector(DefaultTrackSelector(context))
            .setLoadControl(loadControl)
            .setHandleAudioBecomingNoisy(true)
            .build()
            .apply {
                playWhenReady = true
                repeatMode = Player.REPEAT_MODE_OFF
            }
    }

    fun mediaItem(url: String, isLive: Boolean): MediaItem {
        val mime = when {
            url.contains(".m3u8") -> MimeTypes.APPLICATION_M3U8
            url.endsWith(".ts") -> MimeTypes.VIDEO_MP2T
            url.endsWith(".mp4") -> MimeTypes.VIDEO_MP4
            url.endsWith(".mkv") -> MimeTypes.VIDEO_MATROSKA
            else -> MimeTypes.APPLICATION_M3U8
        }
        val builder = MediaItem.Builder().setUri(url).setMimeType(mime)
        if (isLive) {
            builder.setLiveConfiguration(
                MediaItem.LiveConfiguration.Builder()
                    .setMaxPlaybackSpeed(1.04f)   // catch up to live faster
                    .setTargetOffsetMs(3_000)     // ~3s behind live edge
                    .build()
            )
        }
        return builder.build()
    }
}
