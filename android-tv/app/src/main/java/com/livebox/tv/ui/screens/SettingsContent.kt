package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.livebox.tv.data.CredentialsStore
import com.livebox.tv.data.FavoritesRepository
import com.livebox.tv.data.WatchHistoryRepository
import com.livebox.tv.data.XtreamRepository
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val creds: CredentialsStore,
    private val favorites: FavoritesRepository,
    private val history: WatchHistoryRepository,
    private val xtream: XtreamRepository,
) : ViewModel() {

    fun signOut(after: () -> Unit) = viewModelScope.launch {
        xtream.clearCache()
        creds.clear()
        after()
    }

    fun clearFavorites() = viewModelScope.launch { favorites.clearAll() }

    fun clearHistory() = viewModelScope.launch { history.clearAll() }

    fun clearAll(after: () -> Unit) = viewModelScope.launch {
        favorites.clearAll()
        history.clearAll()
        xtream.clearCache()
        creds.clear()
        after()
    }
}

private enum class ConfirmKind { SignOut, ClearFavs, ClearHistory, ClearAll }

@Composable
fun SettingsContent(
    onSignedOut: () -> Unit,
    vm: SettingsViewModel = hiltViewModel(),
) {
    val compact = isCompactWidth()
    var pendingConfirm by remember { mutableStateOf<ConfirmKind?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LbColors.Bg)
            .padding(
                horizontal = if (compact) 16.dp else 32.dp,
                vertical = if (compact) 16.dp else 24.dp,
            ),
    ) {
        Text(
            text = "Settings",
            color = LbColors.Text,
            fontSize = if (compact) 22.sp else 28.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
        )
        Spacer(Modifier.height(20.dp))

        SectionTitle("Library")
        SettingRow(
            icon = Icons.Filled.Star,
            label = "Clear favorites",
            description = "Remove all saved movies and series",
            onClick = { pendingConfirm = ConfirmKind.ClearFavs },
        )
        SettingRow(
            icon = Icons.Filled.History,
            label = "Clear watch history",
            description = "Forget all resume positions",
            onClick = { pendingConfirm = ConfirmKind.ClearHistory },
        )

        Spacer(Modifier.height(16.dp))
        SectionTitle("Account")
        SettingRow(
            icon = Icons.Filled.Logout,
            label = "Sign out",
            description = "Clear playlist credentials",
            onClick = { pendingConfirm = ConfirmKind.SignOut },
        )
        SettingRow(
            icon = Icons.Filled.DeleteForever,
            label = "Clear all data",
            description = "Sign out + remove favorites + history",
            destructive = true,
            onClick = { pendingConfirm = ConfirmKind.ClearAll },
        )
    }

    pendingConfirm?.let { kind ->
        ConfirmDialog(
            kind = kind,
            onDismiss = { pendingConfirm = null },
            onConfirm = {
                when (kind) {
                    ConfirmKind.ClearFavs -> vm.clearFavorites()
                    ConfirmKind.ClearHistory -> vm.clearHistory()
                    ConfirmKind.SignOut -> vm.signOut(onSignedOut)
                    ConfirmKind.ClearAll -> vm.clearAll(onSignedOut)
                }
                pendingConfirm = null
            },
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text.uppercase(),
        color = LbColors.Text3,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 2.sp,
        modifier = Modifier.padding(start = 4.dp, bottom = 8.dp),
    )
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    label: String,
    description: String,
    destructive: Boolean = false,
    onClick: () -> Unit,
) {
    val accent = if (destructive) LbColors.AccentBright else LbColors.Text
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(LbColors.Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (destructive) LbColors.AccentBright else LbColors.Accent,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Text(label, color = accent, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(description, color = LbColors.Text3, fontSize = 12.sp)
        }
    }
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun ConfirmDialog(
    kind: ConfirmKind,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val (title, message) = when (kind) {
        ConfirmKind.ClearFavs -> "Clear favorites?" to
            "All saved movies and series will be removed. This can't be undone."
        ConfirmKind.ClearHistory -> "Clear watch history?" to
            "All resume positions will be forgotten."
        ConfirmKind.SignOut -> "Sign out?" to
            "You'll be returned to the login screen and need to re-enter the playlist URL."
        ConfirmKind.ClearAll -> "Clear all data?" to
            "Removes favorites, watch history, and playlist credentials. This can't be undone."
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = LbColors.Surface,
        titleContentColor = LbColors.Text,
        textContentColor = LbColors.Text2,
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Confirm", color = LbColors.AccentBright)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = LbColors.Text2)
            }
        },
    )
}
