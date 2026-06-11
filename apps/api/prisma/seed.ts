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

  // 여행 코스 게시판에서 보여줄 샘플 게시글 3개를 만든다.
  const [osakaPost, parisPost, jejuPost] = await Promise.all([
    prisma.post.create({
      data: {
        id: 'seed_post_osaka',
        title: '오사카 3박 4일 현지 맛집 중심 코스',
        content:
          '도톤보리와 난바를 중심으로 움직이되, 관광객이 적은 골목 맛집과 시장을 함께 묶은 3박 4일 코스입니다. 첫날은 난바 적응, 둘째 날은 교토 당일치기, 셋째 날은 우메다와 로컬 이자카야를 추천합니다.',
        city: '오사카',
        country: '일본',
        duration: 4,
        authorId: minji.id,
      },
    }),
    prisma.post.create({
      data: {
        id: 'seed_post_paris',
        title: '파리 5박 6일 도심 산책 코스',
        content:
          '루브르와 오르세 같은 대표 미술관을 무리 없이 보고, 마레 지구와 생마르탱 운하 주변을 천천히 걷는 일정입니다. 하루 한두 개의 핵심 동선만 잡아 여유 있게 파리를 즐기는 코스입니다.',
        city: '파리',
        country: '프랑스',
        duration: 6,
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
        country: '한국',
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
    { postId: osakaPost.id, tagId: tagByName.get('맛집')!.id },
    { postId: osakaPost.id, tagId: tagByName.get('가성비')!.id },
    { postId: parisPost.id, tagId: tagByName.get('도심')!.id },
    { postId: parisPost.id, tagId: tagByName.get('혼행')!.id },
    { postId: jejuPost.id, tagId: tagByName.get('자연')!.id },
    { postId: jejuPost.id, tagId: tagByName.get('가성비')!.id },
  ];

  await prisma.postTag.createMany({
    data: postTags,
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
