package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.livebox.tv.data.FavoritesRepository
import com.livebox.tv.data.db.FavoriteEntity
import com.livebox.tv.data.db.StreamType
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class FavoritesActions(
    val onPlayLive: (Long) -> Unit,
    val onOpenMovie: (Long) -> Unit,
    val onOpenSeries: (Long) -> Unit,
)

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    repo: FavoritesRepository,
) : ViewModel() {
    val favorites: StateFlow<List<FavoriteEntity>> = repo.observeAll()
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())
}

@Composable
fun FavoritesContent(
    actions: FavoritesActions,
    vm: FavoritesViewModel = hiltViewModel(),
) {
    val favs by vm.favorites.collectAsState()

    val compact = isCompactWidth()
    val minSize = if (compact) 120.dp else 180.dp
    val horizontalPadding = if (compact) 16.dp else 32.dp

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LbColors.Bg)
            .padding(start = horizontalPadding, end = horizontalPadding, top = if (compact) 16.dp else 24.dp, bottom = 16.dp),
    ) {
        Text(
            text = "Favorites",
            color = LbColors.Text,
            fontSize = if (compact) 22.sp else 28.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
        )
        Spacer(Modifier.height(16.dp))

        if (favs.isEmpty()) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text(
                    "No favorites yet — open any movie or series and tap ☆ Favorite",
                    color = LbColors.Text3,
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = minSize),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(favs, key = { "${it.type}/${it.id}" }) { fav ->
                    PosterCard(
                        title = fav.name,
                        imageUrl = fav.imageUrl,
                        badge = fav.type.uppercase(),
                        onClick = {
                            when (fav.type) {
                                StreamType.LIVE -> actions.onPlayLive(fav.id)
                                StreamType.VOD -> actions.onOpenMovie(fav.id)
                                StreamType.SERIES -> actions.onOpenSeries(fav.id)
                            }
                        },
                    )
                }
            }
        }
    }
}
