import { NextResponse } from "next/server";

import { handleBaseballMcpJsonRpc } from "@/lib/mcp/json-rpc";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.MCP_SHARED_SECRET?.trim();

  if (!secret) {
    return true;
  }

  return request.headers.get("x-mcp-secret") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "권한을 확인해주세요.",
        },
      },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "요청 내용을 확인해주세요.",
        },
      },
      { status: 400 },
    );
  }

  const response = await handleBaseballMcpJsonRpc(body);
  const status = "error" in response ? 400 : 200;

  return NextResponse.json(response, { status });
}
