import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const requiredFiles = [
  "src/app/mobile-app/page.tsx",
  "src/app/mobile-app/write/page.tsx",
  "src/app/mobile-app/posts/[postId]/page.tsx",
  "src/app/mobile-app/games/[gameId]/page.tsx",
  "src/components/mobile-app/kbo-mobile-app.tsx",
  "src/components/mobile-app/mobile-game-room.tsx",
  "src/components/mobile-app/mobile-post-create-form.tsx",
  "src/components/mobile-app/mobile-post-detail.tsx",
  "src/components/mobile-app/mobile-install-prompt.tsx",
  "src/components/mobile-app/mobile-notification-settings.tsx",
  "src/components/mobile-app/mobile-app-status-panel.tsx",
  "src/components/mobile-app/open-in-app-actions.tsx",
  "src/components/mobile-app/open-web-button.tsx",
  "src/lib/mobile/native-bridge.ts",
  "src/app/manifest.ts",
  "src/app/icon.svg",
  "public/sw.js",
  "src/app/portfolio/kbo-app/page.tsx",
  "src/components/portfolio/kbo-app-improvement-page.tsx",
  "scripts/android-doctor.mjs",
  "scripts/verify-android-shell.mjs",
  "scripts/verify-android-devices.mjs",
  "scripts/verify-android-build-env.mjs",
  "scripts/verify-kbo-app-check.mjs",
  "scripts/verify-kbo-app-release.mjs",
  "scripts/verify-kbo-app-runtime.mjs",
  "scripts/verify-android-smoke.mjs",
  "scripts/open-android-project.mjs",
  "scripts/open-android-deeplink.mjs",
  "scripts/send-android-share.mjs",
  "scripts/build-android-apk.mjs",
  "scripts/setup-android-local-properties.mjs",
  "scripts/set-android-web-url.mjs",
  "android/app/src/main/res/xml/shortcuts.xml",
];

const contentChecks = [
  {
    file: "src/app/manifest.ts",
    label: "PWA start URL",
    pattern: /start_url:\s*"\/mobile-app"/,
  },
  {
    file: "src/app/manifest.ts",
    label: "PWA standalone display",
    pattern: /display:\s*"standalone"/,
  },
  {
    file: "src/app/manifest.ts",
    label: "PWA share target",
    pattern: /share_target/,
  },
  {
    file: "src/app/manifest.ts",
    label: "PWA share target write action",
    pattern: /\/mobile-app\/write\?source=web-share&tags=KBO,뉴스,공유/,
  },
  {
    file: "src/app/layout.tsx",
    label: "layout manifest link",
    pattern: /manifest:\s*"\/manifest\.webmanifest"/,
  },
  {
    file: "public/sw.js",
    label: "service worker app shell",
    pattern: /APP_SHELL\s*=\s*\["\/mobile-app",\s*"\/manifest\.webmanifest",\s*"\/icon\.svg"\]/,
  },
  {
    file: "public/sw.js",
    label: "service worker dev cache bypass",
    pattern: /DEV_HOSTS\.has\(requestUrl\.hostname\)/,
  },
  {
    file: "public/sw.js",
    label: "service worker api cache bypass",
    pattern: /requestUrl\.pathname\.startsWith\("\/api\/"\)/,
  },
  {
    file: "public/sw.js",
    label: "service worker next chunk cache bypass",
    pattern: /requestUrl\.pathname\.startsWith\("\/_next\/"\)/,
  },
  {
    file: "src/components/mobile-app/mobile-install-prompt.tsx",
    label: "PWA install prompt",
    pattern: /beforeinstallprompt/,
  },
  {
    file: "src/components/mobile-app/mobile-install-prompt.tsx",
    label: "service worker registration",
    pattern: /navigator\.serviceWorker\.register\("\/sw\.js"\)/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile app main component",
    pattern: /export function KboMobileApp/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile app fetch timeout fallback",
    pattern: /MOBILE_APP_FETCH_TIMEOUT_MS/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile app state fallback race",
    pattern: /requestMobileAppStateWithFallback/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile tabs",
    pattern: /type AppTab = "home" \| "games" \| "records" \| "news" \| "my"/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile news briefing flow",
    pattern: /handleCreateNewsBriefing/,
  },
  {
    file: "src/components/mobile-app/kbo-mobile-app.tsx",
    label: "mobile notification settings mounted",
    pattern: /<MobileNotificationSettings favoriteTeam=\{favoriteTeam\} \/>/,
  },
  {
    file: "src/components/mobile-app/mobile-post-create-form.tsx",
    label: "mobile post create route push",
    pattern: /router\.push\(`\/mobile-app\/posts\/\$\{data\.post\.id\}`\)/,
  },
  {
    file: "src/components/mobile-app/mobile-game-room.tsx",
    label: "mobile game room share",
    pattern: /MobileShareButton/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "android deep link helper",
    pattern: /createAndroidDeepLink/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "post deep link mapping",
    pattern: /kbofanhub:\/\/posts\/\$\{postId\}/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "game deep link mapping",
    pattern: /kbofanhub:\/\/games\/\$\{gameId\}/,
  },
  {
    file: "src/components/mobile-app/open-in-app-actions.tsx",
    label: "web to app action",
    pattern: /openAndroidApp\(mobileHref\)/,
  },
  {
    file: "src/components/mobile-app/open-web-button.tsx",
    label: "app to web browser action",
    pattern: /openNativeBrowser\(href\)/,
  },
  {
    file: "src/components/mobile-app/mobile-post-detail.tsx",
    label: "mobile post opens web original",
    pattern: /<OpenWebButton[\s\S]*href=\{`\/posts\/\$\{post\.id\}`\}/,
  },
  {
    file: "src/components/mobile-app/mobile-game-room.tsx",
    label: "mobile game room opens web original",
    pattern: /<OpenWebButton[\s\S]*href=\{getGameRoomHref\(game\)\}/,
  },
  {
    file: "src/components/posts/post-detail.tsx",
    label: "post detail app open action",
    pattern: /<OpenInAppActions mobileHref=\{`\/mobile-app\/posts\/\$\{post\.id\}`\} \/>/,
  },
  {
    file: "src/components/games/game-room.tsx",
    label: "game room app open action",
    pattern: /<OpenInAppActions mobileHref=\{getMobileGameRoomHref\(game\)\} \/>/,
  },
  {
    file: "src/components/site-header.tsx",
    label: "desktop mobile app navigation",
    pattern: /href:\s*"\/mobile-app",\s*label:\s*"모바일앱"/,
  },
  {
    file: "src/components/site-header.tsx",
    label: "portfolio navigation",
    pattern: /href:\s*"\/portfolio\/kbo-app",\s*label:\s*"앱 개선안"/,
  },
  {
    file: "src/components/portfolio/kbo-app-improvement-page.tsx",
    label: "official source facts",
    pattern: /const verifiedFacts/,
  },
  {
    file: "src/components/portfolio/kbo-app-improvement-page.tsx",
    label: "implementation trace",
    pattern: /const implementationTrace/,
  },
  {
    file: "src/components/portfolio/kbo-app-improvement-page.tsx",
    label: "official app implementation mapping",
    pattern: /공식 앱 요소와 구현 매핑/,
  },
  {
    file: "src/components/portfolio/kbo-app-improvement-page.tsx",
    label: "portfolio runbook steps",
    pattern: /const runbookSteps/,
  },
  {
    file: "src/components/portfolio/kbo-app-improvement-page.tsx",
    label: "portfolio runbook section",
    pattern: /실행\/검증 흐름/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app local run guidance",
    pattern: /로컬 실행 순서/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app dev server command",
    pattern: /npm\.cmd run mobile:dev/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app android doctor command",
    pattern: /npm\.cmd run android:doctor/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app android open command",
    pattern: /npm\.cmd run android:open/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app release check command",
    pattern: /npm\.cmd run mobile:release-check/,
  },
  {
    file: "src/components/mobile-app/mobile-app-status-panel.tsx",
    label: "mobile app smoke run command",
    pattern: /npm\.cmd run android:smoke -- --run/,
  },
  {
    file: "package.json",
    label: "mobile dev script",
    pattern: /"mobile:dev":\s*"next dev -H 0\.0\.0\.0"/,
  },
  {
    file: "package.json",
    label: "mobile check script",
    pattern: /"mobile:check":\s*"node scripts\/verify-kbo-app-check\.mjs"/,
  },
  {
    file: "package.json",
    label: "mobile release check script",
    pattern: /"mobile:release-check":\s*"node scripts\/verify-kbo-app-release\.mjs"/,
  },
  {
    file: "package.json",
    label: "android doctor script",
    pattern: /"android:doctor":\s*"node scripts\/android-doctor\.mjs"/,
  },
  {
    file: "package.json",
    label: "android open script",
    pattern: /"android:open":\s*"node scripts\/open-android-project\.mjs"/,
  },
  {
    file: "package.json",
    label: "android open dry run script",
    pattern: /"android:open:dry-run":\s*"node scripts\/open-android-project\.mjs --dry-run"/,
  },
  {
    file: "package.json",
    label: "android local properties setup script",
    pattern: /"android:setup-local":\s*"node scripts\/setup-android-local-properties\.mjs"/,
  },
  {
    file: "package.json",
    label: "android build script",
    pattern: /"android:build":\s*"node scripts\/build-android-apk\.mjs"/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android APK build task",
    pattern: /assembleDebug/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android release APK path",
    pattern: /app-release-unsigned\.apk/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android APK install option",
    pattern: /--install/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android build bundled Java fallback",
    pattern: /Using Android Studio bundled JAVA_HOME/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android Gradle wrapper cmd execution",
    pattern: /powershell\.exe/,
  },
  {
    file: "scripts/build-android-apk.mjs",
    label: "android release install signing guidance",
    pattern: /release builds usually need signing first/,
  },
  {
    file: "package.json",
    label: "android web url script",
    pattern: /"android:set-url":\s*"node scripts\/set-android-web-url\.mjs"/,
  },
  {
    file: "scripts/set-android-web-url.mjs",
    label: "android web url setter",
    pattern: /KBO_WEB_APP_URL/,
  },
  {
    file: "scripts/set-android-web-url.mjs",
    label: "android emulator URL preset",
    pattern: /http:\/\/10\.0\.2\.2:3000\/mobile-app/,
  },
  {
    file: "package.json",
    label: "android deep link script",
    pattern: /"android:deep-link":\s*"node scripts\/open-android-deeplink\.mjs"/,
  },
  {
    file: "package.json",
    label: "android share script",
    pattern: /"android:share":\s*"node scripts\/send-android-share\.mjs"/,
  },
  {
    file: "package.json",
    label: "android smoke script",
    pattern: /"android:smoke":\s*"node scripts\/verify-android-smoke\.mjs"/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "android text share target",
    pattern: /android\.intent\.action\.SEND[\s\S]*android:mimeType="text\/plain"/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "android share intent handling",
    pattern: /resolveSharedTextUrl/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "android share to write route",
    pattern: /\/mobile-app\/write/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "android share source query",
    pattern: /appendQueryParameter\("source", "android-share"\)/,
  },
  {
    file: "src/app/mobile-app/write/page.tsx",
    label: "mobile write receives source query",
    pattern: /const initialSource = getFirstParam\(source\)/,
  },
  {
    file: "src/app/mobile-app/write/page.tsx",
    label: "mobile write handles web share text",
    pattern: /createSharedContent/,
  },
  {
    file: "src/components/mobile-app/mobile-post-create-form.tsx",
    label: "mobile shared draft supports web share",
    pattern: /\["android-share", "web-share"\]\.includes\(initialSource\)/,
  },
  {
    file: "src/components/mobile-app/mobile-post-create-form.tsx",
    label: "mobile shared draft notice",
    pattern: /공유한 내용으로 초안을 채웠습니다/,
  },
  {
    file: "scripts/send-android-share.mjs",
    label: "adb share helper",
    pattern: /android\.intent\.action\.SEND/,
  },
  {
    file: "scripts/send-android-share.mjs",
    label: "adb share shell quoting",
    pattern: /quoteForAndroidShell\(text\)/,
  },
  {
    file: "scripts/verify-android-smoke.mjs",
    label: "android smoke dry-run default",
    pattern: /Android smoke test is running in dry-run mode/,
  },
  {
    file: "android/app/src/main/java/com/kominsuk/kbofanhub/MainActivity.kt",
    label: "targeted Android notification bridge",
    pattern: /showLocalNotificationForUrl/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "targeted web notification bridge",
    pattern: /showLocalNotificationForUrl/,
  },
  {
    file: "src/lib/mobile/native-bridge.ts",
    label: "notification opens current app route",
    pattern: /createAndroidDeepLink\(pathOrUrl \?\? window\.location\.href\)/,
  },
  {
    file: "android/app/src/main/AndroidManifest.xml",
    label: "android app shortcuts metadata",
    pattern: /android:name="android\.app\.shortcuts"[\s\S]*android:resource="@xml\/shortcuts"/,
  },
  {
    file: "android/app/src/main/res/xml/shortcuts.xml",
    label: "android home shortcut",
    pattern: /android:shortcutId="home"[\s\S]*kbofanhub:\/\/app/,
  },
  {
    file: "android/app/src/main/res/xml/shortcuts.xml",
    label: "android write shortcut",
    pattern: /android:shortcutId="write"[\s\S]*kbofanhub:\/\/write\?tags=KBO/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link app package",
    pattern: /const APP_PACKAGE = "com\.kominsuk\.kbofanhub"/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link shell quoting",
    pattern: /quoteForAndroidShell\(deepLink\)/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link post route",
    pattern: /kbofanhub:\/\/posts\/\$\{encodeURIComponent\(postId\)\}/,
  },
  {
    file: "scripts/open-android-deeplink.mjs",
    label: "adb deep link game route",
    pattern: /kbofanhub:\/\/games\/\$\{encodeURIComponent\(gameId\)\}/,
  },
  {
    file: "package.json",
    label: "android device verification script",
    pattern: /"verify:android:devices":\s*"node scripts\/verify-android-devices\.mjs"/,
  },
  {
    file: "package.json",
    label: "android smoke verification script",
    pattern: /"verify:android:smoke":\s*"node scripts\/verify-android-smoke\.mjs"/,
  },
  {
    file: "package.json",
    label: "android environment verification script",
    pattern: /"verify:android:env":\s*"node scripts\/verify-android-build-env\.mjs"/,
  },
  {
    file: "scripts/verify-android-build-env.mjs",
    label: "android studio IDE readiness diagnostic",
    pattern: /Android Studio IDE run ready/,
  },
  {
    file: "scripts/verify-android-build-env.mjs",
    label: "android local properties diagnostic",
    pattern: /Android local\.properties/,
  },
  {
    file: "scripts/verify-android-devices.mjs",
    label: "android runnable target diagnostic",
    pattern: /Runnable Android target ready/,
  },
  {
    file: "scripts/verify-android-devices.mjs",
    label: "android system image diagnostic",
    pattern: /System images/,
  },
  {
    file: "scripts/android-doctor.mjs",
    label: "android doctor guidance",
    pattern: /Android doctor finished/,
  },
  {
    file: "package.json",
    label: "integrated verification script",
    pattern: /"verify:kbo-app:check":\s*"node scripts\/verify-kbo-app-check\.mjs"/,
  },
  {
    file: "package.json",
    label: "runtime verification script",
    pattern: /"verify:kbo-app:runtime":\s*"node scripts\/verify-kbo-app-runtime\.mjs"/,
  },
  {
    file: "package.json",
    label: "release verification script",
    pattern: /"verify:kbo-app:release":\s*"node scripts\/verify-kbo-app-release\.mjs"/,
  },
  {
    file: "scripts/verify-kbo-app-release.mjs",
    label: "release verification restores next env",
    pattern: /Restored next-env\.d\.ts after Next\.js build/,
  },
  {
    file: "scripts/verify-kbo-app-release.mjs",
    label: "release verification includes android smoke",
    pattern: /Android deep link and share smoke test/,
  },
  {
    file: "scripts/verify-kbo-app-runtime.mjs",
    label: "runtime shared write route",
    pattern: /source=android-share/,
  },
  {
    file: "scripts/verify-kbo-app-runtime.mjs",
    label: "runtime verification reuses existing server",
    pattern: /Using existing Next\.js dev server/,
  },
  {
    file: "scripts/verify-kbo-app-runtime.mjs",
    label: "runtime PWA shared write route",
    pattern: /source=web-share/,
  },
  {
    file: "scripts/verify-kbo-app-runtime.mjs",
    label: "runtime manifest share target check",
    pattern: /"share_target"/,
  },
  {
    file: "scripts/verify-kbo-app-runtime.mjs",
    label: "runtime shared write notice",
    pattern: /공유한 내용으로 초안을 채웠습니다/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "runtime verification runbook",
    pattern: /npm\.cmd run verify:kbo-app:runtime/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "mobile dev runbook",
    pattern: /npm\.cmd run mobile:dev/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android open runbook",
    pattern: /npm\.cmd run android:open/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android local properties runbook",
    pattern: /npm\.cmd run android:setup-local/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android device runbook",
    pattern: /npm\.cmd run verify:android:devices/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android smoke runbook",
    pattern: /npm\.cmd run android:smoke/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android doctor runbook",
    pattern: /npm\.cmd run android:doctor/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android virtual device setup runbook",
    pattern: /Tools > Device Manager/,
  },
  {
    file: "android/RUNBOOK.md",
    label: "android open dry runbook",
    pattern: /npm\.cmd run android:open:dry-run/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "mobile check QA checklist",
    pattern: /npm\.cmd run mobile:check/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "android open QA checklist",
    pattern: /npm\.cmd run android:open/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "android local properties QA checklist",
    pattern: /npm\.cmd run android:setup-local/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "android device QA checklist",
    pattern: /npm\.cmd run verify:android:devices/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "android doctor QA checklist",
    pattern: /npm\.cmd run android:doctor/,
  },
  {
    file: "android/QA_CHECKLIST.md",
    label: "android virtual device QA checklist",
    pattern: /Android Virtual Device/,
  },
];

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [path.join(rootDir, scriptPath)], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    ok: result.status === 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
  };
}

const failures = [];

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

const androidResult = runNodeScript("scripts/verify-android-shell.mjs");

if (!androidResult.ok) {
  failures.push("android shell verification failed");
}

if (failures.length > 0) {
  console.error("KBO app verification failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  if (androidResult.output) {
    console.error("\nAndroid verification output:");
    console.error(androidResult.output);
  }

  process.exitCode = 1;
} else {
  console.log("KBO app verification passed.");
  console.log(`Checked ${requiredFiles.length} required files.`);
  console.log(`Checked ${contentChecks.length} mobile app/PWA/web integration rules.`);
  console.log("Android shell verification was included.");

  if (androidResult.output) {
    console.log("\nAndroid verification output:");
    console.log(androidResult.output);
  }
}
