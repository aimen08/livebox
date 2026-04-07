package com.livebox.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.livebox.tv.data.XtreamCredentials
import com.livebox.tv.ui.AppViewModel
import com.livebox.tv.ui.theme.LbColors
import com.livebox.tv.ui.util.isCompactWidth

/**
 * Default URL pre-filled on the login screen for quick testing — same shape
 * as the URLModal in the React app: a single M3U URL field.
 */
private const val DEFAULT_URL =
    "http://example.com/get.php?username=REDACTED_USER&password=REDACTED_PASS&type=m3u_plus&output=ts"

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    vm: AppViewModel = hiltViewModel(),
) {
    var url by remember { mutableStateOf(DEFAULT_URL) }
    var error by remember { mutableStateOf<String?>(null) }
    val compact = isCompactWidth()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LbColors.Bg)
            .padding(if (compact) 16.dp else 0.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier
                .then(if (compact) Modifier.fillMaxWidth() else Modifier.width(720.dp))
                .clip(RoundedCornerShape(12.dp)),
            color = LbColors.Surface,
            tonalElevation = 4.dp,
        ) {
            Column(modifier = Modifier.padding(if (compact) 20.dp else 32.dp)) {
                Text(
                    text = "Open M3U URL",
                    color = Color.White,
                    style = MaterialTheme.typography.headlineSmall,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Paste your provider's get.php?username=…&password=… link",
                    color = Color.White.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(20.dp))

                OutlinedTextField(
                    value = url,
                    onValueChange = {
                        url = it
                        error = null
                    },
                    label = { Text("M3U URL") },
                    placeholder = { Text("https://example.com/get.php?username=…&password=…") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    isError = error != null,
                    supportingText = {
                        if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)
                    },
                )

                Spacer(Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    Button(
                        enabled = url.isNotBlank(),
                        onClick = {
                            val creds = XtreamCredentials.parseM3uUrl(url)
                            if (creds == null) {
                                error = "Couldn't parse URL — expected get.php?username=…&password=…"
                            } else {
                                vm.signIn(creds, onSignedIn)
                            }
                        },
                    ) { Text("Connect") }
                }
            }
        }
    }
}
