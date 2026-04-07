package com.livebox.tv.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.livebox.tv.data.LiveCategory
import com.livebox.tv.data.SeriesItem
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SeriesState(
    val loading: Boolean = true,
    val categories: List<LiveCategory> = emptyList(),
    val items: List<SeriesItem> = emptyList(),
    val selectedCategoryId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class SeriesViewModel @Inject constructor(
    private val repo: XtreamRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(SeriesState())
    val state: StateFlow<SeriesState> = _state.asStateFlow()

    init { load() }

    fun load() = viewModelScope.launch {
        _state.value = _state.value.copy(loading = true, error = null)
        runCatching {
            val cats = repo.seriesCategories()
            val first = cats.firstOrNull()?.categoryId
            val items = repo.series(first)
            _state.value = SeriesState(false, cats, items, first, null)
        }.onFailure { e ->
            _state.value = _state.value.copy(loading = false, error = e.message)
        }
    }

    fun selectCategory(id: String) = viewModelScope.launch {
        _state.value = _state.value.copy(selectedCategoryId = id, loading = true)
        runCatching { repo.series(id) }
            .onSuccess { _state.value = _state.value.copy(loading = false, items = it) }
            .onFailure { _state.value = _state.value.copy(loading = false, error = it.message) }
    }
}

@Composable
fun SeriesContent(
    onOpenSeries: (seriesId: Long) -> Unit,
    vm: SeriesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val activeName = state.categories
        .firstOrNull { it.categoryId == state.selectedCategoryId }
        ?.categoryName ?: "Series"

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
            items(state.items, key = { it.seriesId }) { show ->
                PosterCard(
                    title = show.name,
                    imageUrl = show.cover,
                    onClick = { onOpenSeries(show.seriesId) },
                )
            }
        }
    }
}
