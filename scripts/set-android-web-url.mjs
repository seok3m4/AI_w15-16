import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const gradlePropertiesPath = path.join(rootDir, "android", "gradle.properties");
const defaultPort = "3000";
const emulatorUrl = "http://10.0.2.2:3000/mobile-app";

function printUsage() {
  console.log(`Usage:
  npm.cmd run android:set-url -- emulator
  npm.cmd run android:set-url -- local <pc-lan-ip> [--port 3000]
  npm.cmd run android:set-url -- url <https://your-domain.example/mobile-app>
  npm.cmd run android:set-url -- <https://your-domain.example/mobile-app>

Options:
  --dry-run  Print the next KBO_WEB_APP_URL without writing android/gradle.properties
`);
}

function normalizeMobileAppUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("KBO_WEB_APP_URL must start with http:// or https://");
  }

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/mobile-app";
  }

  if (!url.pathname.endsWith("/mobile-app")) {
    throw new Error("KBO_WEB_APP_URL must point to the /mobile-app route.");
  }

  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function parseArgs(argv) {
  const args = [...argv];
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const portIndex = args.indexOf("--port");
  let port = defaultPort;

  if (dryRun) {
    args.splice(args.indexOf("--dry-run"), 1);
  }

  if (portIndex >= 0) {
    port = args[portIndex + 1] ?? "";
    args.splice(portIndex, 2);
  }

  if (help) {
    return { help: true };
  }

  const [mode = "emulator", value] = args;

  if (mode === "emulator") {
    return { dryRun, nextUrl: emulatorUrl };
  }

  if (mode === "local") {
    if (!value) {
      throw new Error("PC LAN IP is required for local mode.");
    }

    return {
      dryRun,
      nextUrl: normalizeMobileAppUrl(`http://${value}:${port}/mobile-app`),
    };
  }

  if (mode === "url") {
    if (!value) {
      throw new Error("URL is required for url mode.");
    }

    return { dryRun, nextUrl: normalizeMobileAppUrl(value) };
  }

  return { dryRun, nextUrl: normalizeMobileAppUrl(mode) };
}

function updateGradleProperties(nextUrl, dryRun) {
  if (!existsSync(gradlePropertiesPath)) {
    throw new Error(`android/gradle.properties was not found: ${gradlePropertiesPath}`);
  }

  const currentContent = readFileSync(gradlePropertiesPath, "utf8");
  const nextLine = `KBO_WEB_APP_URL=${nextUrl}`;
  const nextContent = currentContent.includes("KBO_WEB_APP_URL=")
    ? currentContent.replace(/^KBO_WEB_APP_URL=.*$/m, nextLine)
    : `${currentContent.replace(/\s*$/, "")}\n${nextLine}\n`;

  console.log(`Next KBO_WEB_APP_URL: ${nextUrl}`);

  if (dryRun) {
    console.log("Dry run only. android/gradle.properties was not changed.");
    return;
  }

  writeFileSync(gradlePropertiesPath, nextContent);
  console.log("Updated android/gradle.properties.");
}

try {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    printUsage();
    process.exit(0);
  }

  updateGradleProperties(parsed.nextUrl, parsed.dryRun);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
