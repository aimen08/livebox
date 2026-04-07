package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.livebox.tv.data.LiveCategory
import com.livebox.tv.data.LiveChannel
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LiveState(
    val loading: Boolean = true,
    val categories: List<LiveCategory> = emptyList(),
    val channels: List<LiveChannel> = emptyList(),
    val selectedCategoryId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class LiveViewModel @Inject constructor(
    private val repo: XtreamRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(LiveState())
    val state: StateFlow<LiveState> = _state.asStateFlow()

    init { load() }

    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        runCatching {
            val cats = repo.liveCategories()
            val first = cats.firstOrNull()?.categoryId
            val channels = repo.liveChannels(first)
            _state.update {
                it.copy(loading = false, categories = cats, channels = channels, selectedCategoryId = first)
            }
        }.onFailure { e ->
            _state.update { it.copy(loading = false, error = e.message) }
        }
    }

    fun selectCategory(id: String) = viewModelScope.launch {
        _state.update { it.copy(selectedCategoryId = id, loading = true) }
        runCatching { repo.liveChannels(id) }
            .onSuccess { ch -> _state.update { it.copy(loading = false, channels = ch) } }
            .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
    }
}

@Composable
fun LiveContent(
    onPlay: (streamId: Long) -> Unit,
    vm: LiveViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    var search by rememberSaveable { mutableStateOf("") }
    val compact = isCompactWidth()

    val activeCategoryName = state.categories
        .firstOrNull { it.categoryId == state.selectedCategoryId }
        ?.categoryName ?: "Channels"

    val filtered = remember(state.channels, search) {
        if (search.isBlank()) state.channels
        else state.channels.filter { it.name.contains(search, ignoreCase = true) }
    }

    if (compact) {
        // ── Phone: stacked ──
        Column(Modifier.fillMaxSize().background(LbColors.Bg)) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                Text(
                    text = activeCategoryName,
                    color = LbColors.Text,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = "${filtered.size} channels",
                    color = LbColors.Text3,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(10.dp))
                SearchBar(value = search, onValueChange = { search = it })
            }
            CategoryChipRow(
                categories = state.categories,
                selectedId = state.selectedCategoryId,
                onSelect = vm::selectCategory,
            )
            Spacer(Modifier.height(8.dp))
            ChannelsListBody(
                loading = state.loading,
                error = state.error,
                channels = filtered,
                onPlay = onPlay,
                horizontalPadding = 8.dp,
            )
        }
    } else {
        // ── Tablet / TV: sidebar + panel ──
        Row(Modifier.fillMaxSize().background(LbColors.Bg)) {
            GroupsPanel(
                categories = state.categories,
                selectedId = state.selectedCategoryId,
                onSelect = vm::selectCategory,
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = 24.dp, end = 32.dp, top = 24.dp, bottom = 16.dp),
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = activeCategoryName,
                        color = LbColors.Text,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = "${filtered.size} channels",
                        color = LbColors.Text3,
                        fontSize = 13.sp,
                    )
                }
                Spacer(Modifier.height(16.dp))
                SearchBar(value = search, onValueChange = { search = it })
                Spacer(Modifier.height(8.dp))
                ChannelsListBody(
                    loading = state.loading,
                    error = state.error,
                    channels = filtered,
                    onPlay = onPlay,
                    horizontalPadding = 0.dp,
                )
            }
        }
    }
}

/* ───────── Channel list body (shared) ───────── */

@Composable
private fun ChannelsListBody(
    loading: Boolean,
    error: String?,
    channels: List<LiveChannel>,
    onPlay: (Long) -> Unit,
    horizontalPadding: androidx.compose.ui.unit.Dp,
) {
    when {
        loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
            Text("Loading…", color = LbColors.Text3)
        }
        error != null -> Box(Modifier.fillMaxSize(), Alignment.Center) {
            Text("Error: $error", color = LbColors.AccentBright)
        }
        channels.isEmpty() -> Box(Modifier.fillMaxSize(), Alignment.Center) {
            Text("No channels", color = LbColors.Text3)
        }
        else -> LazyColumn(
            verticalArrangement = Arrangement.spacedBy(2.dp),
            contentPadding = PaddingValues(horizontal = horizontalPadding),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(channels, key = { it.streamId }) { ch ->
                ChannelRow(ch, onClick = { onPlay(ch.streamId) })
            }
        }
    }
}

/* ───────── Group sidebar (tablet/TV) ───────── */

@Composable
private fun GroupsPanel(
    categories: List<LiveCategory>,
    selectedId: String?,
    onSelect: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .width(260.dp)
            .fillMaxHeight()
            .background(LbColors.Surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, end = 16.dp, top = 24.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "GROUPS",
                color = LbColors.Text,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                modifier = Modifier.weight(1f),
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .background(LbColors.Surface2)
                    .padding(horizontal = 8.dp, vertical = 2.dp),
            ) {
                Text("${categories.size}", color = LbColors.Text3, fontSize = 11.sp)
            }
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            items(categories, key = { it.categoryId }) { cat ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (cat.categoryId == selectedId) LbColors.AccentDim else Color.Transparent)
                        .clickable { onSelect(cat.categoryId) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = cat.categoryName,
                        color = if (cat.categoryId == selectedId) LbColors.Accent else LbColors.Text2,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
    }
}

/* ───────── Category chip row (compact / phone) ───────── */

@Composable
fun CategoryChipRow(
    categories: List<LiveCategory>,
    selectedId: String?,
    onSelect: (String) -> Unit,
) {
    LazyRow(
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(categories, key = { it.categoryId }) { cat ->
            val selected = cat.categoryId == selectedId
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (selected) LbColors.Accent else LbColors.Surface2)
                    .clickable { onSelect(cat.categoryId) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(
                    text = cat.categoryName,
                    color = if (selected) Color.White else LbColors.Text2,
                    fontSize = 12.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                    maxLines = 1,
                )
            }
        }
    }
}

/* ───────── Search bar ───────── */

@Composable
private fun SearchBar(value: String, onValueChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(LbColors.Surface)
            .border(width = 1.dp, color = LbColors.Border, shape = RoundedCornerShape(8.dp))
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Filled.Search,
            contentDescription = null,
            tint = LbColors.Text3,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(10.dp))
        Box(modifier = Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text("Search channels...", color = LbColors.Text3, fontSize = 14.sp)
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = TextStyle(color = LbColors.Text, fontSize = 14.sp),
                cursorBrush = SolidColor(LbColors.Accent),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        if (value.isNotEmpty()) {
            Icon(
                Icons.Filled.Close,
                contentDescription = "Clear",
                tint = LbColors.Text3,
                modifier = Modifier
                    .size(18.dp)
                    .clickable { onValueChange("") },
            )
        }
    }
}

/* ───────── Channel row ───────── */

@Composable
private fun ChannelRow(channel: LiveChannel, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(LbColors.Surface2),
            contentAlignment = Alignment.Center,
        ) {
            if (!channel.streamIcon.isNullOrBlank()) {
                AsyncImage(
                    model = channel.streamIcon,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Text(
                    text = channel.name.firstOrNull()?.uppercase() ?: "?",
                    color = LbColors.Text3,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Text(
            text = channel.name,
            color = LbColors.Text,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
    }
}

/* ───────── Reused by Movies / Series / Favorites ───────── */

/**
 * Adaptive category-aware layout used by Movies and Series tabs.
 * Compact: title + horizontal chip row + content.
 * Expanded: groups sidebar + content panel.
 */
@Composable
fun CategorySidebarLayout(
    categories: List<LiveCategory>,
    selectedCategoryId: String?,
    onCategoryClick: (String) -> Unit,
    loading: Boolean,
    error: String?,
    title: String = "Browse",
    content: @Composable () -> Unit,
) {
    val compact = isCompactWidth()

    if (compact) {
        Column(Modifier.fillMaxSize().background(LbColors.Bg)) {
            Text(
                text = title,
                color = LbColors.Text,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            CategoryChipRow(
                categories = categories,
                selectedId = selectedCategoryId,
                onSelect = onCategoryClick,
            )
            Spacer(Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
            ) {
                when {
                    loading -> Text("Loading…", color = LbColors.Text3,
                        modifier = Modifier.align(Alignment.Center))
                    error != null -> Text("Error: $error", color = LbColors.AccentBright,
                        modifier = Modifier.align(Alignment.Center))
                    else -> content()
                }
            }
        }
    } else {
        Row(Modifier.fillMaxSize()) {
            GroupsPanel(
                categories = categories,
                selectedId = selectedCategoryId,
                onSelect = onCategoryClick,
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(start = 24.dp, end = 32.dp, top = 24.dp, bottom = 16.dp),
            ) {
                Text(
                    text = title,
                    color = LbColors.Text,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(16.dp))
                Box(Modifier.fillMaxSize()) {
                    when {
                        loading -> Text("Loading…", color = LbColors.Text3,
                            modifier = Modifier.align(Alignment.Center))
                        error != null -> Text("Error: $error", color = LbColors.AccentBright,
                            modifier = Modifier.align(Alignment.Center))
                        else -> content()
                    }
                }
            }
        }
    }
}
