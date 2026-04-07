package com.livebox.tv.ui.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.platform.LocalConfiguration

/**
 * Returns true on phone-class screens (< 600 dp wide).
 *
 * 600 dp is the standard Material breakpoint between phone and tablet.
 * Used to switch between stacked / bottom-nav layouts (compact) and
 * side-rail / two-pane layouts (expanded — tablets and TVs).
 */
@Composable
@ReadOnlyComposable
fun isCompactWidth(): Boolean {
    val configuration = LocalConfiguration.current
    return configuration.screenWidthDp < 600
}
