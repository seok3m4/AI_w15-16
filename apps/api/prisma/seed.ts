// 📌 개발용 초기 데이터 생성 파일. DB를 비운 뒤에도 같은 여행 코스 샘플을 다시 넣을 수 있다.
// RAG(유사 추천/Q&A) 품질을 위해 지역·테마가 다양한 코스를 충분히 넣는다.
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

// 샘플 작성자. 코스를 여러 사람이 올린 것처럼 보이게 한다.
const USERS = [
  { id: 'seed_user_minji', email: 'minji@example.com', name: '김민지' },
  { id: 'seed_user_dohyun', email: 'dohyun@example.com', name: '이도현' },
  { id: 'seed_user_seoyeon', email: 'seoyeon@example.com', name: '박서연' },
  { id: 'seed_user_junho', email: 'junho@example.com', name: '최준호' },
  { id: 'seed_user_haneul', email: 'haneul@example.com', name: '정하늘' },
];

// 경유지 입력 타입 (order는 배열 순서로 자동 부여)
type SeedPlace = { name: string; address: string; lat: number; lng: number };
type SeedCourse = {
  id: string;
  title: string;
  content: string;
  city: string;
  duration: number;
  author: string; // USERS의 email
  tags: string[];
  places: SeedPlace[];
};

// 게시판에 들어갈 샘플 코스들. 지역과 테마를 다양하게 섞었다.
const COURSES: SeedCourse[] = [
  {
    id: 'seed_post_busan',
    title: '부산 2박 3일 바다와 골목 맛집 코스',
    content:
      '부산역에서 시작해 감천문화마을의 알록달록한 골목을 둘러보고, 자갈치시장에서 싱싱한 회를 맛본 뒤 해운대 야경으로 마무리하는 2박 3일 코스입니다. 지하철과 버스만으로 충분히 이동할 수 있어 뚜벅이 여행에도 좋고, 바다와 도심 먹거리를 한 번에 즐기고 싶은 분께 추천합니다.',
    city: '부산',
    duration: 3,
    author: 'minji@example.com',
    tags: ['맛집', '바다', '도심'],
    places: [
      { name: '부산역', address: '부산 동구 중앙대로', lat: 35.1151, lng: 129.0413 },
      { name: '감천문화마을', address: '부산 사하구 감내2로', lat: 35.0975, lng: 129.0107 },
      { name: '자갈치시장', address: '부산 중구 자갈치해안로', lat: 35.0966, lng: 129.0306 },
      { name: '해운대해수욕장', address: '부산 해운대구 우동', lat: 35.1587, lng: 129.1604 },
    ],
  },
  {
    id: 'seed_post_gangneung',
    title: '강릉 1박 2일 바다 커피 여행 코스',
    content:
      '강릉역에 내려 오죽헌을 둘러보고, 경포해변을 천천히 산책한 뒤 안목해변 커피거리에서 바다를 보며 커피로 마무리하는 1박 2일 코스입니다. 혼자 조용히 걷기 좋은 동선으로 묶었고, 카페 투어와 바다 풍경을 함께 즐기고 싶은 분께 잘 맞습니다.',
    city: '강릉',
    duration: 2,
    author: 'dohyun@example.com',
    tags: ['자연', '카페', '혼행'],
    places: [
      { name: '강릉역', address: '강원 강릉시 용지로', lat: 37.7637, lng: 128.8996 },
      { name: '오죽헌', address: '강원 강릉시 율곡로', lat: 37.7793, lng: 128.8784 },
      { name: '경포해변', address: '강원 강릉시 강문동', lat: 37.8055, lng: 128.9095 },
      { name: '안목해변 커피거리', address: '강원 강릉시 창해로14번길', lat: 37.7714, lng: 128.9476 },
    ],
  },
  {
    id: 'seed_post_jeju',
    title: '제주 2박 3일 자연과 가성비 코스',
    content:
      '렌터카로 동쪽 해안도로와 오름을 중심으로 움직이는 2박 3일 코스입니다. 숙소는 제주시내권으로 잡아 비용을 아끼고, 낮에는 성산일출봉과 섭지코지 같은 자연 명소를 돌고 저녁에는 가성비 좋은 현지 식당에서 마무리합니다. 처음 제주를 여행하는 분께 무난한 코스입니다.',
    city: '제주',
    duration: 3,
    author: 'minji@example.com',
    tags: ['자연', '가성비', '드라이브'],
    places: [
      { name: '제주국제공항', address: '제주시 공항로', lat: 33.5113, lng: 126.4929 },
      { name: '성산일출봉', address: '서귀포시 성산읍', lat: 33.4581, lng: 126.9425 },
      { name: '섭지코지', address: '서귀포시 성산읍 고성리', lat: 33.4239, lng: 126.9293 },
      { name: '월정리 카페거리', address: '제주시 구좌읍 월정리', lat: 33.5564, lng: 126.7953 },
    ],
  },
  {
    id: 'seed_post_seoul_palace',
    title: '서울 당일치기 고궁과 한옥 산책 코스',
    content:
      '경복궁에서 시작해 북촌한옥마을의 골목을 걷고, 인사동에서 전통 찻집과 기념품 가게를 구경한 뒤 광장시장에서 빈대떡과 마약김밥으로 마무리하는 당일치기 코스입니다. 한복을 입으면 고궁 입장이 무료라 사진 찍기에도 좋고, 외국 친구와 함께 다니기에도 좋습니다.',
    city: '서울',
    duration: 1,
    author: 'seoyeon@example.com',
    tags: ['역사', '도심', '맛집'],
    places: [
      { name: '경복궁', address: '서울 종로구 사직로', lat: 37.5796, lng: 126.977 },
      { name: '북촌한옥마을', address: '서울 종로구 계동길', lat: 37.5826, lng: 126.9831 },
      { name: '인사동', address: '서울 종로구 인사동길', lat: 37.574, lng: 126.9849 },
      { name: '광장시장', address: '서울 종로구 창경궁로', lat: 37.5701, lng: 126.9997 },
    ],
  },
  {
    id: 'seed_post_gyeongju',
    title: '경주 1박 2일 신라 역사 유적 코스',
    content:
      '불국사와 석굴암으로 신라 불교문화를 느끼고, 첨성대와 동궁과 월지(안압지)에서 야경을 감상한 뒤 황리단길에서 감성 카페와 먹거리를 즐기는 1박 2일 코스입니다. 아이와 함께하는 가족 여행이나 역사 공부를 겸한 여행으로 좋습니다.',
    city: '경주',
    duration: 2,
    author: 'junho@example.com',
    tags: ['역사', '가족', '야경'],
    places: [
      { name: '불국사', address: '경북 경주시 불국로', lat: 35.79, lng: 129.332 },
      { name: '석굴암', address: '경북 경주시 진현동', lat: 35.7947, lng: 129.349 },
      { name: '첨성대', address: '경북 경주시 인왕동', lat: 35.8348, lng: 129.219 },
      { name: '동궁과 월지', address: '경북 경주시 원화로', lat: 35.8348, lng: 129.2265 },
      { name: '황리단길', address: '경북 경주시 포석로', lat: 35.836, lng: 129.211 },
    ],
  },
  {
    id: 'seed_post_jeonju',
    title: '전주 1박 2일 한옥마을과 먹거리 코스',
    content:
      '전주한옥마을을 중심으로 경기전과 전동성당을 둘러보고, 골목마다 숨은 길거리 음식을 맛본 뒤 남부시장 야시장에서 마무리하는 1박 2일 코스입니다. 비빔밥과 콩나물국밥 같은 전주 대표 음식을 빼놓을 수 없고, 한옥 숙소에서 하룻밤 묵는 경험도 추천합니다.',
    city: '전주',
    duration: 2,
    author: 'seoyeon@example.com',
    tags: ['맛집', '역사', '도심'],
    places: [
      { name: '전주한옥마을', address: '전북 전주시 완산구 기린대로', lat: 35.815, lng: 127.153 },
      { name: '경기전', address: '전북 전주시 완산구 태조로', lat: 35.8157, lng: 127.15 },
      { name: '전동성당', address: '전북 전주시 완산구 태조로', lat: 35.8138, lng: 127.149 },
      { name: '남부시장', address: '전북 전주시 완산구 풍남문2길', lat: 35.811, lng: 127.143 },
    ],
  },
  {
    id: 'seed_post_yeosu',
    title: '여수 1박 2일 밤바다와 해산물 코스',
    content:
      '여수엑스포 일대를 둘러보고 돌산공원에서 케이블카를 타며 바다 전망을 즐긴 뒤, 이순신광장과 낭만포차거리에서 싱싱한 해산물과 밤바다를 즐기는 1박 2일 코스입니다. 노래로도 유명한 여수 밤바다를 직접 보고 싶은 커플 여행에 특히 잘 어울립니다.',
    city: '여수',
    duration: 2,
    author: 'haneul@example.com',
    tags: ['야경', '맛집', '커플'],
    places: [
      { name: '여수세계박람회장', address: '전남 여수시 박람회길', lat: 34.754, lng: 127.747 },
      { name: '돌산공원', address: '전남 여수시 돌산읍', lat: 34.737, lng: 127.764 },
      { name: '이순신광장', address: '전남 여수시 중앙동', lat: 34.739, lng: 127.743 },
      { name: '낭만포차거리', address: '전남 여수시 종화동', lat: 34.74, lng: 127.746 },
    ],
  },
  {
    id: 'seed_post_sokcho',
    title: '속초 1박 2일 설악산과 바다 액티비티 코스',
    content:
      '설악산 소공원에서 가벼운 등산과 케이블카를 즐기고, 속초해수욕장에서 바다를 본 뒤 속초관광수산시장에서 닭강정과 회를 맛보는 1박 2일 코스입니다. 자연과 먹거리를 함께 즐기고 싶은 분, 활동적인 여행을 좋아하는 분께 추천합니다.',
    city: '속초',
    duration: 2,
    author: 'dohyun@example.com',
    tags: ['자연', '액티비티', '맛집'],
    places: [
      { name: '설악산 소공원', address: '강원 속초시 설악산로', lat: 38.168, lng: 128.496 },
      { name: '속초해수욕장', address: '강원 속초시 조양동', lat: 38.19, lng: 128.601 },
      { name: '속초관광수산시장', address: '강원 속초시 중앙로', lat: 38.207, lng: 128.591 },
      { name: '영금정', address: '강원 속초시 동명동', lat: 38.213, lng: 128.597 },
    ],
  },
  {
    id: 'seed_post_tongyeong',
    title: '통영 1박 2일 섬과 케이블카 코스',
    content:
      '통영 케이블카로 미륵산 정상에 올라 한려수도의 섬들을 내려다보고, 동피랑 벽화마을의 골목을 구경한 뒤 중앙시장에서 충무김밥과 굴 요리를 맛보는 1박 2일 코스입니다. 바다와 섬 풍경을 좋아하는 분께 잘 맞고, 사진 찍기 좋은 명소가 많습니다.',
    city: '통영',
    duration: 2,
    author: 'junho@example.com',
    tags: ['자연', '바다', '맛집'],
    places: [
      { name: '통영 케이블카', address: '경남 통영시 발개로', lat: 34.829, lng: 128.436 },
      { name: '동피랑 벽화마을', address: '경남 통영시 동호동', lat: 34.844, lng: 128.425 },
      { name: '통영중앙시장', address: '경남 통영시 중앙로', lat: 34.845, lng: 128.424 },
    ],
  },
  {
    id: 'seed_post_andong',
    title: '안동 당일치기 하회마을 전통 코스',
    content:
      '안동 하회마을에서 전통 한옥과 강변 풍경을 둘러보고, 부용대에 올라 마을 전경을 감상한 뒤 월영교 야경으로 마무리하는 당일치기 코스입니다. 안동찜닭과 간고등어 같은 향토 음식도 함께 즐길 수 있어, 전통문화와 역사를 좋아하는 가족 여행에 좋습니다.',
    city: '안동',
    duration: 1,
    author: 'seoyeon@example.com',
    tags: ['역사', '가족', '자연'],
    places: [
      { name: '안동 하회마을', address: '경북 안동시 풍천면 하회리', lat: 36.539, lng: 128.517 },
      { name: '부용대', address: '경북 안동시 풍천면', lat: 36.543, lng: 128.511 },
      { name: '월영교', address: '경북 안동시 상아동', lat: 36.556, lng: 128.716 },
    ],
  },
  {
    id: 'seed_post_gapyeong',
    title: '가평 당일치기 자연 힐링 코스',
    content:
      '아침고요수목원에서 사계절 정원을 거닐고, 쁘띠프랑스에서 이국적인 풍경을 즐긴 뒤 남이섬에서 산책으로 마무리하는 당일치기 자연 힐링 코스입니다. 서울 근교라 부담 없이 다녀오기 좋고, 복잡한 도심을 벗어나 조용히 쉬고 싶은 커플이나 친구 여행에 추천합니다.',
    city: '가평',
    duration: 1,
    author: 'haneul@example.com',
    tags: ['자연', '힐링', '커플'],
    places: [
      { name: '아침고요수목원', address: '경기 가평군 상면 수목원로', lat: 37.744, lng: 127.352 },
      { name: '쁘띠프랑스', address: '경기 가평군 청평면 호반로', lat: 37.757, lng: 127.496 },
      { name: '남이섬', address: '강원 춘천시 남산면 남이섬길', lat: 37.79, lng: 127.525 },
    ],
  },
  {
    id: 'seed_post_seoul_night',
    title: '서울 야경 데이트 코스',
    content:
      '남산서울타워에서 도심 야경을 내려다보고, 한강 반포대교 달빛무지개분수를 본 뒤 익선동 골목의 분위기 좋은 바에서 마무리하는 야경 데이트 코스입니다. 해질 무렵부터 움직이면 노을과 야경을 모두 즐길 수 있어 커플 여행이나 기념일에 잘 어울립니다.',
    city: '서울',
    duration: 1,
    author: 'haneul@example.com',
    tags: ['야경', '커플', '도심'],
    places: [
      { name: '남산서울타워', address: '서울 용산구 남산공원길', lat: 37.5512, lng: 126.9882 },
      { name: '반포한강공원', address: '서울 서초구 신반포로', lat: 37.5106, lng: 126.9956 },
      { name: '익선동 한옥거리', address: '서울 종로구 익선동', lat: 37.5742, lng: 126.9905 },
    ],
  },
  {
    id: 'seed_post_jeju_west',
    title: '제주 서쪽 카페와 노을 코스',
    content:
      '협재해수욕장의 에메랄드빛 바다를 보고, 한담해안산책로를 걸은 뒤 애월 카페거리에서 노을을 보며 커피를 마시는 제주 서쪽 코스입니다. 한적하게 바다와 카페를 즐기고 싶은 커플 여행이나 감성 사진을 좋아하는 분께 추천합니다.',
    city: '제주',
    duration: 1,
    author: 'minji@example.com',
    tags: ['카페', '바다', '커플'],
    places: [
      { name: '협재해수욕장', address: '제주시 한림읍 협재리', lat: 33.394, lng: 126.24 },
      { name: '한담해안산책로', address: '제주시 애월읍 곽지리', lat: 33.407, lng: 126.264 },
      { name: '애월 카페거리', address: '제주시 애월읍 애월로', lat: 33.463, lng: 126.31 },
    ],
  },
  {
    id: 'seed_post_busan_cafe',
    title: '부산 혼자 떠나는 감성 카페 투어',
    content:
      '영도 흰여울문화마을에서 바다를 낀 골목 카페를 둘러보고, 전포 카페거리에서 개성 있는 로스터리 카페를 옮겨 다니는 혼행 카페 투어 코스입니다. 사람 많은 관광지 대신 조용히 커피와 분위기를 즐기고 싶은 혼자 여행에 잘 맞습니다.',
    city: '부산',
    duration: 1,
    author: 'dohyun@example.com',
    tags: ['카페', '혼행', '바다'],
    places: [
      { name: '흰여울문화마을', address: '부산 영도구 영선동', lat: 35.079, lng: 129.047 },
      { name: '전포 카페거리', address: '부산 부산진구 전포동', lat: 35.156, lng: 129.064 },
    ],
  },
];

async function main() {
  // seed를 반복 실행해도 중복되지 않도록 게시판 데이터를 먼저 비운다.
  await prisma.postTag.deleteMany();
  await prisma.place.deleteMany();
  await prisma.postEmbedding.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.tag.deleteMany();

  // 샘플 작성자를 만든다. (인증 비밀번호는 더미값)
  await Promise.all(
    USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name, passwordHash: 'hashed_password' },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: 'hashed_password',
        },
      }),
    ),
  );

  const userIdByEmail = new Map(USERS.map((u) => [u.email, u.id]));

  // 모든 코스에서 쓰인 태그 이름을 모아 한 번에 만든다.
  const tagNames = [...new Set(COURSES.flatMap((c) => c.tags))];
  const tags = await Promise.all(
    tagNames.map((name) => prisma.tag.create({ data: { name } })),
  );
  const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));

  // 코스별로 게시글 + 경유지 + 태그 연결을 생성한다.
  for (const course of COURSES) {
    await prisma.post.create({
      data: {
        id: course.id,
        title: course.title,
        content: course.content,
        city: course.city,
        duration: course.duration,
        authorId: userIdByEmail.get(course.author)!,
        places: {
          create: course.places.map((place, index) => ({
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            order: index,
          })),
        },
        tags: {
          create: course.tags.map((name) => ({
            tag: { connect: { id: tagIdByName.get(name)! } },
          })),
        },
      },
    });
  }

  console.log(`Travel seed data inserted: ${COURSES.length} courses`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
