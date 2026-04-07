package com.livebox.tv.ui.screens

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.View
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.media3.ui.PlayerView
import com.livebox.tv.data.WatchHistoryRepository
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.data.db.StreamType
import com.livebox.tv.player.LiveboxPlayer
import com.livebox.tv.ui.theme.LbColors
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val repo: XtreamRepository,
    private val history: WatchHistoryRepository,
) : ViewModel() {

    fun streamUrl(type: String, id: Long, ext: String): String =
        repo.resolveStreamUrl(type, id, ext)

    suspend fun resumePosition(type: String, id: Long): Long {
        if (type == StreamType.LIVE) return 0L
        return history.get(type, id)?.positionMs ?: 0L
    }

    fun savePosition(type: String, id: Long, positionMs: Long, durationMs: Long) {
        if (type == StreamType.LIVE) return
        history.savePositionInBackground(type, id, positionMs, durationMs)
    }
}

@Composable
fun PlayerScreen(
    type: String,
    streamId: Long,
    ext: String,
    onBack: () -> Unit,
    vm: PlayerViewModel = hiltViewModel(),
) {
    val context = LocalContext.current
    val isLive = type == StreamType.LIVE
    val player = remember(type, streamId, ext) { LiveboxPlayer.build(context, isLive) }

    // Mirrors the PlayerView's controller visibility so our Compose overlays
    // (back chip, LIVE badge) hide and show with the controls.
    var controlsVisible by remember { mutableStateOf(true) }
    // Track whether the AndroidView player surface should still be in the
    // composition. We tear it down BEFORE invoking onBack so the navigation
    // transition doesn't catch a stale frame from the surface.
    var playerAttached by remember { mutableStateOf(true) }

    LaunchedEffect(type, streamId, ext) {
        player.setMediaItem(LiveboxPlayer.mediaItem(vm.streamUrl(type, streamId, ext), isLive))
        player.prepare()
        if (isLive) {
            // Snap to live edge — equivalent of React's seek-to-end on live load.
            player.seekToDefaultPosition()
        } else {
            val resumeAt = vm.resumePosition(type, streamId)
            if (resumeAt > 5_000) player.seekTo(resumeAt)
        }
        player.play()
    }

    DisposableEffect(Unit) {
        onDispose {
            val pos = player.currentPosition
            val dur = player.duration.takeIf { it > 0 } ?: 0L
            vm.savePosition(type, streamId, pos, dur)
            player.release()
        }
    }

    val handleBack: () -> Unit = {
        runCatching {
            player.stop()
            player.clearVideoSurface()
        }
        playerAttached = false
        onBack()
    }

    BackHandler(onBack = handleBack)

    // ── Fullscreen + keep-screen-on while in player ──
    DisposableEffect(Unit) {
        val activity = context.findActivity()
        val window = activity?.window
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, window.decorView)
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        onDispose {
            if (window != null) {
                WindowCompat.setDecorFitsSystemWindows(window, true)
                val controller = WindowInsetsControllerCompat(window, window.decorView)
                controller.show(WindowInsetsCompat.Type.systemBars())
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {

        // ── Player surface (removed from composition before back nav) ──
        if (playerAttached) AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = true
                    controllerAutoShow = true
                    controllerHideOnTouch = true
                    setShowNextButton(false)
                    setShowPreviousButton(false)
                    // Built-in subtitle button (only for VOD/episodes — live has no subs).
                    setShowSubtitleButton(!isLive)
                    setControllerVisibilityListener(
                        PlayerView.ControllerVisibilityListener { visibility ->
                            controlsVisible = visibility == View.VISIBLE
                        }
                    )
                    if (isLive) {
                        // Hide rewind/fast-forward and the seek bar for live.
                        setShowFastForwardButton(false)
                        setShowRewindButton(false)
                        findViewById<View>(androidx.media3.ui.R.id.exo_progress)
                            ?.visibility = View.GONE
                        findViewById<View>(androidx.media3.ui.R.id.exo_position)
                            ?.visibility = View.GONE
                        findViewById<View>(androidx.media3.ui.R.id.exo_duration)
                            ?.visibility = View.GONE
                    }
                }
            },
        )

        // ── Top-left back chip (synced with controller visibility) ──
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.TopStart),
        ) {
            BackChip(
                onBack = handleBack,
                modifier = Modifier.padding(12.dp),
            )
        }

        // ── Top-right LIVE badge (live only, synced with controls) ──
        if (isLive) {
            AnimatedVisibility(
                visible = controlsVisible,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.TopEnd),
            ) {
                LiveBadge(modifier = Modifier.padding(12.dp))
            }
        }
    }
}

/* ───────── Overlays ───────── */

@Composable
private fun LiveBadge(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(LbColors.Accent)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(Color.White),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            "LIVE",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 1.sp,
        )
    }
}

private fun Context.findActivity(): Activity? {
    var ctx: Context = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}
