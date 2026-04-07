package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.NavigationRailItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth

private data class NavTab(val label: String, val icon: ImageVector)

private val TABS = listOf(
    NavTab("Live", Icons.Filled.LiveTv),
    NavTab("Movies", Icons.Filled.Movie),
    NavTab("Series", Icons.Filled.Tv),
    NavTab("Favorites", Icons.Filled.Star),
)

@Composable
fun HomeScreen(
    onPlayLive: (streamId: Long) -> Unit,
    onOpenMovie: (streamId: Long) -> Unit,
    onOpenSeries: (seriesId: Long) -> Unit,
) {
    var selected by rememberSaveable { mutableStateOf(0) }
    val compact = isCompactWidth()

    val content: @Composable () -> Unit = {
        when (selected) {
            0 -> LiveContent(onPlay = onPlayLive)
            1 -> MoviesContent(onOpenMovie = onOpenMovie)
            2 -> SeriesContent(onOpenSeries = onOpenSeries)
            3 -> FavoritesContent(
                actions = FavoritesActions(
                    onPlayLive = onPlayLive,
                    onOpenMovie = onOpenMovie,
                    onOpenSeries = onOpenSeries,
                ),
            )
        }
    }

    if (compact) {
        // ── Phone: bottom NavigationBar ──
        Scaffold(
            containerColor = LbColors.Bg,
            bottomBar = {
                NavigationBar(containerColor = LbColors.Surface) {
                    TABS.forEachIndexed { i, tab ->
                        NavigationBarItem(
                            selected = i == selected,
                            onClick = { selected = i },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = LbColors.Accent,
                                selectedTextColor = LbColors.Accent,
                                unselectedIconColor = LbColors.Text3,
                                unselectedTextColor = LbColors.Text3,
                                indicatorColor = LbColors.AccentDim,
                            ),
                        )
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) { content() }
        }
    } else {
        // ── Tablet / TV: left NavigationRail ──
        Row(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            NavigationRail(
                containerColor = LbColors.Surface,
                modifier = Modifier.fillMaxHeight(),
                header = {
                    Spacer(Modifier.height(20.dp))
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(LbColors.Accent),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "LB",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                },
            ) {
                TABS.forEachIndexed { i, tab ->
                    NavigationRailItem(
                        selected = i == selected,
                        onClick = { selected = i },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, fontSize = 10.sp, maxLines = 1) },
                        colors = NavigationRailItemDefaults.colors(
                            selectedIconColor = LbColors.Accent,
                            selectedTextColor = LbColors.Accent,
                            unselectedIconColor = LbColors.Text3,
                            unselectedTextColor = LbColors.Text3,
                            indicatorColor = LbColors.AccentDim,
                        ),
                    )
                }
            }
            Box(Modifier.weight(1f).fillMaxHeight()) { content() }
        }
    }
}
