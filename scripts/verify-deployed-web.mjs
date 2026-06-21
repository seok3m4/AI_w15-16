const args = process.argv.slice(2);
const baseUrl = normalizeBaseUrl(args[0] ?? process.env.KBO_TALK_DEPLOYMENT_URL ?? "");

const checks = [
  {
    path: "/",
    label: "web home",
    includes: ["KBO Talk"],
  },
  {
    path: "/mobile-app",
    label: "mobile app",
    includes: ["KBO Fan Hub"],
  },
  {
    path: "/portfolio/kbo-app",
    label: "portfolio case study",
    includes: ["KBO 앱 개선 제안서"],
  },
  {
    path: "/manifest.webmanifest",
    label: "PWA manifest",
    includes: ["KBO Fan Hub", "/mobile-app"],
  },
  {
    path: "/sw.js",
    label: "service worker",
    includes: ["kbo-fan-hub", "APP_SHELL"],
  },
];

function printUsage() {
  console.log(`Usage:
  npm.cmd run deploy:verify -- https://your-project.vercel.app

Or:
  $env:KBO_TALK_DEPLOYMENT_URL="https://your-project.vercel.app"
  npm.cmd run deploy:verify
`);
}

function normalizeBaseUrl(value) {
  if (!value) {
    printUsage();
    throw new Error("Deployment URL is required.");
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid deployment URL: ${value}`);
  }

  if (url.protocol !== "https:") {
    throw new Error("Deployment URL must start with https://");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

async function fetchText(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "kbo-talk-deployment-verifier/1.0",
    },
  });
  const body = await response.text();

  return {
    body,
    ok: response.ok,
    status: response.status,
    url,
  };
}

try {
  console.log(`Deployment URL: ${baseUrl}`);

  for (const check of checks) {
    const result = await fetchText(check.path);

    if (!result.ok) {
      throw new Error(`${check.label} failed: ${result.status} ${result.url}`);
    }

    for (const expectedText of check.includes) {
      if (!result.body.includes(expectedText)) {
        throw new Error(
          `${check.label} did not include "${expectedText}": ${result.url}`,
        );
      }
    }

    console.log(`OK ${check.label}: ${result.url}`);
  }

  console.log("Deployment verification passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
