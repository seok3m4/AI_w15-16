import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const rootDir = process.cwd();
const androidDir = path.join(rootDir, "android");
const isWindows = process.platform === "win32";
const dryRun = process.argv.includes("--dry-run");
const installAfterBuild = process.argv.includes("--install");
const buildVariant = process.argv.includes("--release") ? "release" : "debug";
const task = buildVariant === "release" ? "assembleRelease" : "assembleDebug";
const apkFileNames =
  buildVariant === "release"
    ? ["app-release.apk", "app-release-unsigned.apk"]
    : ["app-debug.apk"];

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    env: createProcessEnv(),
    stdio: options.stdio ?? "inherit",
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
    error: result.error,
  };
}

function createProcessEnv() {
  if (!isWindows) {
    return process.env;
  }

  const normalized = {};
  let pathValue;
  const bundledJavaHome = findAndroidStudioBundledJavaHome();

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === "path") {
      pathValue ||= value;
      continue;
    }

    normalized[key] = value;
  }

  if (!normalized.JAVA_HOME && bundledJavaHome) {
    normalized.JAVA_HOME = bundledJavaHome;
  }

  if (pathValue) {
    normalized.Path = bundledJavaHome
      ? `${path.join(bundledJavaHome, "bin")}${path.delimiter}${pathValue}`
      : pathValue;
  }

  return normalized;
}

function findAndroidStudioBundledJavaHome() {
  if (!isWindows) {
    return "";
  }

  const candidates = [
    path.join("C:", "Program Files", "Android", "Android Studio", "jbr"),
    path.join(os.homedir(), "AppData", "Local", "Programs", "Android Studio", "jbr"),
  ];

  return candidates.find((candidate) =>
    existsSync(path.join(candidate, "bin", "java.exe")),
  ) ?? "";
}

function commandExists(command) {
  const result = spawnSync(isWindows ? "where" : "which", [command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0;
}

function findAndroidSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWindows ? path.join(os.homedir(), "AppData", "Local", "Android", "Sdk") : "",
    process.platform === "darwin" ? path.join(os.homedir(), "Library", "Android", "sdk") : "",
    process.platform === "linux" ? path.join(os.homedir(), "Android", "Sdk") : "",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}

function findGradleCommand() {
  const wrapperPath = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

  if (existsSync(wrapperPath)) {
    return {
      command: wrapperPath,
      argsPrefix: [],
      label: "Gradle wrapper",
    };
  }

  if (commandExists("gradle")) {
    return {
      command: "gradle",
      argsPrefix: [],
      label: "system Gradle",
    };
  }

  return null;
}

function buildInstallCommand(apkPath) {
  const sdkPath = findAndroidSdk();
  const adbPath = sdkPath
    ? path.join(sdkPath, "platform-tools", isWindows ? "adb.exe" : "adb")
    : "adb";

  return {
    command: adbPath,
    args: ["install", "-r", apkPath],
  };
}

function findApkPath() {
  const apkDir = path.join(androidDir, "app", "build", "outputs", "apk", buildVariant);

  for (const fileName of apkFileNames) {
    const candidate = path.join(apkDir, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return path.join(apkDir, apkFileNames[0]);
}

function createGradleExecution(command, args) {
  if (isWindows && command.endsWith(".bat")) {
    const escapePowerShellValue = (value) => value.replaceAll("'", "''");
    const commandLine = [
      `& '${escapePowerShellValue(command)}'`,
      ...args.map((arg) => `'${escapePowerShellValue(arg)}'`),
    ].join(" ");

    return {
      command: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", commandLine],
    };
  }

  return { command, args };
}

const gradle = findGradleCommand();
const buildArgs = [...(gradle?.argsPrefix ?? []), task];
const javaHome = findAndroidStudioBundledJavaHome();
const expectedApkPath = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  buildVariant,
  apkFileNames[0],
);

if (installAfterBuild && buildVariant === "release") {
  console.error(
    "Release APK install is not handled by this helper because release builds usually need signing first.",
  );
  console.error("Use the default debug build with `--install`, or sign the release APK separately.");

  if (!dryRun) {
    process.exit(1);
  }
}

if (!gradle) {
  console.error("Android APK build command is not ready.");
  console.error("Gradle wrapper was not found and system Gradle is not on PATH.");
  console.error("Next options:");
  console.error("- Open android/ in Android Studio and run the app from the IDE.");
  console.error("- Or install Gradle / add a Gradle wrapper, then run this command again.");
  console.error("\nYou can still inspect the intended build task:");
  console.error(`  ${isWindows ? "gradlew.bat" : "./gradlew"} ${task}`);
  process.exitCode = dryRun ? 0 : 1;
  process.exit();
}

console.log(`Android build tool: ${gradle.label}`);
console.log(`Android build command: ${gradle.command} ${buildArgs.join(" ")}`);
if (javaHome && !process.env.JAVA_HOME) {
  console.log(`Using Android Studio bundled JAVA_HOME: ${javaHome}`);
}
console.log(`Expected APK path: ${expectedApkPath}`);

if (installAfterBuild) {
  const installCommand = buildInstallCommand(expectedApkPath);
  console.log(`Android install command: ${installCommand.command} ${installCommand.args.join(" ")}`);
}

if (dryRun) {
  console.log("Dry run only. APK was not built.");
  process.exit(0);
}

const setupResult = run(
  process.platform === "win32" ? "cmd.exe" : "npm",
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd", "run", "android:setup-local"]
    : ["run", "android:setup-local"],
);

if (!setupResult.ok) {
  console.error("Failed to prepare android/local.properties.");
  process.exit(setupResult.status || 1);
}

const gradleExecution = createGradleExecution(gradle.command, buildArgs);
const buildResult = run(gradleExecution.command, gradleExecution.args, {
  cwd: androidDir,
});

if (!buildResult.ok) {
  console.error("Android APK build failed.");
  process.exit(buildResult.status || 1);
}

const apkPath = findApkPath();
console.log(`Android APK build finished: ${apkPath}`);

if (installAfterBuild) {
  const installCommand = buildInstallCommand(apkPath);
  const installResult = run(installCommand.command, installCommand.args);

  if (!installResult.ok) {
    console.error("Android APK install failed.");
    process.exit(installResult.status || 1);
  }

  console.log("Android APK was installed.");
}
