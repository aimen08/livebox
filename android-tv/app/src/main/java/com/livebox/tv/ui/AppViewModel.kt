package com.livebox.tv.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.livebox.tv.data.CredentialsStore
import com.livebox.tv.data.XtreamCredentials
import com.livebox.tv.data.XtreamRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * State of the sign-in flow. The login screen drives a fullscreen loading
 * overlay off [Loading] and shows an inline error from [Error].
 */
sealed interface SignInState {
    data object Idle : SignInState
    data object Loading : SignInState
    data class Error(val message: String) : SignInState
}

@HiltViewModel
class AppViewModel @Inject constructor(
    private val credsStore: CredentialsStore,
    private val repo: XtreamRepository,
) : ViewModel() {

    val creds: StateFlow<XtreamCredentials?> = credsStore.flow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    private val _signInState = MutableStateFlow<SignInState>(SignInState.Idle)
    val signInState: StateFlow<SignInState> = _signInState.asStateFlow()

    init {
        // App start: if signed in already and the cache has data, kick off a
        // silent background refresh so the user sees fresh data shortly after
        // first paint. If no cache, the per-tab VMs will trigger refresh
        // themselves on first observation.
        if (credsStore.peek() != null && repo.cachedSnapshot.value != null) {
            viewModelScope.launch { runCatching { repo.refreshAll() } }
        }
    }

    fun signIn(creds: XtreamCredentials, onDone: () -> Unit) = viewModelScope.launch {
        _signInState.value = SignInState.Loading
        // New credentials → drop any cached catalog from a different account.
        repo.clearCache()
        credsStore.save(creds)
        runCatching { repo.refreshAll() }
            .onSuccess {
                _signInState.value = SignInState.Idle
                onDone()
            }
            .onFailure { e ->
                // Roll back the saved creds so the user lands back on login.
                credsStore.clear()
                _signInState.value = SignInState.Error(
                    e.message ?: "Couldn't load playlist. Check the URL and try again."
                )
            }
    }

    fun resetSignInState() {
        _signInState.value = SignInState.Idle
    }

    fun signOut() = viewModelScope.launch {
        repo.clearCache()
        credsStore.clear()
    }
}
