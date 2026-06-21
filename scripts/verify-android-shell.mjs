import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const requiredFiles = [
  "android/settings.gradle.kts",
  "android/build.gradle.kts",
  "android/gradle.properties",
  "android/app/build.gradle.kts",
  "android/app/src/main/AndroidManifest.xml",
  "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
  "android/app/src/main/res/drawable/ic_launcher.xml",
  "android/app/src/main/res/values/strings.xml",
  "android/app/src/main/res/values/themes.xml",
  "android/app/src/main/res/xml/network_security_config.xml",
  "android/app/src/main/res/xml/shortcuts.xml",
  "android/RUNBOOK.md",
  "android/QA_CHECKLIST.md",
  "scripts/open-android-deeplink.mjs",
  "scripts/send-android-share.mjs",
  "scripts/set-android-web-url.mjs",
];

const contentChecks = [
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "internet permission",
    pattern: /android\.permission\.INTERNET/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "notification permission",
    pattern: /android\.permission\.POST_NOTIFICATIONS/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "launcher activity",
    pattern: /android\.intent\.action\.MAIN/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "deep link scheme",
    pattern: /android:scheme="kbofanhub"/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "text share intent",
    pattern: /android\.intent\.action\.SEND[\s\S]*android:mimeType="text\/plain"/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "app shortcuts metadata",
    pattern: /android:name="android\.app\.shortcuts"[\s\S]*android:resource="@xml\/shortcuts"/,
  },
  {
    file: "android/app/src/main/res/xml/shortcuts.xml",
    label: "home app shortcut",
    pattern: /android:shortcutId="home"[\s\S]*kbofanhub:\/\/app/,
  },
  {
    file: "android/app/src/main/res/xml/shortcuts.xml",
    label: "write app shortcut",
    pattern: /android:shortcutId="write"[\s\S]*kbofanhub:\/\/write\?tags=KBO/,
  },
  {
    file: "android/app/build.gradle.kts",
    label: "web app url build config",
    pattern: /KBO_WEB_APP_URL/,
  },
  {
    file: "android/app/build.gradle.kts",
    label: "Java source compatibility target",
    pattern: /sourceCompatibility = JavaVersion\.VERSION_17/,
  },
  {
    file: "android/app/build.gradle.kts",
    label: "Java target compatibility target",
    pattern: /targetCompatibility = JavaVersion\.VERSION_17/,
  },
  {
    file: "android/app/build.gradle.kts",
    label: "Kotlin JVM target",
    pattern: /jvmTarget\.set\(JvmTarget\.JVM_17\)/,
  },
  {
    file: "scripts/set-android-web-url.mjs",
    label: "android web url setter",
    pattern: /KBO_WEB_APP_URL/,
  },
  {
    file: "scripts/set-android-web-url.mjs",
    label: "android emulator url preset",
    pattern: /http:\/\/10\.0\.2\.2:3000\/mobile-app/,
  },
  {
    file: "scripts/set-android-web-url.mjs",
    label: "android web url mobile app validation",
    pattern: /\/mobile-app route/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "webview javascript",
    pattern: /settings\.javaScriptEnabled = true/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "android bridge injection",
    pattern: /addJavascriptInterface\(KboFanHubBridge\(\), "KboFanHubAndroid"\)/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "external link browser handoff",
    pattern: /Intent\(Intent\.ACTION_VIEW, requestUri\)/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "offline retry guidance",
    pattern: /npm\.cmd run mobile:dev/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "offline configured URL display",
    pattern: /연결 주소: \$\{BuildConfig\.KBO_WEB_APP_URL\}/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "deep link routing",
    pattern: /resolveLaunchUrl/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "share intent routing",
    pattern: /resolveSharedTextUrl/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "share intent writes to mobile app",
    pattern: /appendQueryParameter\("tags", "KBO,뉴스,공유"\)/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "share intent source query",
    pattern: /appendQueryParameter\("source", "android-share"\)/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "post deep link route",
    pattern: /"posts" -> "\/mobile-app\/posts\/\$\{deepLink\.lastPathSegment\.orEmpty\(\)\}"/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "game deep link route",
    pattern: /"games" -> "\/mobile-app\/games\/\$\{deepLink\.lastPathSegment\.orEmpty\(\)\}"/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "file chooser support",
    pattern: /onShowFileChooser/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "file chooser result callback",
    pattern: /WebChromeClient\.FileChooserParams\.parseResult/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "notification channel",
    pattern: /NotificationChannel/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "local notification bridge",
    pattern: /showLocalNotification/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "targeted local notification bridge",
    pattern: /showLocalNotificationForUrl/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "notification intent target url",
    pattern: /data = Uri\.parse\(targetUrl\)/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "web native bridge type",
    pattern: /KboFanHubAndroidBridge/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "web targeted notification bridge",
    pattern: /showLocalNotificationForUrl/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "notification deep link target",
    pattern: /createAndroidDeepLink\(pathOrUrl \?\? window\.location\.href\)/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "app status panel notification test",
    pattern: /handleNotificationTest/,
  },
  {
    file: "src/components/mobile-app/mobile-notification-settings.tsx",
    label: "mobile notification settings",
    pattern: /MobileNotificationSettings/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android QA checklist link",
    pattern: /QA_CHECKLIST\.md/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "manual APK build checklist",
    pattern: /APK Build/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "manual deep link checklist",
    pattern: /kbofanhub:\/\/posts\/\{postId\}/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link helper",
    pattern: /android\.intent\.action\.VIEW/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link app package",
    pattern: /com\.kominsuk\.kbofanhub/,
  },
  {
    file: "scripts/send-android-share.mjs",
    label: "adb share helper",
    pattern: /android\.intent\.action\.SEND/,
  },
  {
    file: "scripts/send-android-share.mjs",
    label: "adb share app package",
    pattern: /com\.kominsuk\.kbofanhub/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "adb deep link runbook",
    pattern: /npm\.cmd run android:deep-link/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "adb share runbook",
    pattern: /npm\.cmd run android:share/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android set url runbook",
    pattern: /npm\.cmd run android:set-url/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "adb deep link QA checklist",
    pattern: /android:deep-link/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "adb share QA checklist",
    pattern: /android:share/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "manual image upload checklist",
    pattern: /Image Upload/,
  },
];

const failures = [];
const diagnostics = [];

function commandExists(command) {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0;
}

for (const filePath of requiredFiles) {
  if (!existsSync(path.join(rootDir, filePath))) {
    failures.push(`missing required file: ${filePath}`);
  }
}

for (const check of contentChecks) {
  const absolutePath = path.join(rootDir, check.file);

  if (!existsSync(absolutePath)) {
    failures.push(`cannot check ${check.label}; file missing: ${check.file}`);
    continue;
  }

  const content = readFileSync(absolutePath, "utf8");

  if (!check.pattern.test(content)) {
    failures.push(`missing ${check.label} in ${check.file}`);
  }
}

if (failures.length > 0) {
  console.error("Android shell verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  const hasGradleWrapper =
    existsSync(path.join(rootDir, "android", "gradlew")) ||
    existsSync(path.join(rootDir, "android", "gradlew.bat"));
  const hasSystemGradle = commandExists("gradle");
  const hasSdkEnv = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT);

  diagnostics.push(
    hasGradleWrapper
      ? "Gradle wrapper: found"
      : "Gradle wrapper: not found; open android/ in Android Studio or add a wrapper before CLI APK builds.",
  );
  diagnostics.push(
    hasSystemGradle
      ? "System Gradle: found"
      : "System Gradle: not found on PATH.",
  );
  diagnostics.push(
    hasSdkEnv
      ? "Android SDK env: found"
      : "Android SDK env: ANDROID_HOME/ANDROID_SDK_ROOT not set.",
  );

  console.log("Android shell verification passed.");
  console.log(`Checked ${requiredFiles.length} required files.`);
  console.log(`Checked ${contentChecks.length} Android/web integration rules.`);
  console.log("Build environment diagnostics:");

  for (const diagnostic of diagnostics) {
    console.log(`- ${diagnostic}`);
  }
}
