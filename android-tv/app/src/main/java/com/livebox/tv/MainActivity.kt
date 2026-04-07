package com.livebox.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.livebox.tv.data.CredentialsStore
import com.livebox.tv.ui.screens.HomeScreen
import com.livebox.tv.ui.screens.LoginScreen
import com.livebox.tv.ui.screens.MovieDetailScreen
import com.livebox.tv.ui.screens.PlayerScreen
import com.livebox.tv.ui.screens.SeriesDetailScreen
import com.livebox.tv.ui.theme.LiveboxTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var credentialsStore: CredentialsStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Sync-load creds before the first composition so the NavHost starts
        // on the right destination — no login flash on already-signed-in launches.
        val startDestination = if (credentialsStore.peek() != null) "home" else "login"

        setContent {
            LiveboxTheme {
                val nav = rememberNavController()

                NavHost(navController = nav, startDestination = startDestination) {
                    composable("login") {
                        LoginScreen(onSignedIn = {
                            nav.navigate("home") {
                                popUpTo("login") { inclusive = true }
                            }
                        })
                    }

                    composable("home") {
                        HomeScreen(
                            onPlayLive = { id ->
                                nav.navigate("player/live/$id/m3u8")
                            },
                            onOpenMovie = { id ->
                                nav.navigate("movie/$id")
                            },
                            onOpenSeries = { id ->
                                nav.navigate("series/$id")
                            },
                            onSignedOut = {
                                nav.navigate("login") {
                                    popUpTo("home") { inclusive = true }
                                }
                            },
                        )
                    }

                    composable(
                        route = "movie/{streamId}",
                        arguments = listOf(navArgument("streamId") { type = NavType.LongType }),
                    ) {
                        MovieDetailScreen(
                            onPlay = { id, ext ->
                                nav.navigate("player/vod/$id/$ext")
                            },
                            onBack = { nav.popBackStack() },
                        )
                    }

                    composable(
                        route = "series/{seriesId}",
                        arguments = listOf(navArgument("seriesId") { type = NavType.LongType }),
                    ) {
                        SeriesDetailScreen(
                            onPlayEpisode = { episodeId, ext ->
                                nav.navigate("player/episode/$episodeId/$ext")
                            },
                            onBack = { nav.popBackStack() },
                        )
                    }

                    composable(
                        route = "player/{type}/{id}/{ext}",
                        arguments = listOf(
                            navArgument("type") { type = NavType.StringType },
                            navArgument("id") { type = NavType.LongType },
                            navArgument("ext") { type = NavType.StringType },
                        ),
                    ) { backStack ->
                        val args = backStack.arguments!!
                        PlayerScreen(
                            type = args.getString("type")!!,
                            streamId = args.getLong("id"),
                            ext = args.getString("ext")!!,
                            onBack = { nav.popBackStack() },
                        )
                    }
                }
            }
        }
    }
}
