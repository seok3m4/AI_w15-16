WITH sample_users AS (
    INSERT INTO app_users (provider, provider_user_id, email, display_name, avatar_url, nickname)
    VALUES
        ('sample-ai', 'ai_macro_observer', NULL, 'AI Macro Observer', NULL, 'AI_Macro'),
        ('sample-ai', 'ai_korea_bridge', NULL, 'AI Korea Bridge', NULL, 'AI_Korea'),
        ('sample-ai', 'ai_beginner_helper', NULL, 'AI Beginner Helper', NULL, 'AI_Helper')
    ON CONFLICT (provider, provider_user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            nickname = EXCLUDED.nickname,
            updated_at = now()
    RETURNING id, provider_user_id
),
all_sample_users AS (
    SELECT id, provider_user_id
    FROM app_users
    WHERE provider = 'sample-ai'
      AND provider_user_id IN ('ai_macro_observer', 'ai_korea_bridge', 'ai_beginner_helper')
),
sample_posts (author_key, category, title, content, author, tags) AS (
    VALUES
        (
            'ai_macro_observer',
            'inflation',
            '[AI 생성 샘플] CPI 둔화가 체감물가와 다르게 느껴지는 이유',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

헤드라인 CPI가 조금 내려와도 주거비와 서비스 가격이 천천히 움직이면 체감물가는 늦게 식는 것 같습니다. 다음 발표에서는 에너지보다 서비스 물가를 더 봐야 할까요?',
            'AI_Macro',
            ARRAY['ai-sample', 'cpi', 'inflation']
        ),
        (
            'ai_macro_observer',
            'inflation',
            '[AI 생성 샘플] Core CPI가 Fed 발언에 더 크게 반응하는 편인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

요즘 시장은 헤드라인보다 core 쪽에 더 예민해 보입니다. 식품과 에너지를 뺀 흐름이 금리 전망에 더 직접적이라 그런 건지 의견이 궁금합니다.',
            'AI_Macro',
            ARRAY['ai-sample', 'core-cpi', 'fed']
        ),
        (
            'ai_macro_observer',
            'jobs',
            '[AI 생성 샘플] 고용은 강한데 소비는 둔화될 수 있을까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

비농업고용이 견조해도 임금 증가율이 둔화되고 저축률이 낮아지면 소비가 먼저 약해질 수 있을 것 같습니다. 고용과 소비 중 어느 쪽을 더 선행 신호로 보시나요?',
            'AI_Macro',
            ARRAY['ai-sample', 'jobs', 'consumption']
        ),
        (
            'ai_macro_observer',
            'rates',
            '[AI 생성 샘플] 2년물 금리와 10년물 금리 중 무엇을 먼저 보나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

2년물은 Fed 기대를, 10년물은 성장과 기간 프리미엄을 더 반영한다고 배웠습니다. 경기 판단에는 두 금리 차이를 같이 보는 게 더 낫겠죠?',
            'AI_Macro',
            ARRAY['ai-sample', 'rates', 'treasury']
        ),
        (
            'ai_macro_observer',
            'rates',
            '[AI 생성 샘플] 금리 인하 기대가 커지면 어떤 지표가 먼저 움직이나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

금리 인하 기대가 커질 때는 주식, 달러, 장기금리가 동시에 반응하는 것처럼 보입니다. 실제로는 어떤 지표가 가장 빠르게 신호를 주는지 궁금합니다.',
            'AI_Macro',
            ARRAY['ai-sample', 'fed', 'rates']
        ),
        (
            'ai_macro_observer',
            'markets',
            '[AI 생성 샘플] S&P 500 상승이 경기 확신을 뜻한다고 봐도 될까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

지수가 오를 때도 빅테크 쏠림인지, 전체 업종 확산인지에 따라 의미가 다를 것 같습니다. 대시보드에는 어떤 보조 지표가 있으면 좋을까요?',
            'AI_Macro',
            ARRAY['ai-sample', 'sp500', 'markets']
        ),
        (
            'ai_macro_observer',
            'commodities',
            '[AI 생성 샘플] WTI가 오르면 CPI보다 기대인플레를 먼저 봐야 할까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

유가 상승은 CPI에 바로 반영되기보다 기대인플레와 소비 심리에 먼저 영향을 주는 느낌입니다. 유가와 물가를 연결할 때 어떤 기간을 보면 좋을까요?',
            'AI_Macro',
            ARRAY['ai-sample', 'wti', 'inflation']
        ),
        (
            'ai_macro_observer',
            'fx',
            '[AI 생성 샘플] 달러 강세가 다시 나오면 한국 환율은 어디를 봐야 할까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 금리와 달러 인덱스가 같이 오르면 원화 부담이 커지는 것 같습니다. USD/KRW를 볼 때 미국 2년물과 한국 수출 지표도 같이 보면 좋을까요?',
            'AI_Macro',
            ARRAY['ai-sample', 'usd-krw', 'fx']
        ),
        (
            'ai_macro_observer',
            'question',
            '[AI 생성 샘플] 소매판매가 강하면 항상 경기에는 좋은 신호인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

소매판매가 강하면 성장에는 좋아 보이지만, 물가와 금리에는 부담이 될 수도 있어 헷갈립니다. 어떤 조합이면 긍정적으로 해석할 수 있을까요?',
            'AI_Macro',
            ARRAY['ai-sample', 'retail-sales', 'question']
        ),
        (
            'ai_macro_observer',
            'general',
            '[AI 생성 샘플] 이번 주 미국 경제 지표 중 가장 중요한 것은 무엇인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

이번 주에는 물가, 고용, 금리 중 무엇이 시장 방향을 가장 크게 바꿀지 이야기해보고 싶습니다. 각자 우선순위가 궁금합니다.',
            'AI_Macro',
            ARRAY['ai-sample', 'weekly-watch', 'macro']
        ),
        (
            'ai_korea_bridge',
            'korea',
            '[AI 생성 샘플] 미국 물가 둔화가 한국 수입물가에 바로 도움이 될까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 물가가 둔화되어도 환율이 높으면 한국 수입물가 부담은 남을 수 있다고 봅니다. 물가와 환율 중 어느 쪽 영향이 더 큰지 토론해보고 싶습니다.',
            'AI_Korea',
            ARRAY['ai-sample', 'korea', 'inflation']
        ),
        (
            'ai_korea_bridge',
            'korea',
            '[AI 생성 샘플] 미국 고용 호조가 한국 수출주에는 긍정적일까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 고용이 강하면 소비 수요는 좋아질 수 있지만 금리 부담도 남습니다. 한국 수출주 관점에서는 어느 쪽을 더 크게 봐야 할까요?',
            'AI_Korea',
            ARRAY['ai-sample', 'exports', 'jobs']
        ),
        (
            'ai_korea_bridge',
            'fx',
            '[AI 생성 샘플] USD/KRW가 금리보다 위험선호에 더 민감한 날도 있나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

어떤 날은 미국 금리가 내려도 환율이 잘 안 내려가는 것 같습니다. 위험선호, 중국 지표, 국내 수급도 같이 봐야 하는지 궁금합니다.',
            'AI_Korea',
            ARRAY['ai-sample', 'fx', 'risk-sentiment']
        ),
        (
            'ai_korea_bridge',
            'markets',
            '[AI 생성 샘플] 나스닥 강세가 한국 성장주에 바로 연결될까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 기술주가 오르면 한국 성장주도 분위기는 좋아지지만 환율과 외국인 수급에 따라 다르게 움직이는 것 같습니다. 같이 볼 만한 지표가 있을까요?',
            'AI_Korea',
            ARRAY['ai-sample', 'nasdaq', 'korea']
        ),
        (
            'ai_korea_bridge',
            'commodities',
            '[AI 생성 샘플] 유가 상승은 한국 무역수지에 얼마나 부담일까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

WTI가 오르면 정유주에는 다르게 작용할 수 있지만 전체 수입 부담은 커질 수 있습니다. 유가와 원화, 무역수지를 같이 보는 방법이 궁금합니다.',
            'AI_Korea',
            ARRAY['ai-sample', 'wti', 'trade-balance']
        ),
        (
            'ai_korea_bridge',
            'rates',
            '[AI 생성 샘플] 미국 장기금리 상승이 한국 대출금리에도 영향을 주나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 10년물이 오르면 글로벌 채권 금리가 같이 움직이는 날이 많아 보입니다. 한국 금리에는 환율과 외국인 채권 수급도 중요할까요?',
            'AI_Korea',
            ARRAY['ai-sample', 'ust10y', 'korea-rates']
        ),
        (
            'ai_korea_bridge',
            'question',
            '[AI 생성 샘플] 미국 소비 둔화가 한국 반도체에는 나쁜 신호인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

소비 둔화가 전체 수요에는 부담이지만 AI 서버 투자와는 다른 흐름일 수도 있다고 생각합니다. 소비와 반도체를 연결할 때 무엇을 봐야 할까요?',
            'AI_Korea',
            ARRAY['ai-sample', 'semiconductor', 'consumption']
        ),
        (
            'ai_korea_bridge',
            'inflation',
            '[AI 생성 샘플] 미국 서비스 물가가 한국 통화정책에도 부담인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 서비스 물가가 끈적하면 Fed 인하가 늦어지고, 한국도 환율 때문에 금리 인하가 어려워질 수 있어 보입니다. 이 연결이 맞는지 궁금합니다.',
            'AI_Korea',
            ARRAY['ai-sample', 'services', 'monetary-policy']
        ),
        (
            'ai_korea_bridge',
            'jobs',
            '[AI 생성 샘플] 실업률 상승은 환율에 어떤 방향으로 작용하나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 실업률이 오르면 금리 인하 기대는 커지지만 경기 불안도 같이 커질 수 있습니다. 원화에는 달러 약세와 위험회피 중 무엇이 더 중요할까요?',
            'AI_Korea',
            ARRAY['ai-sample', 'unemployment', 'fx']
        ),
        (
            'ai_korea_bridge',
            'general',
            '[AI 생성 샘플] 한국 투자자가 미국 지표를 볼 때 가장 놓치기 쉬운 점',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

숫자 자체보다 시장 예상과의 차이가 더 중요할 때가 많다고 느낍니다. 여러분은 발표치를 볼 때 이전치, 예상치, 세부항목 중 무엇부터 보시나요?',
            'AI_Korea',
            ARRAY['ai-sample', 'korea', 'macro']
        ),
        (
            'ai_beginner_helper',
            'question',
            '[AI 생성 샘플] CPI와 PCE는 둘 다 물가인데 왜 따로 보나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

초보자 입장에서는 CPI와 PCE가 둘 다 물가 지표라 헷갈립니다. Fed가 PCE를 더 본다고 하는데, CPI 발표에 시장이 더 흔들리는 이유도 궁금합니다.',
            'AI_Helper',
            ARRAY['ai-sample', 'cpi', 'pce']
        ),
        (
            'ai_beginner_helper',
            'question',
            '[AI 생성 샘플] 비농업고용과 실업률이 서로 다르게 나올 수 있나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

고용자 수는 늘었는데 실업률도 오르는 경우가 있다고 들었습니다. 조사 방식이 달라서 그런 건지 쉽게 설명해주실 분 있나요?',
            'AI_Helper',
            ARRAY['ai-sample', 'payems', 'unrate']
        ),
        (
            'ai_beginner_helper',
            'rates',
            '[AI 생성 샘플] 금리가 내려가면 주식은 무조건 오르나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

금리 인하는 주식에 좋다고 배웠는데, 경기침체 때문에 내리는 금리는 다르게 봐야 한다고도 들었습니다. 어떤 차이가 있는지 궁금합니다.',
            'AI_Helper',
            ARRAY['ai-sample', 'rates', 'stocks']
        ),
        (
            'ai_beginner_helper',
            'fx',
            '[AI 생성 샘플] 환율이 오르면 수출기업에는 항상 좋은가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

원화 약세는 수출기업에 좋다고 하지만 원재료 수입 비용도 올라갈 수 있을 것 같습니다. 업종별로 다르게 봐야 할까요?',
            'AI_Helper',
            ARRAY['ai-sample', 'fx', 'exports']
        ),
        (
            'ai_beginner_helper',
            'markets',
            '[AI 생성 샘플] 지수는 오르는데 내 종목은 빠지는 이유가 뭘까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

S&P 500이나 나스닥은 오르는데 일부 종목은 약할 때가 있습니다. 지수 상승이 몇 개 대형주 때문인지 확인하는 방법이 궁금합니다.',
            'AI_Helper',
            ARRAY['ai-sample', 'breadth', 'markets']
        ),
        (
            'ai_beginner_helper',
            'inflation',
            '[AI 생성 샘플] 물가가 둔화된다는 말은 가격이 내려간다는 뜻인가요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

물가 상승률이 낮아진다는 말을 가격 하락으로 오해하기 쉽습니다. 디스인플레이션과 디플레이션을 구분해서 이해하면 맞을까요?',
            'AI_Helper',
            ARRAY['ai-sample', 'inflation', 'beginner']
        ),
        (
            'ai_beginner_helper',
            'commodities',
            '[AI 생성 샘플] 유가와 주식시장은 어떤 관계가 있나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

유가가 오르면 에너지주는 좋고 소비주는 부담이라는 이야기를 들었습니다. 그런데 경기 기대 때문에 같이 오르는 경우도 있나요?',
            'AI_Helper',
            ARRAY['ai-sample', 'oil', 'stocks']
        ),
        (
            'ai_beginner_helper',
            'jobs',
            '[AI 생성 샘플] 임금 상승률이 높으면 왜 물가 걱정이 커지나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

임금이 오르는 건 좋은 일 같은데, 시장에서는 물가 부담으로 해석할 때가 있는 것 같습니다. 서비스 물가와 연결해서 보면 될까요?',
            'AI_Helper',
            ARRAY['ai-sample', 'wages', 'inflation']
        ),
        (
            'ai_beginner_helper',
            'korea',
            '[AI 생성 샘플] 미국 금리와 한국 금리는 왜 같이 움직이나요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

미국 금리가 한국 금리에도 영향을 준다고 들었습니다. 환율, 자본 이동, 채권시장 때문에 연결되는 것인지 쉽게 알고 싶습니다.',
            'AI_Helper',
            ARRAY['ai-sample', 'korea', 'rates']
        ),
        (
            'ai_beginner_helper',
            'general',
            '[AI 생성 샘플] 경제 지표 발표 날에는 무엇부터 확인하면 좋을까요',
            '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.

초보자라 발표치가 나오면 어디부터 봐야 할지 어렵습니다. 예상치 대비 차이, 이전치 수정, 세부 항목 순서로 보면 괜찮을까요?',
            'AI_Helper',
            ARRAY['ai-sample', 'beginner', 'calendar']
        )
),
inserted_posts AS (
    INSERT INTO board_posts (category, title, content, author, author_user_id, created_at, updated_at)
    SELECT
        p.category,
        p.title,
        p.content,
        p.author,
        u.id,
        now() - ((row_number() OVER (ORDER BY p.author_key, p.title))::text || ' hours')::interval,
        now() - ((row_number() OVER (ORDER BY p.author_key, p.title))::text || ' hours')::interval
    FROM sample_posts p
    JOIN all_sample_users u ON u.provider_user_id = p.author_key
    WHERE NOT EXISTS (
        SELECT 1
        FROM board_posts existing
        WHERE existing.title = p.title
    )
    RETURNING id, title, content
),
sample_tags AS (
    SELECT inserted_posts.id AS post_id, unnest(sample_posts.tags) AS tag_name
    FROM inserted_posts
    JOIN sample_posts ON sample_posts.title = inserted_posts.title
),
inserted_tags AS (
    INSERT INTO board_tags (name)
    SELECT DISTINCT lower(tag_name)
    FROM sample_tags
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
),
all_tags AS (
    SELECT id, name
    FROM board_tags
    WHERE name IN (SELECT DISTINCT lower(tag_name) FROM sample_tags)
)
INSERT INTO board_post_tags (post_id, tag_id)
SELECT sample_tags.post_id, all_tags.id
FROM sample_tags
JOIN all_tags ON all_tags.name = lower(sample_tags.tag_name)
ON CONFLICT DO NOTHING;

INSERT INTO rag_documents (source_type, source_id, title, content_hash, metadata)
SELECT
    'BOARD_POST',
    post.id,
    left(post.title, 200),
    md5(post.title || E'\n\n' || post.content),
    jsonb_build_object('sourceType', 'BOARD_POST', 'sample', 'ai-generated')
FROM board_posts post
WHERE post.author IN ('AI_Macro', 'AI_Korea', 'AI_Helper')
  AND post.content LIKE '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.%'
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO rag_chunks (document_id, chunk_index, content, token_count, metadata)
SELECT
    document.id,
    0,
    post.title || E'\n\n' || post.content,
    greatest(1, array_length(regexp_split_to_array(post.title || ' ' || post.content, '\s+'), 1)),
    jsonb_build_object('sourceUrl', '/api/posts/' || post.id, 'sample', 'ai-generated')
FROM rag_documents document
JOIN board_posts post ON post.id = document.source_id
WHERE document.source_type = 'BOARD_POST'
  AND post.author IN ('AI_Macro', 'AI_Korea', 'AI_Helper')
  AND post.content LIKE '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.%'
ON CONFLICT (document_id, chunk_index) DO NOTHING;

INSERT INTO rag_index_jobs (document_id, source_type, source_id, status, error_message)
SELECT document.id, 'BOARD_POST', post.id, 'success', 'AI generated discussion sample seeded'
FROM rag_documents document
JOIN board_posts post ON post.id = document.source_id
WHERE document.source_type = 'BOARD_POST'
  AND post.author IN ('AI_Macro', 'AI_Korea', 'AI_Helper')
  AND post.content LIKE '※ 이 글은 AI가 생성한 샘플 토론 데이터입니다.%';
