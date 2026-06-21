# KBO Fan Hub Android

이 Android 앱은 Next.js 웹 앱의 `/mobile-app` 화면을 WebView로 감싸는 포트폴리오용 앱 셸입니다.

## 로컬 실행 흐름

1. 웹 프로젝트 루트에서 Next.js 서버를 실행합니다.

```powershell
npm.cmd run mobile:dev
```

2. Android SDK 경로를 `android/local.properties`에 기록합니다.

```powershell
npm.cmd run android:setup-local
```

`android/local.properties`는 개인 PC 경로를 담으므로 git에 올리지 않습니다.

3. Android Studio에서 `android` 폴더를 엽니다.

```powershell
npm.cmd run android:open
```

Android Studio가 자동으로 감지되지 않으면 `ANDROID_STUDIO_PATH` 환경변수에 Android Studio 실행 파일 경로를 지정하거나, 출력된 `android` 폴더를 Android Studio에서 직접 엽니다.

실제로 창을 열기 전에 어떤 경로를 사용할지 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run android:open:dry-run
```

4. 에뮬레이터로 실행하면 기본 URL인 `http://10.0.2.2:3000/mobile-app`을 로드합니다.

실제 앱 실행 확인은 [QA_CHECKLIST.md](./QA_CHECKLIST.md)를 기준으로 진행합니다.

## 정적 검증

Android 실행 준비 상태를 한 번에 점검하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run android:doctor
```

이 명령은 SDK 경로 설정, Android Studio 열기 dry-run, Android 빌드 환경 진단, 연결된 기기/에뮬레이터 진단을 순서대로 실행합니다.

시연 전 전체 앱 상태를 빠르게 점검하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run mobile:check
```

이 명령은 정적 앱/Android 셸 검증, 런타임 라우트 검증, lint를 순서대로 실행합니다. Android APK 빌드와 에뮬레이터 실행은 Android Studio에서 별도로 확인해야 합니다.

제출 또는 시연 직전에는 프로덕션 빌드까지 함께 확인합니다.

```powershell
npm.cmd run mobile:release-check
```

이 명령은 `mobile:check`를 먼저 실행한 뒤 `next build`까지 확인합니다. Next.js 빌드가 `next-env.d.ts`를 자동으로 바꾸는 경우에는 검증 후 원래 내용으로 되돌립니다.

Android Studio에서 빌드하기 전에 웹 프로젝트 루트에서 다음 명령을 실행합니다.

```powershell
npm.cmd run verify:kbo-app
```

이 명령은 모바일 앱 라우트, PWA manifest/service worker, 웹-앱 딥링크, 포트폴리오 개선안 근거, Android 셸 구성을 함께 확인합니다.

Android 셸만 따로 확인하고 싶을 때는 다음 명령을 실행합니다.

```powershell
npm.cmd run verify:android
```

이 명령은 Android 필수 파일, `AndroidManifest.xml` 권한/딥링크, WebView 설정, JavaScript bridge, 알림 bridge, 이미지 파일 선택, 웹-앱 연결 컴포넌트가 빠지지 않았는지 확인합니다.

Gradle wrapper 또는 시스템 Gradle이 준비된 환경에서는 CLI로 debug APK 빌드도 시도할 수 있습니다. 현재 PC처럼 Gradle이 없으면 명확한 안내를 출력합니다.

```powershell
npm.cmd run android:build
```

빌드 뒤 연결된 기기에 바로 설치하려면 다음처럼 실행합니다.

```powershell
npm.cmd run android:build -- --install
```

`--install`은 debug APK 기준으로 사용합니다. release APK는 일반적으로 별도 서명이 필요하므로 `npm.cmd run android:build -- --release`로 산출물을 만든 뒤 Android Studio 또는 서명 설정을 통해 배포용 APK/AAB를 준비합니다.

실제로 빌드하지 않고 어떤 빌드 명령을 사용할지만 확인하려면 dry-run을 사용합니다.

```powershell
npm.cmd run android:build:dry-run
```

PowerShell에서 `JAVA_HOME is not set` 오류가 나오면 Android Studio 안에서는 Java가 잡히지만 터미널 환경변수에는 Java가 없는 상태입니다. `npm.cmd run android:build`는 Android Studio에 포함된 JBR을 자동으로 `JAVA_HOME`처럼 사용하도록 처리합니다. Gradle을 직접 실행하려면 PowerShell에서 아래처럼 설정한 뒤 실행합니다.

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
```

## 빌드 오류 해결

Android Studio에서 `Inconsistent JVM-target compatibility detected` 오류가 나오면 Java 컴파일 타깃과 Kotlin JVM 타깃이 서로 다르다는 뜻입니다. 이 프로젝트는 `android/app/build.gradle.kts`에서 둘 다 Java 17 기준으로 맞춥니다.

```kotlin
compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}
```

수정 후 Android Studio에서 `Sync Project with Gradle Files`를 다시 실행하고 Run을 누릅니다.

현재 PC에서 CLI APK 빌드가 가능한지 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run verify:android:env
```

이 명령은 Android Studio, Gradle wrapper, 시스템 Gradle, Java, Android SDK, ADB 상태를 진단합니다. 현재 프로젝트에는 Gradle wrapper가 포함되어 있지 않으므로 CLI APK 빌드는 별도 Gradle 설정이 필요합니다. Android Studio IDE 실행은 Android Studio, Java, SDK, ADB가 감지되면 가능합니다.

연결된 Android 기기나 생성된 에뮬레이터가 있는지 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run verify:android:devices
```

이 명령은 `adb devices`와 `emulator -list-avds` 결과를 보여줍니다. 결과가 비어 있으면 Android Studio에서 Virtual Device를 만들거나 USB 디버깅이 켜진 실제 기기를 연결해야 합니다.

에뮬레이터가 하나도 없다면 Android Studio에서 다음 순서로 준비합니다.

1. `Tools > SDK Manager`에서 `Android SDK Command-line Tools`와 필요한 Android system image를 설치합니다.
2. `Tools > Device Manager`에서 `Create device`를 선택합니다.
3. Pixel 계열 기기를 선택하고 설치한 system image를 연결합니다.
4. 생성된 AVD를 실행한 뒤 `npm.cmd run verify:android:devices`로 `Runnable Android target ready: yes`가 뜨는지 확인합니다.

앱 설치 후 딥링크와 공유 진입 명령을 한 번에 점검하려면 smoke test를 사용합니다. 기본값은 dry-run이라 기기가 없어도 어떤 ADB 명령이 만들어지는지 확인할 수 있습니다.

```powershell
npm.cmd run android:smoke
```

에뮬레이터나 실제 기기에 앱이 설치되어 있고 `verify:android:devices`에서 실행 가능한 대상이 보이면 실제 명령을 보냅니다.

```powershell
npm.cmd run android:smoke -- --run
```

연결된 기기가 여러 대라면 serial을 지정합니다.

```powershell
npm.cmd run android:smoke -- --run --serial emulator-5554
```

## 런타임 라우트 검증

모바일 앱 화면과 PWA 파일이 실제 HTTP 요청으로 열리는지 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run verify:kbo-app:runtime
```

이 명령은 임시 Next.js 개발 서버를 `127.0.0.1:3012`에 띄운 뒤 `/mobile-app`, `/portfolio/kbo-app`, `/manifest.webmanifest`, `/sw.js`, `/icon.svg`가 200 응답을 반환하고 필수 문구를 포함하는지 확인한 다음 서버를 종료합니다.

## 실제 기기 또는 배포 URL 연결

에뮬레이터, 실제 기기, 배포 환경에 따라 `android/gradle.properties`의 `KBO_WEB_APP_URL`을 바꿉니다. 손으로 수정할 수도 있지만, 아래 명령을 쓰면 `/mobile-app` 경로를 검증하면서 안전하게 변경할 수 있습니다.

에뮬레이터 기본값으로 되돌릴 때:

```powershell
npm.cmd run android:set-url -- emulator
```

실제 기기에서 같은 Wi-Fi의 PC 개발 서버를 볼 때:

```powershell
npm.cmd run android:set-url -- local 192.168.0.10
```

배포 URL로 연결할 때:

```powershell
npm.cmd run android:set-url -- url https://your-domain.example/mobile-app
```

실제로 파일을 바꾸기 전에 결과만 확인하려면 `--dry-run`을 붙입니다.

```powershell
npm.cmd run android:set-url -- --dry-run url https://your-domain.example/mobile-app
```

직접 수정하는 경우에는 `android/gradle.properties`의 값을 아래처럼 맞춥니다.

```properties
KBO_WEB_APP_URL=https://your-domain.example/mobile-app
```

실제 기기에서 로컬 서버를 볼 때는 `10.0.2.2` 대신 PC의 같은 Wi-Fi 대역 IP를 사용합니다.

```properties
KBO_WEB_APP_URL=http://192.168.0.10:3000/mobile-app
```

## 앱 셸에서 처리하는 것

- WebView로 KBO Fan Hub 모바일 앱 화면 로드
- 앱 내부 URL은 WebView에서 유지
- 외부 뉴스/링크는 기본 브라우저로 열기
- 로딩 진행률 표시
- 서버 연결 실패 시 재시도 화면 표시
- Android 뒤로가기와 WebView history 연동
- Android 홈 화면 앱 바로가기에서 `앱 홈`, `글쓰기` 진입 지원

## Android 앱 바로가기

Android 홈 화면 또는 런처에서 KBO Fan Hub 앱 아이콘을 길게 누르면 다음 바로가기가 표시됩니다.

- `앱 홈`: `kbofanhub://app`으로 모바일 앱 홈을 엽니다.
- `글쓰기`: `kbofanhub://write?tags=KBO`로 앱 글쓰기 화면을 엽니다.

## 웹과 Android 앱 연결 방식

Android WebView는 user-agent 뒤에 `KboFanHubAndroid/1.0`을 붙입니다.

웹의 `/mobile-app` 화면은 이 값을 감지해 PWA 설치 안내 대신 `Android 앱에서 실행 중` 상태를 보여줍니다.

또한 WebView에는 `window.KboFanHubAndroid` bridge가 주입됩니다.

- `getAppVersion()`: Android 앱 버전 확인
- `getLaunchUrl()`: 앱이 로드하는 웹 URL 확인
- `reloadApp()`: 현재 WebView 새로고침
- `openInBrowser(url)`: 현재 화면 또는 지정 URL을 외부 브라우저로 열기
- `showToast(message)`: Android Toast 표시
- `shareText(text)`: Android 공유 시트 호출
- `getNotificationPermissionState()`: Android 알림 권한 상태 확인
- `requestNotificationPermission()`: Android 13 이상에서 알림 권한 요청
- `showLocalNotification(title, message)`: Android 로컬 알림 표시
- `showLocalNotificationForUrl(title, message, targetUrl)`: 알림을 누르면 지정한 앱 화면으로 이동

## WebView 파일 업로드

게시글 작성 화면의 이미지 첨부는 WebView의 `onShowFileChooser`를 통해 Android 파일 선택기로 연결됩니다.

확인 흐름:

1. 앱에서 `/mobile-app/write` 또는 웹 글쓰기 화면으로 이동합니다.
2. 이미지 첨부 버튼을 누릅니다.
3. Android 파일 선택기에서 이미지를 고릅니다.
4. 선택한 이미지가 글쓰기 화면 미리보기와 본문에 반영되는지 확인합니다.

별도 저장소 권한을 직접 요청하지 않고 Android 파일 선택기가 반환하는 `content://` URI를 WebView에 전달합니다.

## 딥링크

앱은 `kbofanhub://` custom scheme을 받을 수 있습니다.

- `kbofanhub://app`: 모바일 앱 홈
- `kbofanhub://posts/{postId}`: 앱 전용 게시글 상세
- `kbofanhub://games/{gameId}?date=YYYY-MM-DD`: 앱 전용 경기방
- `kbofanhub://write?title=...&tags=...`: 앱 전용 글쓰기

앱이 이미 실행 중이어도 `singleTop` + `onNewIntent`로 새 딥링크를 받아 해당 웹 라우트로 이동합니다.

## ADB 딥링크 테스트

에뮬레이터나 실제 기기에 앱이 설치되어 있으면 웹 프로젝트 루트에서 다음 명령으로 딥링크를 바로 실행할 수 있습니다.

```powershell
npm.cmd run android:deep-link -- app
npm.cmd run android:deep-link -- post <postId>
npm.cmd run android:deep-link -- game <gameId> 2026-06-09
npm.cmd run android:deep-link -- write "오늘 경기 리뷰"
```

연결된 기기가 여러 대라면 `--serial` 옵션으로 대상을 지정합니다.

```powershell
npm.cmd run android:deep-link -- --serial emulator-5554 game <gameId> 2026-06-09
```

실제로 실행하지 않고 어떤 ADB 명령이 만들어지는지만 확인하려면 `--dry-run`을 붙입니다.

```powershell
npm.cmd run android:deep-link -- --dry-run post <postId>
```

## Android 공유 시트 테스트

다른 앱에서 뉴스 URL이나 텍스트를 공유받으면 KBO Fan Hub는 `/mobile-app/write` 화면을 열고 제목, 본문, 태그 초안을 채웁니다.

ADB로 공유 시트 수신 흐름을 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run android:share -- --subject "KBO 뉴스" "https://sports.news.example/kbo"
```

실제로 실행하지 않고 ADB 명령만 확인하려면 `--dry-run`을 붙입니다.

```powershell
npm.cmd run android:share -- --dry-run --subject "KBO 뉴스" "https://sports.news.example/kbo"
```

앱이 정상적으로 공유를 받으면 글쓰기 화면에서 공유 초안 안내가 표시됩니다. 제목은 공유 제목 또는 `공유한 야구 링크`, 본문은 공유 내용, 태그는 `KBO, 뉴스, 공유`로 채워집니다.

## Android Studio 검증 체크리스트

앱 실행 후 `MY > 앱 연동 상태`에서 다음 항목을 확인합니다.

- `Android 앱 v1.0.0`으로 표시되는지 확인
- 사용 가능 기능에 `Toast / Share / Reload / Browser / Notify`가 표시되는지 확인
- `Toast 테스트`를 눌렀을 때 Android Toast가 뜨는지 확인
- `알림 테스트`를 눌렀을 때 Android 알림 권한 요청 또는 로컬 알림이 뜨는지 확인
- 로컬 알림을 눌렀을 때 알림을 보낸 앱 화면으로 다시 이동하는지 확인
- `앱 새로고침`을 눌렀을 때 WebView가 새로고침되는지 확인
- `브라우저에서 열기`를 눌렀을 때 현재 화면이 외부 브라우저로 열리는지 확인

글쓰기 연동은 다음 흐름으로 확인합니다.

- `MY > 앱 홈` 또는 하단 탭에서 글쓰기 화면으로 이동
- 이미지 첨부 버튼을 누른 뒤 Android 파일 선택기가 열리는지 확인
- 선택한 이미지가 글쓰기 미리보기와 게시글 본문에 반영되는지 확인
- 작성 완료 후 앱 게시글 상세와 웹 게시글 상세에서 같은 게시글이 보이는지 확인

딥링크는 웹 게시글 상세 또는 웹 경기방의 `앱으로 열기` 버튼으로 확인합니다.

- 웹 게시글 상세에서 `앱으로 열기` 클릭
- Android 앱이 설치되어 있으면 `kbofanhub://posts/{postId}`로 앱 게시글 상세 이동
- 웹 경기방에서 `앱으로 열기` 클릭
- Android 앱이 설치되어 있으면 `kbofanhub://games/{gameId}?date=YYYY-MM-DD`로 앱 경기방 이동

반대로 Android 앱 안에서 웹 원본을 열 때는 다음 흐름으로 확인합니다.

- 앱 게시글 상세에서 `웹에서 보기` 클릭
- Android 앱에서는 외부 브라우저로 `/posts/{postId}` 웹 게시글 상세가 열리는지 확인
- 앱 경기방에서 `웹 경기방으로 보기` 클릭
- Android 앱에서는 외부 브라우저로 `/games/{gameId}?date=YYYY-MM-DD` 웹 경기방이 열리는지 확인
