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
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
    private val _state = MutableStateFlow(MoviesState())
    val state: StateFlow<MoviesState> = _state.asStateFlow()

    init { load() }

    fun load() = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        runCatching {
            val cats = repo.vodCategories()
            val first = cats.firstOrNull()?.categoryId
            val items = repo.vodItems(first)
            _state.value = MoviesState(false, cats, items, first, null)
        }.onFailure { e ->
            _state.value = _state.value.copy(loading = false, error = e.message)
        }
    }

    fun selectCategory(id: String) = viewModelScope.launch {
        _state.value = _state.value.copy(selectedCategoryId = id, loading = true)
        runCatching { repo.vodItems(id) }
            .onSuccess { _state.value = _state.value.copy(loading = false, items = it) }
            .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
    }
}

@Composable
fun MoviesContent(
    onOpenMovie: (streamId: Long) -> Unit,
    vm: MoviesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val activeName = state.categories
        .firstOrNull { it.categoryId == state.selectedCategoryId }
        ?.categoryName ?: "Movies"

    val minSize = if (isCompactWidth()) 120.dp else 180.dp
    CategorySidebarLayout(
        categories = state.categories,
        selectedCategoryId = state.selectedCategoryId,
        onCategoryClick = vm::selectCategory,
        loading = state.loading,
        error = state.error,
        title = activeName,
    ) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = minSize),
            contentPadding = PaddingValues(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(state.items, key = { it.streamId }) { item ->
                PosterCard(
                    title = item.name,
                    imageUrl = item.streamIcon,
                    onClick = { onOpenMovie(item.streamId) },
                )
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
