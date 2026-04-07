package com.livebox.tv.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.livebox.tv.data.CredentialsStore
import com.livebox.tv.data.XtreamCredentials
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppViewModel @Inject constructor(
    private val credsStore: CredentialsStore,
) : ViewModel() {

    val creds: StateFlow<XtreamCredentials?> = credsStore.flow
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun signIn(creds: XtreamCredentials, onDone: () -> Unit) = viewModelScope.launch {
        credsStore.save(creds)
        onDone()
    }

    fun signOut() = viewModelScope.launch { credsStore.clear() }
}
