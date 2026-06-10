export const DEFAULT_RAG_LIMIT = 3;
export const MAX_RAG_LIMIT = 5;

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

export function getOpenAIApiKey(): string | null {
  return getOptionalEnv("OPENAI_API_KEY");
}

export function getEmbeddingModel(): string {
  return getOptionalEnv("OPENAI_EMBEDDING_MODEL") ?? DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingDimensions(): number {
  const value = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS);

  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_EMBEDDING_DIMENSIONS;
}

export function getChatModel(): string {
  return getOptionalEnv("OPENAI_CHAT_MODEL") ?? DEFAULT_CHAT_MODEL;
}
