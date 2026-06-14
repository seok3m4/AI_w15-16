import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY ?? '';

// Kakao Local API — 키워드로 장소를 검색하고 좌표를 반환한다.
async function searchPlacesKakao(
  query: string,
  page = 1,
  size = 5,
): Promise<KakaoPlace[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error(
      'KAKAO_REST_API_KEY가 설정되지 않았습니다. .env에 추가해 주세요.',
    );
  }

  const params = new URLSearchParams({
    query,
    page: String(page),
    size: String(size),
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kakao API 오류 ${response.status}: ${text}`);
  }

  const data = (await response.json()) as KakaoSearchResponse;
  return data.documents;
}

type KakaoPlace = {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  place_url: string;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
};

type KakaoSearchResponse = {
  documents: KakaoPlace[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
};

// MCP 서버 인스턴스. 이름과 버전은 클라이언트가 연결할 때 확인한다.
const server = new McpServer({
  name: 'jungle-travel-mcp',
  version: '1.0.0',
});

// place_search 도구: 키워드로 장소를 검색하고 이름·주소·좌표를 반환한다.
// AI Agent가 여행 코스 경유지 좌표를 자동으로 채울 때 이 도구를 쓴다.
server.tool(
  'place_search',
  '키워드로 국내 장소를 검색합니다. 장소 이름·도로명 주소·위도(lat)·경도(lng)를 반환합니다.',
  {
    query: z.string().describe('검색할 장소 이름 또는 주소 (예: 해운대 해수욕장)'),
    size: z
      .number()
      .int()
      .min(1)
      .max(15)
      .optional()
      .default(5)
      .describe('반환할 최대 결과 수 (기본 5, 최대 15)'),
  },
  async ({ query, size }) => {
    const places = await searchPlacesKakao(query, 1, size);

    if (places.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `"${query}"에 해당하는 장소를 찾지 못했습니다. 다른 검색어를 시도해 보세요.`,
          },
        ],
      };
    }

    const results = places.map((p, i) => ({
      index: i + 1,
      name: p.place_name,
      category: p.category_name,
      address: p.road_address_name || p.address_name,
      lat: parseFloat(p.y),
      lng: parseFloat(p.x),
      url: p.place_url,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  },
);

// stdio transport로 NestJS(또는 다른 MCP 클라이언트)와 통신한다.
const transport = new StdioServerTransport();
await server.connect(transport);
