package com.livebox.tv.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Palette mirrors livebox/src/styles/global.css :root variables exactly.
 *   --bg            #0a0a0a
 *   --surface       #111111
 *   --surface2      #1a1a1a
 *   --surface3      #222222
 *   --border        #2a2a2a
 *   --accent        #e50914
 *   --accent-bright #ff1a24
 *   --accent-dim    rgba(229,9,20,0.15)
 *   --text          #f0f0f0
 *   --text2         #c0c0c0
 *   --text3         #909090
 */
object LbColors {
    val Bg            = Color(0xFF0A0A0A)
    val Surface       = Color(0xFF111111)
    val Surface2      = Color(0xFF1A1A1A)
    val Surface3      = Color(0xFF222222)
    val Border        = Color(0xFF2A2A2A)
    val Accent        = Color(0xFFE50914)
    val AccentBright  = Color(0xFFFF1A24)
    val AccentDim     = Color(0x26E50914)  // ~15% alpha
    val Text          = Color(0xFFF0F0F0)
    val Text2         = Color(0xFFC0C0C0)
    val Text3         = Color(0xFF909090)
}

private val LiveboxColors = darkColorScheme(
    primary             = LbColors.Accent,
    onPrimary           = Color.White,
    primaryContainer    = LbColors.AccentDim,
    onPrimaryContainer  = LbColors.Accent,
    background          = LbColors.Bg,
    onBackground        = LbColors.Text,
    surface             = LbColors.Surface,
    onSurface           = LbColors.Text,
    surfaceVariant      = LbColors.Surface2,
    onSurfaceVariant    = LbColors.Text2,
    outline             = LbColors.Border,
    error               = LbColors.AccentBright,
)

@Composable
fun LiveboxTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LiveboxColors, content = content)
}
