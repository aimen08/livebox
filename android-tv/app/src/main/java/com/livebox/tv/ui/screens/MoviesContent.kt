package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Alignment
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.livebox.tv.data.LiveCategory
import com.livebox.tv.data.VodItem
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MoviesState(
    val loading: Boolean = true,
    val categories: List<LiveCategory> = emptyList(),
    val items: List<VodItem> = emptyList(),
    val selectedCategoryId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class MoviesViewModel @Inject constructor(
    private val repo: XtreamRepository,
) : ViewModel() {

    private val selectedCategory = MutableStateFlow<String?>(null)
    private val errorFlow = MutableStateFlow<String?>(null)

    val state: StateFlow<MoviesState> = combine(
        repo.cachedSnapshot,
        selectedCategory,
        errorFlow,
    ) { snap, selected, error ->
        if (snap == null) {
            MoviesState(loading = true, error = error)
        } else {
            val activeId = selected ?: snap.vodCategories.firstOrNull()?.categoryId
            val items = if (activeId == null) snap.vodItems
            else snap.vodItems.filter { it.categoryId == activeId }
            MoviesState(
                loading = false,
                categories = snap.vodCategories,
                items = items,
                selectedCategoryId = activeId,
                error = error,
            )
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, MoviesState())

    init {
        if (repo.cachedSnapshot.value == null) refresh()
    }

    fun refresh() = viewModelScope.launch {
        errorFlow.value = null
        runCatching { repo.refreshAll() }
            .onFailure { e -> errorFlow.value = e.message }
    }

    fun selectCategory(id: String) {
        selectedCategory.value = id
    }
}

@Composable
fun MoviesContent(
    onOpenMovie: (streamId: Long) -> Unit,
    vm: MoviesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    var search by rememberSaveable { mutableStateOf("") }
    val activeName = state.categories
        .firstOrNull { it.categoryId == state.selectedCategoryId }
        ?.categoryName ?: "Movies"

    val filtered = remember(state.items, search) {
        if (search.isBlank()) state.items
        else state.items.filter { it.name.contains(search, ignoreCase = true) }
    }

    val minSize = if (isCompactWidth()) 120.dp else 180.dp
    CategorySidebarLayout(
        categories = state.categories,
        selectedCategoryId = state.selectedCategoryId,
        onCategoryClick = vm::selectCategory,
        loading = state.loading,
        error = state.error,
        title = activeName,
    ) {
        Column(Modifier.fillMaxSize()) {
            SearchBar(
                value = search,
                onValueChange = { search = it },
                placeholder = "Search movies...",
            )
            Spacer(Modifier.height(12.dp))
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = minSize),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) {
                items(filtered, key = { it.streamId }) { item ->
                    PosterCard(
                        title = item.name,
                        imageUrl = item.streamIcon,
                        onClick = { onOpenMovie(item.streamId) },
                    )
                }
            }
        }
    }
}

/**
 * Poster card used by Movies, Series, and Favorites grids. Fills its grid cell
 * width and uses a 2:3 aspect ratio for the image (standard movie poster).
 */
@Composable
fun PosterCard(
    title: String,
    imageUrl: String?,
    onClick: () -> Unit,
    badge: String? = null,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(LbColors.Surface)
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f),
        ) {
            AsyncImage(
                model = imageUrl,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().background(LbColors.Surface2),
            )
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(LbColors.Accent)
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(badge, color = androidx.compose.ui.graphics.Color.White,
                        fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        Text(
            text = title,
            modifier = Modifier.padding(8.dp),
            color = LbColors.Text,
            fontSize = 12.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
