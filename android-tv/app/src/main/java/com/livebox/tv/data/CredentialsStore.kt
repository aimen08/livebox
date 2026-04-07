package com.livebox.tv.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "livebox_creds")

private val KEY_URL = stringPreferencesKey("base_url")
private val KEY_USER = stringPreferencesKey("username")
private val KEY_PASS = stringPreferencesKey("password")

@Singleton
class CredentialsStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    val flow: Flow<XtreamCredentials?> = context.dataStore.data.map { prefs ->
        val url = prefs[KEY_URL] ?: return@map null
        val user = prefs[KEY_USER] ?: return@map null
        val pass = prefs[KEY_PASS] ?: return@map null
        XtreamCredentials(url.trimEnd('/'), user, pass)
    }

    suspend fun save(creds: XtreamCredentials) {
        context.dataStore.edit { prefs ->
            prefs[KEY_URL] = creds.baseUrl.trimEnd('/')
            prefs[KEY_USER] = creds.username
            prefs[KEY_PASS] = creds.password
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    /**
     * Synchronous read used during MainActivity.onCreate so we can pick the
     * correct nav start destination *before* the first composition runs and
     * avoid the login screen briefly flashing on already-logged-in startup.
     */
    fun peek(): XtreamCredentials? = runBlocking { flow.first() }

    /** Synchronous accessor for repository calls. Throws if not signed in. */
    fun require(): XtreamCredentials = peek() ?: error("No credentials saved")
}
