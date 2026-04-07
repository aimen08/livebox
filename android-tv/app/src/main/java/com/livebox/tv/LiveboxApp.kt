package com.livebox.tv

import android.app.Application
import android.os.Build
import android.util.Log
import coil.Coil
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.GifDecoder
import coil.decode.ImageDecoderDecoder
import coil.decode.SvgDecoder
import coil.EventListener
import coil.request.CachePolicy
import coil.request.ErrorResult
import coil.request.ImageRequest
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

@HiltAndroidApp
class LiveboxApp : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        // Lock in our custom loader before the first compose pass so AsyncImage
        // never falls back to Coil's default loader (which lacks our decoders).
        Coil.setImageLoader(this)
    }

    /**
     * Custom Coil ImageLoader so animated channel logos render. IPTV providers
     * mix several formats:
     *   - PNG / JPG / static WebP — handled by Coil out of the box
     *   - Animated GIF / WebP / HEIF — ImageDecoderDecoder (API 28+) or
     *     GifDecoder fallback
     *   - SVG — SvgDecoder
     *
     * Critical: [allowHardware] MUST be false for animations to play. Hardware
     * bitmaps are immutable and can't be redrawn frame-by-frame, so an
     * AnimatedImageDrawable backed by a hardware bitmap renders as a static
     * first frame. The cost of software bitmaps is negligible for small icons.
     */
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .components {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    add(ImageDecoderDecoder.Factory(enforceMinimumFrameDelay = true))
                } else {
                    add(GifDecoder.Factory(enforceMinimumFrameDelay = true))
                }
                add(SvgDecoder.Factory())
            }
            .okHttpClient {
                // Generous timeouts — channel logo CDNs are often slow.
                // UA header is mandatory for some hosts (Wikimedia returns 403
                // to anything that looks like a default library UA).
                OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(20, TimeUnit.SECONDS)
                    .addInterceptor { chain ->
                        val req = chain.request().newBuilder()
                            .header(
                                "User-Agent",
                                "LiveboxTV/1.0 (https://github.com/livebox; contact@livebox.app)"
                            )
                            .build()
                        chain.proceed(req)
                    }
                    .build()
            }
            .respectCacheHeaders(false)        // many IPTV CDNs send no-cache
            .diskCachePolicy(CachePolicy.ENABLED)
            .memoryCachePolicy(CachePolicy.ENABLED)
            .allowHardware(false)              // ← required for animated drawables
            .crossfade(true)
            .eventListener(object : EventListener {
                override fun onError(request: ImageRequest, result: ErrorResult) {
                    Log.w(
                        "LiveboxImage",
                        "load failed: ${request.data} → ${result.throwable.javaClass.simpleName}: ${result.throwable.message}"
                    )
                }
            })
            .build()
}
