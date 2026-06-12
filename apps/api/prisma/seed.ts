// 📌 개발용 초기 데이터 생성 파일. DB를 비운 뒤에도 같은 여행 코스 샘플을 다시 넣을 수 있다.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// prisma:seed 명령은 apps/api에서 실행되므로 루트 .env를 직접 읽는다.
config({ path: '../../.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// 기존 개발용 게시글 데이터를 정리하고 User, Post, Tag, PostTag 샘플 데이터를 생성한다.
async function main() {
  // seed를 반복 실행해도 여행 코스 샘플이 중복되지 않도록 게시판 데이터를 먼저 비운다.
  await prisma.postTag.deleteMany();
  await prisma.place.deleteMany();
  await prisma.postEmbedding.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();

  // 인증 기능은 유지하므로 기존 seed 사용자 2명을 그대로 사용한다.
  const [minji, dohyun] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'minji@example.com' },
      update: {
        name: '김민지',
        passwordHash: 'hashed_password',
      },
      create: {
        id: 'seed_user_minji',
        email: 'minji@example.com',
        name: '김민지',
        passwordHash: 'hashed_password',
      },
    }),
    prisma.user.upsert({
      where: { email: 'dohyun@example.com' },
      update: {
        name: '이도현',
        passwordHash: 'hashed_password',
      },
      create: {
        id: 'seed_user_dohyun',
        email: 'dohyun@example.com',
        name: '이도현',
        passwordHash: 'hashed_password',
      },
    }),
  ]);

  // 여행 코스 게시판에서 보여줄 샘플 국내 여행 코스 3개를 만든다.
  const [busanPost, gangneungPost, jejuPost] = await Promise.all([
    prisma.post.create({
      data: {
        id: 'seed_post_busan',
        title: '부산 2박 3일 바다와 골목 맛집 코스',
        content:
          '부산역에서 시작해 감천문화마을의 골목을 둘러보고, 자갈치시장에서 회를 맛본 뒤 해운대 야경으로 마무리하는 2박 3일 코스입니다. 지하철과 버스로 충분히 이동할 수 있어 뚜벅이 여행에도 좋습니다.',
        city: '부산',
        duration: 3,
        authorId: minji.id,
      },
    }),
    prisma.post.create({
      data: {
        id: 'seed_post_gangneung',
        title: '강릉 1박 2일 바다 커피 여행 코스',
        content:
          '강릉역에 내려 오죽헌을 둘러보고, 경포해변을 산책한 뒤 안목해변 커피거리에서 바다를 보며 커피로 마무리하는 1박 2일 코스입니다. 혼자 천천히 걷기 좋은 동선으로 묶었습니다.',
        city: '강릉',
        duration: 2,
        authorId: dohyun.id,
      },
    }),
    prisma.post.create({
      data: {
        id: 'seed_post_jeju',
        title: '제주 2박 3일 자연과 가성비 코스',
        content:
          '렌터카를 이용해 동쪽 해안도로와 오름을 중심으로 움직이는 2박 3일 코스입니다. 숙소는 시내권으로 잡고, 낮에는 자연 명소를 돌고 저녁에는 가성비 좋은 현지 식당을 추천합니다.',
        city: '제주',
        duration: 3,
        authorId: minji.id,
      },
    }),
  ]);

  // 검색과 분류에 사용할 여행 태그를 만든다.
  const tags = await Promise.all(
    ['맛집', '자연', '도심', '가성비', '혼행'].map((name) =>
      prisma.tag.create({
        data: { name },
      }),
    ),
  );

  // 태그 이름으로 id를 쉽게 찾기 위해 Map으로 바꾼다.
  const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

  // PostTag 연결 테이블에 게시글과 태그의 N:M 관계를 저장한다.
  const postTags = [
    { postId: busanPost.id, tagId: tagByName.get('맛집')!.id },
    { postId: busanPost.id, tagId: tagByName.get('도심')!.id },
    { postId: gangneungPost.id, tagId: tagByName.get('자연')!.id },
    { postId: gangneungPost.id, tagId: tagByName.get('혼행')!.id },
    { postId: jejuPost.id, tagId: tagByName.get('자연')!.id },
    { postId: jejuPost.id, tagId: tagByName.get('가성비')!.id },
  ];

  await prisma.postTag.createMany({
    data: postTags,
  });

  // 각 게시글에 지도에 표시할 경유지(장소)를 순서대로 넣는다. 좌표는 실제 위치 기준이다.
  await prisma.place.createMany({
    data: [
      // 부산 코스: 부산역 → 감천문화마을 → 자갈치시장 → 해운대해수욕장
      {
        postId: busanPost.id,
        name: '부산역',
        address: '부산 동구 중앙대로',
        lat: 35.1151,
        lng: 129.0413,
        order: 0,
      },
      {
        postId: busanPost.id,
        name: '감천문화마을',
        address: '부산 사하구 감내2로',
        lat: 35.0975,
        lng: 129.0107,
        order: 1,
      },
      {
        postId: busanPost.id,
        name: '자갈치시장',
        address: '부산 중구 자갈치해안로',
        lat: 35.0966,
        lng: 129.0306,
        order: 2,
      },
      {
        postId: busanPost.id,
        name: '해운대해수욕장',
        address: '부산 해운대구 우동',
        lat: 35.1587,
        lng: 129.1604,
        order: 3,
      },
      // 강릉 코스: 강릉역 → 오죽헌 → 경포해변 → 안목해변 커피거리
      {
        postId: gangneungPost.id,
        name: '강릉역',
        address: '강원 강릉시 용지로',
        lat: 37.7637,
        lng: 128.8996,
        order: 0,
      },
      {
        postId: gangneungPost.id,
        name: '오죽헌',
        address: '강원 강릉시 율곡로',
        lat: 37.7793,
        lng: 128.8784,
        order: 1,
      },
      {
        postId: gangneungPost.id,
        name: '경포해변',
        address: '강원 강릉시 강문동',
        lat: 37.8055,
        lng: 128.9095,
        order: 2,
      },
      {
        postId: gangneungPost.id,
        name: '안목해변 커피거리',
        address: '강원 강릉시 창해로14번길',
        lat: 37.7714,
        lng: 128.9476,
        order: 3,
      },
      // 제주 코스: 제주공항 → 성산일출봉 → 섭지코지 → 카페거리
      {
        postId: jejuPost.id,
        name: '제주국제공항',
        address: '제주시 공항로',
        lat: 33.5113,
        lng: 126.4929,
        order: 0,
      },
      {
        postId: jejuPost.id,
        name: '성산일출봉',
        address: '서귀포시 성산읍',
        lat: 33.4581,
        lng: 126.9425,
        order: 1,
      },
      {
        postId: jejuPost.id,
        name: '섭지코지',
        address: '서귀포시 성산읍 고성리',
        lat: 33.4239,
        lng: 126.9293,
        order: 2,
      },
      {
        postId: jejuPost.id,
        name: '월정리 카페거리',
        address: '제주시 구좌읍 월정리',
        lat: 33.5564,
        lng: 126.7953,
        order: 3,
      },
    ],
  });

  console.log('Travel seed data inserted');
}

main()
  .catch((error) => {
    // seed 실패 시 에러를 출력하고 실패 코드로 종료한다.
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    // seed 성공/실패와 관계없이 DB 연결은 항상 닫는다.
    await prisma.$disconnect();
  });
