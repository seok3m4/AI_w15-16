import {
  callBaseballBriefingTool,
  listBaseballBriefingTools,
} from "@/lib/mcp/baseball-briefing-tools";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

export type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      error: {
        code: number;
        message: string;
      };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRequestId(payload: unknown): JsonRpcId {
  if (!isRecord(payload)) {
    return null;
  }

  const { id } = payload;

  return typeof id === "string" || typeof id === "number" || id === null
    ? id
    : null;
}

function getToolCallParams(params: unknown): {
  name: string;
  arguments: Record<string, unknown>;
} {
  if (!isRecord(params) || typeof params.name !== "string") {
    throw new Error("tools/call requires a tool name.");
  }

  return {
    name: params.name,
    arguments: isRecord(params.arguments) ? params.arguments : {},
  };
}

function createResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function createError(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

export async function handleBaseballMcpJsonRpc(
  payload: unknown,
): Promise<JsonRpcResponse> {
  const id = getRequestId(payload);

  if (!isRecord(payload) || payload.jsonrpc !== "2.0") {
    return createError(id, -32600, "Invalid JSON-RPC request.");
  }

  const request = payload as JsonRpcRequest;

  try {
    if (request.method === "tools/list") {
      return createResult(id, {
        tools: listBaseballBriefingTools(),
      });
    }

    if (request.method === "tools/call") {
      const params = getToolCallParams(request.params);
      const result = await callBaseballBriefingTool(
        params.name,
        params.arguments,
      );

      return createResult(id, result);
    }

    return createError(id, -32601, `Unknown MCP method: ${request.method}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MCP tool execution failed.";

    return createError(id, -32000, message);
  }
}

export async function invokeBaseballMcpTool(
  name: string,
  args: Record<string, unknown>,
) {
  const response = await handleBaseballMcpJsonRpc({
    jsonrpc: "2.0",
    id: `tool-${Date.now()}`,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });

  if ("error" in response) {
    throw new Error(response.error.message);
  }

  return response.result;
}
