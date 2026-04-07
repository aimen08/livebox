package com.livebox.tv.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
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
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
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

    private val selectedCategory = MutableStateFlow<String?>(null)
    private val errorFlow = MutableStateFlow<String?>(null)

    val state: StateFlow<SeriesState> = combine(
        repo.cachedSnapshot,
        selectedCategory,
        errorFlow,
    ) { snap, selected, error ->
        if (snap == null) {
            SeriesState(loading = true, error = error)
        } else {
            val activeId = selected ?: snap.seriesCategories.firstOrNull()?.categoryId
            val items = if (activeId == null) snap.seriesItems
            else snap.seriesItems.filter { it.categoryId == activeId }
            SeriesState(
                loading = false,
                categories = snap.seriesCategories,
                items = items,
                selectedCategoryId = activeId,
                error = error,
            )
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, SeriesState())

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
fun SeriesContent(
    onOpenSeries: (seriesId: Long) -> Unit,
    vm: SeriesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    var search by rememberSaveable { mutableStateOf("") }
    val activeName = state.categories
        .firstOrNull { it.categoryId == state.selectedCategoryId }
        ?.categoryName ?: "Series"

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
                placeholder = "Search series...",
            )
            Spacer(Modifier.height(12.dp))
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = minSize),
                contentPadding = PaddingValues(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) {
                items(filtered, key = { it.seriesId }) { show ->
                    PosterCard(
                        title = show.name,
                        imageUrl = show.cover,
                        onClick = { onOpenSeries(show.seriesId) },
                    )
                }
            }
        }
    }
}
