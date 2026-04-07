package com.livebox.tv.ui.screens

import android.view.View
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.exoplayer.ExoPlayer
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

    // Track current Tracks (audio/text) so the picker dialogs stay live.
    var currentTracks by remember { mutableStateOf<Tracks?>(null) }
    var showAudioPicker by remember { mutableStateOf(false) }
    var showSubsPicker by remember { mutableStateOf(false) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onTracksChanged(tracks: Tracks) {
                currentTracks = tracks
            }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }

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

    BackHandler(onBack = onBack)

    Box(Modifier.fillMaxSize().background(Color.Black)) {

        // ── Player surface ──
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = true
                    controllerAutoShow = true
                    controllerHideOnTouch = true
                    setShowNextButton(false)
                    setShowPreviousButton(false)
                    setShowSubtitleButton(true)
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

        // ── Top-left back chip ──
        BackChip(
            onBack = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(12.dp),
        )

        // ── Top-right overlays ──
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isLive) {
                LiveBadge()
            } else {
                IconChip(
                    icon = Icons.Filled.GraphicEq,
                    label = "Audio",
                    onClick = { showAudioPicker = true },
                )
                IconChip(
                    icon = Icons.Filled.ClosedCaption,
                    label = "Subs",
                    onClick = { showSubsPicker = true },
                )
            }
        }
    }

    // ── Track picker dialogs (VOD only) ──
    if (showAudioPicker) {
        TrackPickerDialog(
            title = "Audio track",
            tracks = currentTracks,
            type = C.TRACK_TYPE_AUDIO,
            player = player,
            onDismiss = { showAudioPicker = false },
        )
    }
    if (showSubsPicker) {
        TrackPickerDialog(
            title = "Subtitles",
            tracks = currentTracks,
            type = C.TRACK_TYPE_TEXT,
            player = player,
            onDismiss = { showSubsPicker = false },
        )
    }
}

/* ───────── Overlays ───────── */

@Composable
private fun LiveBadge() {
    Row(
        modifier = Modifier
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

@Composable
private fun IconChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0x99000000))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, color = Color.White, fontSize = 13.sp)
    }
}

/* ───────── Track picker ───────── */

private data class PickerTrack(
    val groupIndex: Int,
    val trackIndex: Int,
    val mediaTrackGroup: androidx.media3.common.TrackGroup,
    val format: Format,
    val isSelected: Boolean,
)

@Composable
private fun TrackPickerDialog(
    title: String,
    tracks: Tracks?,
    type: Int,
    player: ExoPlayer,
    onDismiss: () -> Unit,
) {
    val items: List<PickerTrack> = remember(tracks) {
        val out = mutableListOf<PickerTrack>()
        tracks?.groups?.forEachIndexed { gi, group ->
            if (group.type == type) {
                for (i in 0 until group.length) {
                    out += PickerTrack(
                        groupIndex = gi,
                        trackIndex = i,
                        mediaTrackGroup = group.mediaTrackGroup,
                        format = group.getTrackFormat(i),
                        isSelected = group.isTrackSelected(i),
                    )
                }
            }
        }
        out
    }

    val isTextType = type == C.TRACK_TYPE_TEXT
    val textDisabled = player.trackSelectionParameters.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = LbColors.Surface,
        titleContentColor = LbColors.Text,
        textContentColor = LbColors.Text2,
        title = { Text(title) },
        text = {
            Column {
                if (items.isEmpty()) {
                    Text("No ${if (isTextType) "subtitle" else "audio"} tracks available",
                        color = LbColors.Text3)
                } else {
                    if (isTextType) {
                        TrackOptionRow(
                            label = "Off",
                            selected = textDisabled,
                            onClick = {
                                player.trackSelectionParameters = player.trackSelectionParameters
                                    .buildUpon()
                                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                                    .clearOverridesOfType(C.TRACK_TYPE_TEXT)
                                    .build()
                                onDismiss()
                            },
                        )
                    }
                    items.forEach { t ->
                        val labelText = formatLabel(t.format, isTextType)
                        TrackOptionRow(
                            label = labelText,
                            selected = t.isSelected && !(isTextType && textDisabled),
                            onClick = {
                                val builder = player.trackSelectionParameters.buildUpon()
                                    .setOverrideForType(
                                        TrackSelectionOverride(t.mediaTrackGroup, t.trackIndex)
                                    )
                                if (isTextType) builder.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                player.trackSelectionParameters = builder.build()
                                onDismiss()
                            },
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = LbColors.Accent)
            }
        },
    )
}

@Composable
private fun TrackOptionRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (selected) "● $label" else "○ $label",
            color = if (selected) LbColors.Accent else LbColors.Text,
            fontSize = 14.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

private fun formatLabel(format: Format, isTextType: Boolean): String {
    val lang = format.language?.takeIf { it.isNotBlank() && it != "und" }?.uppercase()
    val label = format.label?.takeIf { it.isNotBlank() }
    val parts = listOfNotNull(label, lang).distinct()
    if (parts.isNotEmpty()) return parts.joinToString(" · ")
    if (isTextType) return "Track ${format.id ?: "?"}"
    val codec = format.sampleMimeType?.substringAfterLast('/')?.uppercase()
    val channels = format.channelCount.takeIf { it > 0 }?.let { "${it}ch" }
    return listOfNotNull(codec, channels).joinToString(" ").ifBlank { "Track ${format.id ?: "?"}" }
}
