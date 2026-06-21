# KBO Fan Hub Android QA Checklist

이 문서는 Android Studio에서 실제 앱 실행을 확인할 때 사용하는 체크리스트입니다.

자동 검증은 웹/PWA/Android 셸의 파일과 라우트 구성을 확인합니다. 실제 APK 빌드, 에뮬레이터 실행, WebView 상호작용은 아래 항목으로 수동 확인합니다.

## 사전 준비

- [ ] 웹 프로젝트 루트에서 `npm.cmd run android:doctor`로 Android 실행 준비 상태를 한 번에 확인한다.
- [ ] 웹 프로젝트 루트에서 `npm.cmd run mobile:check`가 통과한다.
- [ ] 제출/시연 직전에는 `npm.cmd run mobile:release-check`로 프로덕션 빌드까지 통과한다.
- [ ] 웹 프로젝트 루트에서 `npm.cmd run verify:android:env`로 Gradle/Java/Android SDK/ADB 상태를 확인한다.
- [ ] 웹 프로젝트 루트에서 `npm.cmd run verify:android:devices`로 연결된 기기 또는 생성된 에뮬레이터를 확인한다.
- [ ] 웹 프로젝트 루트에서 `npm.cmd run android:setup-local`로 `android/local.properties`를 생성한다.
- [ ] 웹 프로젝트 루트에서 `npm.cmd run mobile:dev`로 Next.js 서버를 실행한다.
- [ ] `npm.cmd run android:open` 또는 Android Studio의 Open 메뉴로 `android` 폴더를 연다.
- [ ] `npm.cmd run android:build`로 debug APK 빌드를 확인한다.
- [ ] 기기 연결 후 `npm.cmd run android:deep-link -- --dry-run app`으로 ADB 딥링크 명령 생성이 되는지 확인한다.
- [ ] 기기 연결 후 `npm.cmd run android:share -- --dry-run "https://sports.news.example/kbo"`로 ADB 공유 명령 생성이 되는지 확인한다.
- [ ] 앱 설치 후 `npm.cmd run android:smoke -- --run`으로 앱 홈, 글쓰기, 경기방 딥링크와 공유 수신을 한 번에 확인한다.
- [ ] Gradle Sync가 성공한다.
- [ ] Device Manager에서 Android Virtual Device가 1개 이상 준비되어 있다.
- [ ] AVD가 없다면 SDK Manager에서 Android SDK Command-line Tools와 Android Emulator system image를 설치한 뒤 Virtual Device를 생성한다.
- [ ] 에뮬레이터에서 실행할 경우 `KBO_WEB_APP_URL`이 `http://10.0.2.2:3000/mobile-app`인지 확인한다.
- [ ] 실제 기기에서 실행할 경우 `npm.cmd run android:set-url -- local <PC_LAN_IP>`로 `KBO_WEB_APP_URL`을 PC LAN IP로 바꾼다.
- [ ] 배포 URL 테스트는 `npm.cmd run android:set-url -- url <배포_URL>/mobile-app`으로 연결 주소를 바꾼다.
- [ ] GitHub Release에 올릴 APK는 `npm.cmd run android:release`로 빌드한다.

## 앱 실행

- [ ] 앱 실행 시 `/mobile-app` 홈 화면이 WebView 안에서 열린다.
- [ ] 하단 탭 홈/경기/기록/뉴스/MY가 이동한다.
- [ ] MY 화면에서 앱 연동 상태가 `Android 앱 v1.0.0`으로 표시된다.
- [ ] MY 화면에서 Toast, Share, Reload, Browser, Notify 기능이 사용 가능 상태로 보인다.
- [ ] `Toast 테스트` 버튼을 누르면 Android Toast가 표시된다.
- [ ] `앱 새로고침` 버튼을 누르면 WebView가 다시 로드된다.
- [ ] `브라우저에서 열기` 버튼을 누르면 외부 브라우저가 열린다.
- [ ] 런처에서 앱 아이콘을 길게 눌렀을 때 `앱 홈`, `글쓰기` 바로가기가 보인다.
- [ ] `글쓰기` 바로가기를 누르면 앱 글쓰기 화면이 열리고 `KBO` 태그가 채워진다.

## 게시판 연동

- [ ] 모바일 앱에서 게시글 목록을 볼 수 있다.
- [ ] 게시글 상세 화면에서 추천/비추천, 댓글, 공유 버튼이 동작한다.
- [ ] 게시글 상세 화면의 `웹에서 보기` 버튼이 Android 앱에서는 외부 브라우저로 웹 게시글을 연다.
- [ ] 모바일 글쓰기 화면에서 제목, 본문, 태그를 입력해 게시글을 작성할 수 있다.
- [ ] 작성 완료 후 `/mobile-app/posts/{postId}` 상세 화면으로 이동한다.
- [ ] 웹 게시글 상세의 `앱으로 열기` 버튼이 `kbofanhub://posts/{postId}` 딥링크를 호출한다.
- [ ] `npm.cmd run android:deep-link -- post <postId>`로 앱 게시글 상세가 열린다.

## 이미지 첨부

- [ ] 모바일 글쓰기 화면에서 이미지 첨부 버튼을 누르면 Android 파일 선택기가 열린다.
- [ ] 이미지를 선택하면 글쓰기 화면에 미리보기가 표시된다.
- [ ] 작성된 게시글 본문에서 이미지가 깨지지 않고 보인다.

## 경기방 연동

- [ ] 모바일 경기 탭에서 오늘의 경기 목록을 볼 수 있다.
- [ ] 경기방으로 이동하면 경기 요약, 선발/라인업/기록/관련 글 영역이 표시된다.
- [ ] 경기방의 `웹 경기방으로 보기` 버튼이 Android 앱에서는 외부 브라우저로 웹 경기방을 연다.
- [ ] 경기방 공유 버튼이 Android 공유 시트를 연다.
- [ ] 웹 경기방의 `앱으로 열기` 버튼이 `kbofanhub://games/{gameId}?date=YYYY-MM-DD` 딥링크를 호출한다.
- [ ] `npm.cmd run android:deep-link -- game <gameId> YYYY-MM-DD`로 앱 경기방이 열린다.

## 뉴스/외부 링크

- [ ] 모바일 뉴스 탭에서 뉴스 목록이 보인다.
- [ ] 뉴스 브리핑 기능이 URL을 바탕으로 게시글 초안에 활용 가능한 내용을 만든다.
- [ ] 외부 뉴스 URL은 WebView 내부가 아니라 외부 브라우저로 열린다.
- [ ] 다른 앱 또는 `npm.cmd run android:share -- "뉴스 URL"`로 공유한 텍스트가 앱 글쓰기 화면의 제목/본문/태그 초안으로 들어간다.

## 알림

- [ ] Android 13 이상에서 알림 권한 요청 흐름이 열린다.
- [ ] 알림 권한 허용 후 `알림 테스트` 버튼을 누르면 로컬 알림이 표시된다.
- [ ] 알림을 눌렀을 때 앱이 다시 열리고 알림을 보낸 앱 화면으로 이동한다.

## 뒤로가기/오프라인

- [ ] Android 뒤로가기가 WebView history와 연동된다.
- [ ] 첫 화면에서 뒤로가기를 누르면 앱이 종료된다.
- [ ] 웹 서버가 꺼진 상태에서 앱을 실행하면 연결 실패 화면과 재시도 버튼이 보인다.
- [ ] 서버를 다시 켠 뒤 재시도하면 앱 화면이 다시 열린다.

## 확인 결과 기록

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| Gradle Sync |  |  |
| APK Build |  |  |
| Emulator Run |  |  |
| WebView Home |  |  |
| Deep Link |  |  |
| Image Upload |  |  |
| Notification |  |  |
| External Browser |  |  |

## 현재 한계

- 이 저장소에는 Gradle wrapper가 포함되어 있다.
- CLI APK 빌드는 Android SDK와 Java 설정이 필요하다.
- 개발용 기본 URL은 `10.0.2.2`를 사용하므로 실제 기기에서는 배포 URL 또는 PC LAN IP로 변경해야 한다.
- URL 변경 후에는 Android Studio에서 다시 Sync/Run해야 `BuildConfig.KBO_WEB_APP_URL`에 반영된다.
- release APK를 실제 설치 파일로 공유하려면 로컬 keystore로 서명해야 한다.
