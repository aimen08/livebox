package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.livebox.tv.data.FavoritesRepository
import com.livebox.tv.data.VodInfoMeta
import com.livebox.tv.data.VodInfoResponse
import com.livebox.tv.data.VodMovieData
import com.livebox.tv.data.WatchHistoryRepository
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.data.db.StreamType
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MovieDetailState(
    val loading: Boolean = true,
    val info: VodInfoResponse? = null,
    val error: String? = null,
)

@HiltViewModel
class MovieDetailViewModel @Inject constructor(
    private val repo: XtreamRepository,
    private val favorites: FavoritesRepository,
    private val history: WatchHistoryRepository,
    savedState: SavedStateHandle,
) : ViewModel() {

    val streamId: Long = checkNotNull(savedState["streamId"]) { "streamId arg required" }

    private val _state = MutableStateFlow(MovieDetailState())
    val state: StateFlow<MovieDetailState> = _state.asStateFlow()

    val isFavorite: StateFlow<Boolean> = favorites
        .isFavorite(StreamType.VOD, streamId)
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    init {
        viewModelScope.launch {
            runCatching { repo.vodInfo(streamId) }
                .onSuccess { _state.value = MovieDetailState(false, it, null) }
                .onFailure { _state.value = MovieDetailState(false, null, it.message) }
        }
    }

    fun toggleFavorite() = viewModelScope.launch {
        val info = _state.value.info ?: return@launch
        val data = info.movieData ?: return@launch
        favorites.toggle(
            type = StreamType.VOD,
            id = streamId,
            name = data.name,
            imageUrl = info.info?.movieImage,
            ext = data.containerExtension,
            currentlyFavorite = isFavorite.value,
        )
    }

    fun touchHistoryAndPlay(onPlay: (id: Long, ext: String) -> Unit) = viewModelScope.launch {
        val info = _state.value.info ?: return@launch
        val data = info.movieData ?: return@launch
        history.touch(
            type = StreamType.VOD,
            id = streamId,
            name = data.name,
            imageUrl = info.info?.movieImage,
            ext = data.containerExtension,
        )
        onPlay(streamId, data.containerExtension)
    }
}

@Composable
fun MovieDetailScreen(
    onPlay: (streamId: Long, ext: String) -> Unit,
    onBack: () -> Unit,
    vm: MovieDetailViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val isFav by vm.isFavorite.collectAsState()
    val compact = isCompactWidth()

    Box(
        Modifier
            .fillMaxSize()
            .background(LbColors.Bg)
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        when {
            state.loading -> Text("Loading…",
                modifier = Modifier.align(Alignment.Center), color = LbColors.Text3)
            state.error != null -> Text("Error: ${state.error}",
                modifier = Modifier.align(Alignment.Center), color = LbColors.AccentBright)
            state.info != null -> {
                val info = state.info!!
                if (compact) {
                    MovieBodyCompact(info.info, info.movieData, isFav, vm, onPlay, onBack)
                } else {
                    MovieBodyExpanded(info.info, info.movieData, isFav, vm, onPlay)
                }
            }
        }

        // Back button (top-left, both layouts)
        BackChip(onBack = onBack, modifier = Modifier
            .align(Alignment.TopStart)
            .padding(if (compact) 12.dp else 24.dp))
    }
}

@Composable
private fun MovieBodyCompact(
    meta: VodInfoMeta?,
    data: VodMovieData?,
    isFav: Boolean,
    vm: MovieDetailViewModel,
    onPlay: (Long, String) -> Unit,
    onBack: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        // Hero poster
        AsyncImage(
            model = meta?.movieImage,
            contentDescription = data?.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(360.dp)
                .background(LbColors.Surface2),
        )
        Column(Modifier.padding(16.dp)) {
            Text(
                text = data?.name ?: "Untitled",
                color = LbColors.Text,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 28.sp,
            )
            Spacer(Modifier.height(6.dp))
            MetaLine("Genre", meta?.genre)
            MetaLine("Released", meta?.releasedate)
            MetaLine("Rating", meta?.rating?.let { "★ $it" })
            MetaLine("Director", meta?.director)
            MetaLine("Cast", meta?.cast)
            MetaLine("Duration", meta?.duration)

            if (!meta?.plot.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = meta.plot.orEmpty(),
                    color = LbColors.Text2,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                )
            }

            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = { vm.touchHistoryAndPlay(onPlay) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LbColors.Accent,
                        contentColor = Color.White,
                    ),
                ) { Text("▶  Play") }
                Button(
                    onClick = { vm.toggleFavorite() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFav) LbColors.Accent else LbColors.Surface2,
                        contentColor = if (isFav) Color.White else LbColors.Text,
                    ),
                ) {
                    Text(if (isFav) "★" else "☆")
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun MovieBodyExpanded(
    meta: VodInfoMeta?,
    data: VodMovieData?,
    isFav: Boolean,
    vm: MovieDetailViewModel,
    onPlay: (Long, String) -> Unit,
) {
    Row(
        Modifier
            .fillMaxSize()
            .padding(40.dp),
    ) {
        AsyncImage(
            model = meta?.movieImage,
            contentDescription = data?.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(280.dp)
                .height(420.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(LbColors.Surface2),
        )
        Spacer(Modifier.width(32.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = data?.name ?: "Untitled",
                color = LbColors.Text,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            MetaLine("Genre", meta?.genre)
            MetaLine("Released", meta?.releasedate)
            MetaLine("Rating", meta?.rating?.let { "★ $it" })
            MetaLine("Director", meta?.director)
            MetaLine("Cast", meta?.cast)
            MetaLine("Duration", meta?.duration)
            Spacer(Modifier.height(16.dp))
            Text(meta?.plot.orEmpty(), color = LbColors.Text2, fontSize = 14.sp)
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = { vm.touchHistoryAndPlay(onPlay) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LbColors.Accent,
                        contentColor = Color.White,
                    ),
                ) { Text("▶  Play") }
                Button(
                    onClick = { vm.toggleFavorite() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFav) LbColors.Accent else LbColors.Surface2,
                        contentColor = if (isFav) Color.White else LbColors.Text,
                    ),
                ) {
                    Text(if (isFav) "★ Favorited" else "☆ Favorite")
                }
            }
        }
    }
}

@Composable
private fun MetaLine(label: String, value: String?) {
    if (value.isNullOrBlank()) return
    Text("$label: $value", color = LbColors.Text3, fontSize = 12.sp)
}

@Composable
fun BackChip(onBack: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0x99000000))
            .clickable(onClick = onBack)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.ArrowBack,
                contentDescription = "Back",
                tint = Color.White,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(6.dp))
            Text("Back", color = Color.White, fontSize = 13.sp)
        }
    }
}
