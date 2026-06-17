// 📌 OpenAI API 래퍼. 텍스트 임베딩 생성과 채팅 응답 생성을 담당한다.
// RAG(유사 코스 추천·Q&A)와 이후 AI Agent 단계에서 공통으로 쓰인다.
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

// text-embedding-3-small은 1536차원 벡터를 만든다. (schema의 vector(1536)과 일치)
const EMBEDDING_MODEL = 'text-embedding-3-small';
// gpt-4o: 프롬프트 지시(질문 중심 답변, 부가정보 생략)를 mini보다 잘 따른다.
const CHAT_MODEL = 'gpt-4o';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY가 비어 있습니다. RAG/AI 기능은 비활성화됩니다.',
      );
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  // OpenAI 키가 설정돼 있는지 여부. (RAG 기능 사용 가능 판단)
  get enabled(): boolean {
    return this.client !== null;
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error(
        'OPENAI_API_KEY가 설정되지 않아 AI 기능을 사용할 수 없습니다.',
      );
    }
    return this.client;
  }

  // 텍스트 하나를 1536차원 임베딩 벡터로 변환한다.
  async embed(text: string): Promise<number[]> {
    const client = this.ensureClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, ' ').slice(0, 8000),
    });
    return response.data[0].embedding;
  }

  // 시스템 프롬프트 + 사용자 질문으로 채팅 응답을 생성한다.
  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = this.ensureClient();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return response.choices[0].message.content ?? '';
  }

  // function calling용 호출. 대화 메시지와 도구 목록을 받아 모델의 응답 메시지를
  // (tool_calls 포함 가능) 그대로 돌려준다. AI Agent의 루프에서 사용한다.
  async chatWithTools(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const client = this.ensureClient();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      // 게시판 근거에 충실하도록 낮게 유지 (덜 창의적 = 덜 지어냄)
      temperature: 0.2,
      messages,
      tools,
      tool_choice: 'auto',
    });
    return response.choices[0].message;
  }
}
