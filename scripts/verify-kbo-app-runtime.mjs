import { spawn, spawnSync } from "node:child_process";

const port = Number(process.env.KBO_APP_VERIFY_PORT || 3012);
const fallbackExistingBaseUrl =
  process.env.KBO_APP_EXISTING_BASE_URL || "http://127.0.0.1:3000";
let baseUrl = process.env.KBO_APP_VERIFY_BASE_URL || `http://127.0.0.1:${port}`;
const serverCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const serverArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd", "run", "dev", "--", "-H", "127.0.0.1", "-p", String(port)]
    : ["run", "dev", "--", "-H", "127.0.0.1", "-p", String(port)];
const serverReadyTimeoutMs = 30_000;

const routes = [
  {
    path: "/mobile-app",
    expectedStatus: 200,
    includes: ["KBO Fan Hub", "/manifest.webmanifest"],
  },
  {
    path:
      "/mobile-app/write?title=KBO%20%EB%89%B4%EC%8A%A4&content=%EA%B3%B5%EC%9C%A0%20%EB%82%B4%EC%9A%A9%3A%0Ahttps%3A%2F%2Fsports.news.example%2Fkbo&tags=KBO,%EB%89%B4%EC%8A%A4,%EA%B3%B5%EC%9C%A0&source=android-share",
    expectedStatus: 200,
    includes: ["공유한 내용으로 초안을 채웠습니다", "로그인 상태를 확인하는 중입니다."],
  },
  {
    path:
      "/mobile-app/write?source=web-share&tags=KBO,%EB%89%B4%EC%8A%A4,%EA%B3%B5%EC%9C%A0&title=KBO%20%EB%89%B4%EC%8A%A4&text=%EB%9D%BC%EC%9D%B8%EC%97%85%20%EA%B3%B5%EA%B0%9C&url=https%3A%2F%2Fsports.news.example%2Fkbo",
    expectedStatus: 200,
    includes: ["공유한 내용으로 초안을 채웠습니다", "로그인 상태를 확인하는 중입니다."],
  },
  {
    path: "/portfolio/kbo-app",
    expectedStatus: 200,
    includes: ["KBO Fan Hub", "https://m.koreabaseball.com/"],
  },
  {
    path: "/manifest.webmanifest",
    expectedStatus: 200,
    includes: [
      '"start_url":"/mobile-app"',
      '"display":"standalone"',
      '"share_target"',
      '"/mobile-app/write?source=web-share',
    ],
  },
  {
    path: "/sw.js",
    expectedStatus: 200,
    includes: ["CACHE_NAME", '"/mobile-app"'],
  },
  {
    path: "/icon.svg",
    expectedStatus: 200,
    includes: ["<svg", "K"],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/mobile-app`, 3_000);

      if (response.status === 200) {
        return;
      }
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`Next.js dev server was not ready within ${serverReadyTimeoutMs}ms.`);
}

async function isServerReady(candidateBaseUrl) {
  try {
    const response = await fetchWithTimeout(`${candidateBaseUrl}/mobile-app`, 3_000);

    return response.status === 200;
  } catch {
    return false;
  }
}

function stopServer(server) {
  if (!server || server.killed) {
    return;
  }

  if (process.platform === "win32" && server.pid) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  server.kill("SIGTERM");
}

function createProcessEnv() {
  if (process.platform !== "win32") {
    return process.env;
  }

  const entries = Object.entries(process.env);
  const normalized = {};
  let pathValue;

  for (const [key, value] of entries) {
    if (key.toLowerCase() === "path") {
      pathValue ||= value;
      continue;
    }

    normalized[key] = value;
  }

  if (pathValue) {
    normalized.Path = pathValue;
  }

  return normalized;
}

async function verifyRoute(route) {
  const response = await fetchWithTimeout(`${baseUrl}${route.path}`, 10_000);
  const body = await response.text();

  if (response.status !== route.expectedStatus) {
    throw new Error(
      `${route.path} returned ${response.status}, expected ${route.expectedStatus}.`,
    );
  }

  for (const marker of route.includes) {
    if (!body.includes(marker)) {
      throw new Error(`${route.path} did not include required marker: ${marker}`);
    }
  }

  return { path: route.path, status: response.status, bytes: body.length };
}

const serverLogs = [];
let server = null;

try {
  if (process.env.KBO_APP_VERIFY_BASE_URL) {
    baseUrl = process.env.KBO_APP_VERIFY_BASE_URL.replace(/\/$/, "");
    await waitForServer();
  } else if (await isServerReady(fallbackExistingBaseUrl)) {
    baseUrl = fallbackExistingBaseUrl.replace(/\/$/, "");
    console.log(`Using existing Next.js dev server: ${baseUrl}`);
  } else {
    server = spawn(
      serverCommand,
      serverArgs,
      {
        cwd: process.cwd(),
        env: createProcessEnv(),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    server.stdout.on("data", (chunk) => {
      serverLogs.push(chunk.toString());
    });

    server.stderr.on("data", (chunk) => {
      serverLogs.push(chunk.toString());
    });

    await waitForServer();
  }

  const results = [];

  for (const route of routes) {
    results.push(await verifyRoute(route));
  }

  console.log("KBO app runtime verification passed.");

  for (const result of results) {
    console.log(`- ${result.path}: ${result.status}, ${result.bytes} bytes`);
  }
} catch (error) {
  console.error("KBO app runtime verification failed.");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("\nServer output:");
  console.error(serverLogs.join("").split(/\r?\n/).slice(-80).join("\n"));
  process.exitCode = 1;
} finally {
  if (server) {
    stopServer(server);
  }
  process.exit(process.exitCode ?? 0);
}
