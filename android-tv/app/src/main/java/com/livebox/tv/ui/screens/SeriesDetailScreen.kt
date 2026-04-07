package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import com.livebox.tv.data.Episode
import com.livebox.tv.data.FavoritesRepository
import com.livebox.tv.data.SeriesInfo
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

data class SeriesDetailState(
    val loading: Boolean = true,
    val info: SeriesInfo? = null,
    val selectedSeason: String? = null,
    val error: String? = null,
)

@HiltViewModel
class SeriesDetailViewModel @Inject constructor(
    private val repo: XtreamRepository,
    private val favorites: FavoritesRepository,
    private val history: WatchHistoryRepository,
    savedState: SavedStateHandle,
) : ViewModel() {

    val seriesId: Long = checkNotNull(savedState["seriesId"]) {
        "seriesId nav arg required"
    }

    private val _state = MutableStateFlow(SeriesDetailState())
    val state: StateFlow<SeriesDetailState> = _state.asStateFlow()

    val isFavorite: StateFlow<Boolean> = favorites
        .isFavorite(StreamType.SERIES, seriesId)
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    init {
        viewModelScope.launch {
            runCatching { repo.seriesInfo(seriesId) }
                .onSuccess { info ->
                    val firstSeason = info.episodes.keys.sortedBy { it.toIntOrNull() ?: 0 }
                        .firstOrNull()
                    _state.value = SeriesDetailState(false, info, firstSeason, null)
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(loading = false, error = e.message)
                }
        }
    }

    fun selectSeason(season: String) {
        _state.value = _state.value.copy(selectedSeason = season)
    }

    fun toggleFavorite() = viewModelScope.launch {
        val info = _state.value.info ?: return@launch
        favorites.toggle(
            type = StreamType.SERIES,
            id = seriesId,
            name = info.info?.name ?: "Series #$seriesId",
            imageUrl = info.info?.cover,
            ext = null,
            currentlyFavorite = isFavorite.value,
        )
    }

    fun touchAndPlayEpisode(episode: Episode, onPlay: (id: Long, ext: String) -> Unit) =
        viewModelScope.launch {
            val id = episode.id.toLongOrNull() ?: return@launch
            history.touch(
                type = StreamType.EPISODE,
                id = id,
                name = "Ep ${episode.episodeNum} — ${episode.title.orEmpty()}",
                imageUrl = episode.info?.movieImage,
                ext = episode.containerExtension,
            )
            onPlay(id, episode.containerExtension)
        }
}

@Composable
fun SeriesDetailScreen(
    onPlayEpisode: (episodeId: Long, ext: String) -> Unit,
    onBack: () -> Unit,
    vm: SeriesDetailViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val isFav by vm.isFavorite.collectAsState()
    val compact = isCompactWidth()

    Box(Modifier.fillMaxSize().background(LbColors.Bg)) {
        when {
            state.loading -> Text("Loading…",
                modifier = Modifier.align(Alignment.Center), color = LbColors.Text3)
            state.error != null -> Text("Error: ${state.error}",
                modifier = Modifier.align(Alignment.Center), color = LbColors.AccentBright)
            state.info != null -> {
                val info = state.info!!
                if (compact) {
                    SeriesBodyCompact(info, state.selectedSeason, isFav, vm) { ep ->
                        vm.touchAndPlayEpisode(ep, onPlayEpisode)
                    }
                } else {
                    SeriesBodyExpanded(info, state.selectedSeason, isFav, vm) { ep ->
                        vm.touchAndPlayEpisode(ep, onPlayEpisode)
                    }
                }
            }
        }
        BackChip(
            onBack = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(if (compact) 12.dp else 24.dp),
        )
    }
}

/* ───────── Compact (phone) ───────── */

@Composable
private fun SeriesBodyCompact(
    info: SeriesInfo,
    selectedSeason: String?,
    isFavorite: Boolean,
    vm: SeriesDetailViewModel,
    onPlayEpisode: (Episode) -> Unit,
) {
    val meta = info.info
    val seasonKeys = info.episodes.keys.sortedBy { it.toIntOrNull() ?: 0 }
    val episodes = selectedSeason?.let { info.episodes[it] }.orEmpty()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        // Hero cover
        AsyncImage(
            model = meta?.cover,
            contentDescription = meta?.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(280.dp)
                .background(LbColors.Surface2),
        )

        Column(Modifier.padding(16.dp)) {
            Text(
                text = meta?.name ?: "Series",
                color = LbColors.Text,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            listOfNotNull(
                meta?.genre?.takeIf { it.isNotBlank() },
                meta?.releaseDate?.takeIf { it.isNotBlank() },
                meta?.rating?.takeIf { it.isNotBlank() }?.let { "★ $it" },
            ).joinToString(" · ").takeIf { it.isNotEmpty() }?.let {
                Text(it, color = LbColors.Text3, fontSize = 12.sp)
            }
            if (!meta?.cast.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text("Cast: ${meta.cast}", color = LbColors.Text3, fontSize = 12.sp,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            if (!meta?.plot.isNullOrBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(meta.plot.orEmpty(), color = LbColors.Text2, fontSize = 13.sp)
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = vm::toggleFavorite,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isFavorite) LbColors.Accent else LbColors.Surface2,
                    contentColor = if (isFavorite) Color.White else LbColors.Text,
                ),
            ) {
                Text(if (isFavorite) "★ Favorited" else "☆ Favorite")
            }
        }

        // Season chip row
        Spacer(Modifier.height(4.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(seasonKeys, key = { it }) { season ->
                val sel = season == selectedSeason
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(if (sel) LbColors.Accent else LbColors.Surface2)
                        .clickable { vm.selectSeason(season) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Text(
                        text = "Season $season",
                        color = if (sel) Color.White else LbColors.Text2,
                        fontSize = 12.sp,
                        fontWeight = if (sel) FontWeight.SemiBold else FontWeight.Normal,
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        // Episodes as horizontal row of cards
        if (episodes.isEmpty()) {
            Text("No episodes",
                modifier = Modifier.padding(16.dp),
                color = LbColors.Text3)
        } else {
            Column(modifier = Modifier.padding(horizontal = 12.dp)) {
                episodes.forEach { ep ->
                    EpisodeRowCompact(ep, onClick = { onPlayEpisode(ep) })
                    Spacer(Modifier.height(8.dp))
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun EpisodeRowCompact(episode: Episode, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(LbColors.Surface)
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = episode.info?.movieImage,
            contentDescription = episode.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(120.dp)
                .height(68.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(LbColors.Surface2),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = "Ep ${episode.episodeNum}",
                color = LbColors.Text3,
                fontSize = 11.sp,
            )
            Text(
                text = episode.title.orEmpty(),
                color = LbColors.Text,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/* ───────── Expanded (tablet / TV) ───────── */

@Composable
private fun SeriesBodyExpanded(
    info: SeriesInfo,
    selectedSeason: String?,
    isFavorite: Boolean,
    vm: SeriesDetailViewModel,
    onPlayEpisode: (Episode) -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        SeriesHeader(info = info, isFavorite = isFavorite, onToggleFavorite = vm::toggleFavorite)
        Row(Modifier.fillMaxSize().weight(1f)) {
            LazyColumn(
                modifier = Modifier
                    .width(220.dp)
                    .fillMaxHeight()
                    .background(LbColors.Surface)
                    .padding(horizontal = 8.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                val seasonKeys = info.episodes.keys.sortedBy { it.toIntOrNull() ?: 0 }
                items(seasonKeys, key = { it }) { season ->
                    val sel = season == selectedSeason
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (sel) LbColors.AccentDim else Color.Transparent)
                            .clickable { vm.selectSeason(season) }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        Text(
                            text = "Season $season",
                            color = if (sel) LbColors.Accent else LbColors.Text2,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
            Box(Modifier.weight(1f).fillMaxHeight().padding(24.dp)) {
                val episodes = selectedSeason?.let { info.episodes[it] }.orEmpty()
                if (episodes.isEmpty()) {
                    Text("No episodes",
                        modifier = Modifier.align(Alignment.Center), color = LbColors.Text3)
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(minSize = 240.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        items(episodes, key = { it.id }) { ep ->
                            EpisodeCardExpanded(ep, onClick = { onPlayEpisode(ep) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SeriesHeader(
    info: SeriesInfo,
    isFavorite: Boolean,
    onToggleFavorite: () -> Unit,
) {
    val meta = info.info
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(LbColors.Surface)
            .padding(24.dp),
    ) {
        AsyncImage(
            model = meta?.cover,
            contentDescription = meta?.name,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(160.dp)
                .height(240.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(LbColors.Surface2),
        )
        Spacer(Modifier.width(24.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = meta?.name ?: "Series",
                color = LbColors.Text,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
            )
            Spacer(Modifier.height(4.dp))
            listOfNotNull(
                meta?.genre?.takeIf { it.isNotBlank() },
                meta?.releaseDate?.takeIf { it.isNotBlank() },
                meta?.rating?.takeIf { it.isNotBlank() }?.let { "★ $it" },
            ).joinToString(" · ").takeIf { it.isNotEmpty() }?.let {
                Text(it, color = LbColors.Text3, fontSize = 12.sp)
            }
            if (!meta?.cast.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text("Cast: ${meta.cast}", color = LbColors.Text3, fontSize = 12.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(8.dp))
            Text(meta?.plot.orEmpty(), color = LbColors.Text2, fontSize = 13.sp,
                maxLines = 4, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onToggleFavorite,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isFavorite) LbColors.Accent else LbColors.Surface2,
                    contentColor = if (isFavorite) Color.White else LbColors.Text,
                ),
            ) {
                Text(if (isFavorite) "★ Favorited" else "☆ Favorite")
            }
        }
    }
}

@Composable
private fun EpisodeCardExpanded(episode: Episode, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(240.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(LbColors.Surface)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = episode.info?.movieImage,
            contentDescription = episode.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(135.dp)
                .background(LbColors.Surface2),
        )
        Text(
            text = "Ep ${episode.episodeNum}: ${episode.title.orEmpty()}",
            modifier = Modifier.padding(8.dp),
            color = LbColors.Text,
            fontSize = 12.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
