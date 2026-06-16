package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.LiveTv
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.livebox.tv.data.XtreamCredentials
import com.livebox.tv.ui.AppViewModel
import com.livebox.tv.ui.SignInState
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth

/** Optional pre-filled URL on the modal (leave blank — supply your own playlist). */
private const val DEFAULT_URL = ""

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    vm: AppViewModel = hiltViewModel(),
) {
    var showUrlModal by remember { mutableStateOf(false) }
    val compact = isCompactWidth()
    val signInState by vm.signInState.collectAsState()

    // ── Welcome page (matches React HomePage's WelcomeLogo + welcome-page) ──
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LbColors.Bg)
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = if (compact) 24.dp else 64.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(if (compact) 32.dp else 64.dp))

            HeroLogo()

            Spacer(Modifier.height(20.dp))
            Text(
                text = "LiveBox",
                color = LbColors.Text,
                fontSize = if (compact) 36.sp else 48.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Your all-in-one streaming player for Live TV, Movies & Series",
                color = LbColors.Text3,
                fontSize = 14.sp,
            )

            Spacer(Modifier.height(32.dp))
            Button(
                onClick = { showUrlModal = true },
                colors = ButtonDefaults.buttonColors(
                    containerColor = LbColors.Accent,
                    contentColor = Color.White,
                ),
                modifier = Modifier
                    .then(if (compact) Modifier.fillMaxWidth() else Modifier)
                    .heightIn(min = 52.dp),
            ) {
                Icon(Icons.Filled.Link, contentDescription = null,
                    modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Add Playlist URL", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(Modifier.height(40.dp))

            // ── Feature cards (matches React .welcome-features) ──
            FeatureCard(
                icon = Icons.Filled.LiveTv,
                title = "Live TV",
                desc = "Watch thousands of live channels from around the world",
            )
            Spacer(Modifier.height(12.dp))
            FeatureCard(
                icon = Icons.Filled.Movie,
                title = "Movies",
                desc = "Browse and stream movies on demand with subtitles",
            )
            Spacer(Modifier.height(12.dp))
            FeatureCard(
                icon = Icons.Filled.Tv,
                title = "Series",
                desc = "Binge your favorite shows with full season support",
            )

            Spacer(Modifier.height(24.dp))
            Text(
                text = "Supports M3U playlists and Xtream Codes API",
                color = LbColors.Text3,
                fontSize = 11.sp,
            )
            Spacer(Modifier.height(24.dp))
        }
    }

    // ── URL modal ──
    if (showUrlModal) {
        UrlModal(
            initialUrl = DEFAULT_URL,
            onDismiss = { showUrlModal = false },
            onSubmit = { creds ->
                showUrlModal = false
                vm.signIn(creds, onSignedIn)
            },
        )
    }

    // ── Loading overlay during signIn refresh ──
    if (signInState is SignInState.Loading) {
        LoadingOverlay(message = "Loading your library…")
    }

    // ── Error dialog ──
    val state = signInState
    if (state is SignInState.Error) {
        AlertDialog(
            onDismissRequest = { vm.resetSignInState() },
            containerColor = LbColors.Surface,
            titleContentColor = LbColors.Text,
            textContentColor = LbColors.Text2,
            title = { Text("Couldn't connect") },
            text = { Text(state.message) },
            confirmButton = {
                TextButton(onClick = {
                    vm.resetSignInState()
                    showUrlModal = true
                }) { Text("Try again", color = LbColors.Accent) }
            },
            dismissButton = {
                TextButton(onClick = { vm.resetSignInState() }) {
                    Text("Cancel", color = LbColors.Text3)
                }
            },
        )
    }
}

/* ───────── Loading overlay ───────── */

@Composable
private fun LoadingOverlay(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xCC000000)),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = LbColors.Surface,
            tonalElevation = 8.dp,
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 32.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(
                    color = LbColors.Accent,
                    strokeWidth = 3.dp,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = message,
                    color = LbColors.Text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Fetching channels, movies and series…",
                    color = LbColors.Text3,
                    fontSize = 12.sp,
                )
            }
        }
    }
}

/* ───────── Hero logo ───────── */

@Composable
private fun HeroLogo() {
    val gradient = Brush.linearGradient(
        listOf(LbColors.Accent, LbColors.AccentBright, LbColors.Accent),
    )
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(gradient),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(LbColors.Surface),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "LB",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
            )
        }
    }
}

/* ───────── Feature row ───────── */

@Composable
private fun FeatureCard(icon: ImageVector, title: String, desc: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 480.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(LbColors.Surface)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(LbColors.AccentDim),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = LbColors.Accent,
                modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = LbColors.Text, fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold)
            Text(desc, color = LbColors.Text3, fontSize = 12.sp)
        }
    }
}

/* ───────── URL modal ───────── */

@Composable
private fun UrlModal(
    initialUrl: String,
    onDismiss: () -> Unit,
    onSubmit: (XtreamCredentials) -> Unit,
) {
    var url by remember { mutableStateOf(initialUrl) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = LbColors.Surface,
        titleContentColor = LbColors.Text,
        textContentColor = LbColors.Text2,
        title = { Text("Open M3U URL") },
        text = {
            Column {
                Text(
                    "Paste your provider's get.php?username=…&password=… link",
                    color = LbColors.Text3,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it; error = null },
                    placeholder = { Text("https://example.com/get.php?username=…") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    isError = error != null,
                    supportingText = {
                        if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = LbColors.Accent,
                        cursorColor = LbColors.Accent,
                        focusedTextColor = LbColors.Text,
                        unfocusedTextColor = LbColors.Text,
                        focusedPlaceholderColor = LbColors.Text3,
                        unfocusedPlaceholderColor = LbColors.Text3,
                    ),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val creds = XtreamCredentials.parseM3uUrl(url)
                    if (creds == null) error =
                        "Couldn't parse URL — expected get.php?username=…&password=…"
                    else onSubmit(creds)
                },
                enabled = url.isNotBlank(),
            ) { Text("Load", color = LbColors.Accent, fontWeight = FontWeight.SemiBold) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = LbColors.Text3) }
        },
    )
}
