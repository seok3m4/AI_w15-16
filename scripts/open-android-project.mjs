import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const androidDir = path.join(rootDir, "android");
const dryRun = process.argv.includes("--dry-run");

function findAndroidStudio() {
  const explicitPath = process.env.ANDROID_STUDIO_PATH;

  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  if (process.platform === "win32") {
    const candidates = [
      path.join("C:", "Program Files", "Android", "Android Studio", "bin", "studio64.exe"),
      path.join("C:", "Program Files", "Android", "Android Studio", "bin", "studio.bat"),
      path.join(os.homedir(), "AppData", "Local", "Programs", "Android Studio", "bin", "studio64.exe"),
      path.join(os.homedir(), "AppData", "Local", "JetBrains", "Toolbox", "apps", "AndroidStudio"),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  if (process.platform === "darwin") {
    const macPath = "/Applications/Android Studio.app";

    return existsSync(macPath) ? macPath : null;
  }

  return null;
}

function getOpenCommand(androidStudioPath) {
  if (androidStudioPath) {
    if (process.platform === "darwin" && androidStudioPath.endsWith(".app")) {
      return {
        command: "open",
        args: ["-a", androidStudioPath, androidDir],
      };
    }

    return {
      command: androidStudioPath,
      args: [androidDir],
    };
  }

  if (process.platform === "win32") {
    return {
      command: "explorer.exe",
      args: [androidDir],
      fallback: true,
    };
  }

  if (process.platform === "darwin") {
    return {
      command: "open",
      args: [androidDir],
      fallback: true,
    };
  }

  return {
    command: "xdg-open",
    args: [androidDir],
    fallback: true,
  };
}

if (!existsSync(androidDir)) {
  console.error(`Android project folder not found: ${androidDir}`);
  process.exit(1);
}

const androidStudioPath = findAndroidStudio();
const openCommand = getOpenCommand(androidStudioPath);

console.log(`Android project: ${androidDir}`);

if (androidStudioPath) {
  console.log(`Android Studio: ${androidStudioPath}`);
} else {
  console.log("Android Studio was not found automatically.");
  console.log("Set ANDROID_STUDIO_PATH to open Android Studio directly.");
}

console.log(`Open command: ${openCommand.command} ${openCommand.args.join(" ")}`);

if (dryRun) {
  console.log("Dry run only. Nothing was opened.");
  process.exit(0);
}

const child = spawn(openCommand.command, openCommand.args, {
  detached: true,
  stdio: "ignore",
});

child.unref();

if (openCommand.fallback) {
  console.log("Opened the android/ folder. Open it with Android Studio from there.");
} else {
  console.log("Opening Android Studio...");
}
