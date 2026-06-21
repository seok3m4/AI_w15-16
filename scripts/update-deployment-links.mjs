import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function printUsage() {
  console.log(`Usage:
  npm.cmd run deploy:update-links -- --web-url https://your-project.vercel.app

Options:
  --release-url https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0
  --dry-run
`);
}

function readOption(name) {
  const index = args.indexOf(name);

  if (index < 0) {
    return "";
  }

  return args[index + 1] ?? "";
}

function normalizeWebUrl(value) {
  if (!value) {
    throw new Error("--web-url is required.");
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid --web-url: ${value}`);
  }

  if (url.protocol !== "https:") {
    throw new Error("--web-url must start with https://");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function normalizeReleaseUrl(value) {
  if (!value) {
    return "https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0";
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid --release-url: ${value}`);
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("--release-url must be a https://github.com/... URL");
  }

  return url.toString().replace(/\/$/, "");
}

function replaceAll(content, replacements) {
  return replacements.reduce(
    (nextContent, [from, to]) => nextContent.split(from).join(to),
    content,
  );
}

function updateFile(filePath, replacements) {
  const absolutePath = path.join(rootDir, filePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const before = readFileSync(absolutePath, "utf8");
  const after = replaceAll(before, replacements);

  if (before === after) {
    console.log(`No changes: ${filePath}`);
    return;
  }

  console.log(`${dryRun ? "Would update" : "Updated"}: ${filePath}`);

  if (!dryRun) {
    writeFileSync(absolutePath, after, "utf8");
  }
}

try {
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const webUrl = normalizeWebUrl(readOption("--web-url"));
  const releaseUrl = normalizeReleaseUrl(readOption("--release-url"));
  const replacements = [
    ["https://<vercel-domain>", webUrl],
    ["https://<vercel-domain>/mobile-app", `${webUrl}/mobile-app`],
    ["https://<vercel-domain>/portfolio/kbo-app", `${webUrl}/portfolio/kbo-app`],
    [
      "https://github.com/kominsuk1064/jungle-ai-board/releases/tag/v0.1.0",
      releaseUrl,
    ],
  ];

  for (const filePath of [
    "README.md",
    "docs/portfolio.md",
    "docs/release-notes-v0.1.0.md",
  ]) {
    updateFile(filePath, replacements);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}
