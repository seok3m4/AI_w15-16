package com.kominsuk.kbofanhub

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "kbo_fan_hub_updates"
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 2026
        private const val FILE_CHOOSER_REQUEST_CODE = 2027
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var offlineView: TextView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val appUri: Uri = Uri.parse(BuildConfig.KBO_WEB_APP_URL)

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.parseColor("#071A3D")
        window.navigationBarColor = Color.parseColor("#071A3D")
        createNotificationChannel()

        val root = FrameLayout(this)

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mediaPlaybackRequiresUserGesture = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            settings.userAgentString = "${settings.userAgentString} KboFanHubAndroid/1.0"
            overScrollMode = View.OVER_SCROLL_NEVER
            addJavascriptInterface(KboFanHubBridge(), "KboFanHubAndroid")
            webViewClient = createWebViewClient()
            webChromeClient = createWebChromeClient()
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                8,
                Gravity.TOP,
            )
            max = 100
            progress = 0
        }

        offlineView = TextView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#F3F6FB"))
            setTextColor(Color.parseColor("#071A3D"))
            textSize = 16f
            text = """
                KBO Fan Hub를 불러오지 못했습니다.

                PC에서 npm.cmd run mobile:dev를 실행한 뒤
                화면을 눌러 다시 시도해주세요.

                연결 주소: ${BuildConfig.KBO_WEB_APP_URL}
            """.trimIndent()
            visibility = View.GONE
            setOnClickListener {
                hideOfflineView()
                webView.loadUrl(BuildConfig.KBO_WEB_APP_URL)
            }
        }

        root.addView(webView)
        root.addView(progressBar)
        root.addView(offlineView)

        setContentView(root)

        if (savedInstanceState == null) {
            webView.loadUrl(resolveLaunchUrl(intent))
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        hideOfflineView()
        webView.loadUrl(resolveLaunchUrl(intent))
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
            return
        }

        super.onBackPressed()
    }

    override fun onDestroy() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        webView.destroy()
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != FILE_CHOOSER_REQUEST_CODE) {
            return
        }

        val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    private fun createWebViewClient(): WebViewClient {
        return object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val requestUri = request.url

                if (isInternalUrl(requestUri)) {
                    return false
                }

                startActivity(Intent(Intent.ACTION_VIEW, requestUri))
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                hideOfflineView()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                super.onReceivedError(view, request, error)

                if (request.isForMainFrame) {
                    showOfflineView()
                }
            }
        }
    }

    private fun createWebChromeClient(): WebChromeClient {
        return object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }

            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: WebChromeClient.FileChooserParams,
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val fileChooserIntent = fileChooserParams.createIntent().apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                }

                return try {
                    startActivityForResult(fileChooserIntent, FILE_CHOOSER_REQUEST_CODE)
                    true
                } catch (_: Exception) {
                    this@MainActivity.filePathCallback = null
                    filePathCallback.onReceiveValue(null)
                    Toast.makeText(
                        this@MainActivity,
                        "이미지를 선택할 수 있는 앱을 찾지 못했습니다.",
                        Toast.LENGTH_SHORT,
                    ).show()
                    false
                }
            }
        }
    }

    private fun isInternalUrl(uri: Uri): Boolean {
        if (uri.scheme == "about" || uri.scheme == "data") {
            return true
        }

        if (uri.host.isNullOrBlank()) {
            return false
        }

        return uri.host == appUri.host || uri.host == "10.0.2.2"
    }

    private fun showOfflineView() {
        offlineView.visibility = View.VISIBLE
        progressBar.visibility = View.GONE
    }

    private fun hideOfflineView() {
        offlineView.visibility = View.GONE
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "KBO Fan Hub updates",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Favorite team game, lineup, news, and community updates"
        }

        getNotificationManager().createNotificationChannel(channel)
    }

    private fun getNotificationManager(): NotificationManager {
        return getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    }

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true
        }

        return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || hasNotificationPermission()) {
            return
        }

        requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            NOTIFICATION_PERMISSION_REQUEST_CODE,
        )
    }

    private fun getNotificationPermissionState(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "not_required"
        }

        return if (hasNotificationPermission()) "granted" else "denied"
    }

    private fun showLocalNotification(
        title: String,
        message: String,
        targetUrl: String = BuildConfig.KBO_WEB_APP_URL,
    ): Boolean {
        if (!hasNotificationPermission()) {
            requestNotificationPermissionIfNeeded()
            return false
        }

        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP

            if (targetUrl.isNotBlank()) {
                action = Intent.ACTION_VIEW
                data = Uri.parse(targetUrl)
            }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            targetUrl.hashCode(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(title.ifBlank { "KBO Fan Hub" })
            .setContentText(message.ifBlank { "KBO Fan Hub update" })
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        getNotificationManager().notify(System.currentTimeMillis().toInt(), notification)

        return true
    }

    private fun resolveLaunchUrl(intent: Intent?): String {
        if (intent?.action == Intent.ACTION_SEND && intent.type == "text/plain") {
            return resolveSharedTextUrl(intent)
        }

        val deepLink = intent?.data ?: return BuildConfig.KBO_WEB_APP_URL

        if (deepLink.scheme != "kbofanhub") {
            return BuildConfig.KBO_WEB_APP_URL
        }

        val path = when (deepLink.host) {
            "posts" -> "/mobile-app/posts/${deepLink.lastPathSegment.orEmpty()}"
            "games" -> "/mobile-app/games/${deepLink.lastPathSegment.orEmpty()}"
            "write" -> "/mobile-app/write"
            else -> "/mobile-app"
        }
        val query = deepLink.encodedQuery?.let { "?$it" }.orEmpty()

        return "${getWebOrigin()}$path$query"
    }

    private fun resolveSharedTextUrl(intent: Intent): String {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty().trim()
        val sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT).orEmpty().trim()

        if (sharedText.isBlank() && sharedSubject.isBlank()) {
            return BuildConfig.KBO_WEB_APP_URL
        }

        val title = when {
            sharedSubject.isNotBlank() -> sharedSubject
            sharedText.startsWith("http://") || sharedText.startsWith("https://") -> "공유한 야구 링크"
            else -> sharedText.lineSequence().firstOrNull().orEmpty().take(80).ifBlank {
                "공유한 야구 이야기"
            }
        }
        val content = listOf(
            sharedSubject.takeIf { it.isNotBlank() }?.let { "공유 제목: $it" },
            sharedText.takeIf { it.isNotBlank() }?.let { "공유 내용:\n${it.take(1_500)}" },
            "",
            "앱 공유 시트로 받은 내용을 바탕으로 작성했습니다.",
        )
            .filterNotNull()
            .joinToString("\n")

        return Uri.parse("${getWebOrigin()}/mobile-app/write")
            .buildUpon()
            .appendQueryParameter("title", title.take(120))
            .appendQueryParameter("content", content)
            .appendQueryParameter("tags", "KBO,뉴스,공유")
            .appendQueryParameter("source", "android-share")
            .build()
            .toString()
    }

    private fun getWebOrigin(): String {
        val baseUri = Uri.parse(BuildConfig.KBO_WEB_APP_URL)
        val port = if (baseUri.port == -1) "" else ":${baseUri.port}"

        return "${baseUri.scheme}://${baseUri.host}$port"
    }

    inner class KboFanHubBridge {
        @JavascriptInterface
        fun getAppVersion(): String {
            return "1.0.0"
        }

        @JavascriptInterface
        fun getLaunchUrl(): String {
            return BuildConfig.KBO_WEB_APP_URL
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun getNotificationPermissionState(): String {
            return this@MainActivity.getNotificationPermissionState()
        }

        @JavascriptInterface
        fun requestNotificationPermission(): String {
            runOnUiThread {
                requestNotificationPermissionIfNeeded()
            }

            return this@MainActivity.getNotificationPermissionState()
        }

        @JavascriptInterface
        fun showLocalNotification(title: String, message: String): Boolean {
            if (!this@MainActivity.hasNotificationPermission()) {
                runOnUiThread {
                    requestNotificationPermissionIfNeeded()
                }

                return false
            }

            return this@MainActivity.showLocalNotification(title, message)
        }

        @JavascriptInterface
        fun showLocalNotificationForUrl(title: String, message: String, targetUrl: String): Boolean {
            if (!this@MainActivity.hasNotificationPermission()) {
                runOnUiThread {
                    requestNotificationPermissionIfNeeded()
                }

                return false
            }

            return this@MainActivity.showLocalNotification(title, message, targetUrl)
        }

        @JavascriptInterface
        fun reloadApp() {
            runOnUiThread {
                webView.reload()
            }
        }

        @JavascriptInterface
        fun openInBrowser(url: String) {
            val targetUrl = url.ifBlank { webView.url ?: BuildConfig.KBO_WEB_APP_URL }
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl))

            runOnUiThread {
                startActivity(browserIntent)
            }
        }

        @JavascriptInterface
        fun shareText(text: String) {
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }

            runOnUiThread {
                startActivity(Intent.createChooser(sendIntent, "공유하기"))
            }
        }
    }
}
