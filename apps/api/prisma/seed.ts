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
  { id: 'seed_user_jiwoo', email: 'jiwoo@example.com', name: '윤지우' },
  { id: 'seed_user_taemin', email: 'taemin@example.com', name: '강태민' },
  { id: 'seed_user_sohee', email: 'sohee@example.com', name: '한소희' },
];

// 경유지 입력 타입 (day가 없으면 duration 기준으로 자동 배치, order는 배열 순서로 자동 부여)
type SeedPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  day?: number;
};
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

type SeedComment = {
  key: string;
  postId: string;
  author: string;
  content: string;
};

type SeedSavedPost = {
  user: string;
  postId: string;
};

// day를 직접 넣지 않은 기존 seed 장소도 1일차/2일차로 나뉘도록 보정한다.
function inferPlaceDay(course: SeedCourse, place: SeedPlace, index: number) {
  if (place.day) {
    return place.day;
  }

  const duration = Math.max(1, course.duration);
  if (duration === 1) {
    return 1;
  }

  const chunkSize = Math.ceil(course.places.length / duration);
  return Math.min(duration, Math.floor(index / chunkSize) + 1);
}

type SeedCommentLike = {
  user: string;
  commentKey: string;
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
      {
        name: '부산역',
        address: '부산 동구 중앙대로',
        lat: 35.1151,
        lng: 129.0413,
      },
      {
        name: '감천문화마을',
        address: '부산 사하구 감내2로',
        lat: 35.0975,
        lng: 129.0107,
      },
      {
        name: '자갈치시장',
        address: '부산 중구 자갈치해안로',
        lat: 35.0966,
        lng: 129.0306,
      },
      {
        name: '해운대해수욕장',
        address: '부산 해운대구 우동',
        lat: 35.1587,
        lng: 129.1604,
      },
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
      {
        name: '강릉역',
        address: '강원 강릉시 용지로',
        lat: 37.7637,
        lng: 128.8996,
      },
      {
        name: '오죽헌',
        address: '강원 강릉시 율곡로',
        lat: 37.7793,
        lng: 128.8784,
      },
      {
        name: '경포해변',
        address: '강원 강릉시 강문동',
        lat: 37.8055,
        lng: 128.9095,
      },
      {
        name: '안목해변 커피거리',
        address: '강원 강릉시 창해로14번길',
        lat: 37.7714,
        lng: 128.9476,
      },
    ],
  },
  {
    id: 'seed_post_jeju',
    title: '제주 2박 3일 자연과 가성비 코스',
    content:
      '렌터카로 동쪽 권역을 중심으로 움직이는 2박 3일 코스입니다. 첫날은 공항 도착 후 제주시내 숙소에 짐을 두고 월정리 해변까지 가볍게 이동합니다. 둘째 날은 성산일출봉과 섭지코지를 같은 성산 권역으로 묶어 긴 왕복 이동을 줄이고, 셋째 날은 구좌 해안도로를 따라 공항으로 돌아오는 흐름입니다. 처음 제주를 여행하는 분도 하루 이동량을 예측하기 쉬운 코스입니다.',
    city: '제주',
    duration: 3,
    author: 'minji@example.com',
    tags: ['자연', '가성비', '드라이브'],
    places: [
      {
        name: '제주국제공항',
        address: '제주시 공항로',
        lat: 33.5113,
        lng: 126.4929,
        day: 1,
      },
      {
        name: '월정리 카페거리',
        address: '제주시 구좌읍 월정리',
        lat: 33.5564,
        lng: 126.7953,
        day: 1,
      },
      {
        name: '성산일출봉',
        address: '서귀포시 성산읍',
        lat: 33.4581,
        lng: 126.9425,
        day: 2,
      },
      {
        name: '섭지코지',
        address: '서귀포시 성산읍 고성리',
        lat: 33.4239,
        lng: 126.9293,
        day: 2,
      },
      {
        name: '세화해변',
        address: '제주시 구좌읍 세화리',
        lat: 33.5263,
        lng: 126.8584,
        day: 3,
      },
      {
        name: '동문시장',
        address: '제주시 관덕로14길',
        lat: 33.5116,
        lng: 126.526,
        day: 3,
      },
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
      {
        name: '경복궁',
        address: '서울 종로구 사직로',
        lat: 37.5796,
        lng: 126.977,
      },
      {
        name: '북촌한옥마을',
        address: '서울 종로구 계동길',
        lat: 37.5826,
        lng: 126.9831,
      },
      {
        name: '인사동',
        address: '서울 종로구 인사동길',
        lat: 37.574,
        lng: 126.9849,
      },
      {
        name: '광장시장',
        address: '서울 종로구 창경궁로',
        lat: 37.5701,
        lng: 126.9997,
      },
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
      {
        name: '불국사',
        address: '경북 경주시 불국로',
        lat: 35.79,
        lng: 129.332,
      },
      {
        name: '석굴암',
        address: '경북 경주시 진현동',
        lat: 35.7947,
        lng: 129.349,
      },
      {
        name: '첨성대',
        address: '경북 경주시 인왕동',
        lat: 35.8348,
        lng: 129.219,
      },
      {
        name: '동궁과 월지',
        address: '경북 경주시 원화로',
        lat: 35.8348,
        lng: 129.2265,
      },
      {
        name: '황리단길',
        address: '경북 경주시 포석로',
        lat: 35.836,
        lng: 129.211,
      },
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
      {
        name: '전주한옥마을',
        address: '전북 전주시 완산구 기린대로',
        lat: 35.815,
        lng: 127.153,
      },
      {
        name: '경기전',
        address: '전북 전주시 완산구 태조로',
        lat: 35.8157,
        lng: 127.15,
      },
      {
        name: '전동성당',
        address: '전북 전주시 완산구 태조로',
        lat: 35.8138,
        lng: 127.149,
      },
      {
        name: '남부시장',
        address: '전북 전주시 완산구 풍남문2길',
        lat: 35.811,
        lng: 127.143,
      },
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
      {
        name: '여수세계박람회장',
        address: '전남 여수시 박람회길',
        lat: 34.754,
        lng: 127.747,
      },
      {
        name: '돌산공원',
        address: '전남 여수시 돌산읍',
        lat: 34.737,
        lng: 127.764,
      },
      {
        name: '이순신광장',
        address: '전남 여수시 중앙동',
        lat: 34.739,
        lng: 127.743,
      },
      {
        name: '낭만포차거리',
        address: '전남 여수시 종화동',
        lat: 34.74,
        lng: 127.746,
      },
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
      {
        name: '설악산 소공원',
        address: '강원 속초시 설악산로',
        lat: 38.168,
        lng: 128.496,
      },
      {
        name: '속초해수욕장',
        address: '강원 속초시 조양동',
        lat: 38.19,
        lng: 128.601,
      },
      {
        name: '속초관광수산시장',
        address: '강원 속초시 중앙로',
        lat: 38.207,
        lng: 128.591,
      },
      {
        name: '영금정',
        address: '강원 속초시 동명동',
        lat: 38.213,
        lng: 128.597,
      },
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
      {
        name: '통영 케이블카',
        address: '경남 통영시 발개로',
        lat: 34.829,
        lng: 128.436,
      },
      {
        name: '동피랑 벽화마을',
        address: '경남 통영시 동호동',
        lat: 34.844,
        lng: 128.425,
      },
      {
        name: '통영중앙시장',
        address: '경남 통영시 중앙로',
        lat: 34.845,
        lng: 128.424,
      },
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
      {
        name: '안동 하회마을',
        address: '경북 안동시 풍천면 하회리',
        lat: 36.539,
        lng: 128.517,
      },
      {
        name: '부용대',
        address: '경북 안동시 풍천면',
        lat: 36.543,
        lng: 128.511,
      },
      {
        name: '월영교',
        address: '경북 안동시 상아동',
        lat: 36.556,
        lng: 128.716,
      },
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
      {
        name: '아침고요수목원',
        address: '경기 가평군 상면 수목원로',
        lat: 37.744,
        lng: 127.352,
      },
      {
        name: '쁘띠프랑스',
        address: '경기 가평군 청평면 호반로',
        lat: 37.757,
        lng: 127.496,
      },
      {
        name: '남이섬',
        address: '강원 춘천시 남산면 남이섬길',
        lat: 37.79,
        lng: 127.525,
      },
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
      {
        name: '남산서울타워',
        address: '서울 용산구 남산공원길',
        lat: 37.5512,
        lng: 126.9882,
      },
      {
        name: '반포한강공원',
        address: '서울 서초구 신반포로',
        lat: 37.5106,
        lng: 126.9956,
      },
      {
        name: '익선동 한옥거리',
        address: '서울 종로구 익선동',
        lat: 37.5742,
        lng: 126.9905,
      },
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
      {
        name: '협재해수욕장',
        address: '제주시 한림읍 협재리',
        lat: 33.394,
        lng: 126.24,
      },
      {
        name: '한담해안산책로',
        address: '제주시 애월읍 곽지리',
        lat: 33.407,
        lng: 126.264,
      },
      {
        name: '애월 카페거리',
        address: '제주시 애월읍 애월로',
        lat: 33.463,
        lng: 126.31,
      },
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
      {
        name: '흰여울문화마을',
        address: '부산 영도구 영선동',
        lat: 35.079,
        lng: 129.047,
      },
      {
        name: '전포 카페거리',
        address: '부산 부산진구 전포동',
        lat: 35.156,
        lng: 129.064,
      },
    ],
  },
  {
    id: 'seed_post_incheon',
    title: '인천 당일치기 차이나타운과 바다 코스',
    content:
      '인천 차이나타운에서 짜장면과 공갈빵을 맛보고, 알록달록한 송월동 동화마을 골목을 구경한 뒤 월미도에서 바닷바람을 쐬며 마무리하는 당일치기 코스입니다. 서울에서 지하철로 닿을 수 있어 가족 나들이로 부담 없이 다녀오기 좋습니다.',
    city: '인천',
    duration: 1,
    author: 'jiwoo@example.com',
    tags: ['도심', '맛집', '가족'],
    places: [
      {
        name: '인천 차이나타운',
        address: '인천 중구 차이나타운로',
        lat: 37.475,
        lng: 126.6178,
      },
      {
        name: '송월동 동화마을',
        address: '인천 중구 동화마을길',
        lat: 37.476,
        lng: 126.6155,
      },
      {
        name: '월미도',
        address: '인천 중구 월미문화로',
        lat: 37.4733,
        lng: 126.597,
      },
    ],
  },
  {
    id: 'seed_post_chuncheon',
    title: '춘천 당일치기 닭갈비와 호반 드라이브',
    content:
      '명동 닭갈비 골목에서 푸짐한 닭갈비와 막국수를 맛보고, 소양강 스카이워크에서 강 위를 걸은 뒤 김유정역 주변을 둘러보는 당일치기 코스입니다. 서울 근교 드라이브 코스로 좋고, 호반 도시 특유의 여유로운 분위기를 즐기기에 딱입니다.',
    city: '춘천',
    duration: 1,
    author: 'taemin@example.com',
    tags: ['맛집', '자연', '커플'],
    places: [
      {
        name: '명동 닭갈비골목',
        address: '강원 춘천시 조양동',
        lat: 37.8807,
        lng: 127.7298,
      },
      {
        name: '소양강 스카이워크',
        address: '강원 춘천시 영서로',
        lat: 37.8895,
        lng: 127.732,
      },
      {
        name: '김유정역',
        address: '강원 춘천시 신동면',
        lat: 37.816,
        lng: 127.681,
      },
    ],
  },
  {
    id: 'seed_post_pohang',
    title: '포항 1박 2일 일출과 바다 코스',
    content:
      '호미곶에서 상생의 손과 일출을 보고, 영일대 해수욕장의 해상누각을 거닐며, 죽도시장에서 신선한 대게와 회를 맛보는 1박 2일 코스입니다. 동해의 탁 트인 일출을 보고 싶은 분께 추천하고, 구룡포 근대문화거리도 함께 들르면 좋습니다.',
    city: '포항',
    duration: 2,
    author: 'junho@example.com',
    tags: ['자연', '바다', '맛집'],
    places: [
      {
        name: '호미곶',
        address: '경북 포항시 남구 호미곶면',
        lat: 36.076,
        lng: 129.568,
      },
      {
        name: '영일대해수욕장',
        address: '경북 포항시 북구 두호동',
        lat: 36.056,
        lng: 129.385,
      },
      {
        name: '죽도시장',
        address: '경북 포항시 북구 죽도동',
        lat: 36.033,
        lng: 129.365,
      },
      {
        name: '구룡포 근대문화역사거리',
        address: '경북 포항시 남구 구룡포읍',
        lat: 35.989,
        lng: 129.553,
      },
    ],
  },
  {
    id: 'seed_post_daegu',
    title: '대구 당일치기 골목과 먹거리 코스',
    content:
      '김광석 다시그리기 길에서 벽화와 음악을 즐기고, 서문시장에서 납작만두와 야시장 먹거리를 맛본 뒤 동성로에서 쇼핑으로 마무리하는 당일치기 코스입니다. 도심 속 골목 감성과 시장 먹거리를 한 번에 즐기고 싶은 분께 좋습니다.',
    city: '대구',
    duration: 1,
    author: 'sohee@example.com',
    tags: ['도심', '맛집'],
    places: [
      {
        name: '김광석 다시그리기 길',
        address: '대구 중구 달구벌대로',
        lat: 35.865,
        lng: 128.601,
      },
      {
        name: '서문시장',
        address: '대구 중구 큰장로',
        lat: 35.87,
        lng: 128.579,
      },
      {
        name: '동성로',
        address: '대구 중구 동성로',
        lat: 35.869,
        lng: 128.595,
      },
    ],
  },
  {
    id: 'seed_post_suncheon',
    title: '순천 당일치기 순천만 자연 힐링 코스',
    content:
      '순천만 습지에서 갈대밭과 철새를 보고, 순천만 국가정원의 다채로운 정원을 거닌 뒤 낙안읍성에서 전통 마을을 둘러보는 당일치기 코스입니다. 자연 속에서 천천히 걸으며 힐링하고 싶은 분, 가족 나들이에 잘 어울립니다.',
    city: '순천',
    duration: 1,
    author: 'seoyeon@example.com',
    tags: ['자연', '힐링', '가족'],
    places: [
      {
        name: '순천만 습지',
        address: '전남 순천시 순천만길',
        lat: 34.885,
        lng: 127.509,
      },
      {
        name: '순천만 국가정원',
        address: '전남 순천시 국가정원1호길',
        lat: 34.907,
        lng: 127.501,
      },
      {
        name: '낙안읍성',
        address: '전남 순천시 낙안면',
        lat: 34.906,
        lng: 127.347,
      },
    ],
  },
  {
    id: 'seed_post_damyang',
    title: '담양 당일치기 죽녹원 힐링 코스',
    content:
      '죽녹원의 시원한 대나무 숲길을 걷고, 메타세쿼이아 가로수길에서 인생샷을 남긴 뒤 관방제림 산책으로 마무리하는 당일치기 코스입니다. 초록 가득한 풍경 속에서 더위를 식히고 조용히 쉬고 싶을 때 추천합니다.',
    city: '담양',
    duration: 1,
    author: 'haneul@example.com',
    tags: ['자연', '힐링', '커플'],
    places: [
      {
        name: '죽녹원',
        address: '전남 담양군 담양읍 죽녹원로',
        lat: 35.321,
        lng: 127.001,
      },
      {
        name: '메타세쿼이아 가로수길',
        address: '전남 담양군 담양읍 학동리',
        lat: 35.337,
        lng: 126.987,
      },
      {
        name: '관방제림',
        address: '전남 담양군 담양읍 객사리',
        lat: 35.322,
        lng: 126.992,
      },
    ],
  },
  {
    id: 'seed_post_namhae',
    title: '남해 1박 2일 독일마을과 바다 코스',
    content:
      '독일마을에서 이국적인 풍경과 맥주를 즐기고, 다랭이마을의 계단식 논과 바다를 내려다본 뒤 보리암에서 일출 명소를 둘러보는 1박 2일 코스입니다. 한적한 남쪽 바닷마을의 정취를 좋아하는 커플 여행에 잘 어울립니다.',
    city: '남해',
    duration: 2,
    author: 'taemin@example.com',
    tags: ['자연', '바다', '커플'],
    places: [
      {
        name: '남해 독일마을',
        address: '경남 남해군 삼동면',
        lat: 34.753,
        lng: 127.91,
      },
      {
        name: '가천 다랭이마을',
        address: '경남 남해군 남면 홍현리',
        lat: 34.71,
        lng: 127.887,
      },
      {
        name: '보리암',
        address: '경남 남해군 상주면',
        lat: 34.729,
        lng: 127.981,
      },
    ],
  },
  {
    id: 'seed_post_geoje',
    title: '거제 1박 2일 바람의언덕과 섬 코스',
    content:
      '바람의 언덕에서 탁 트인 바다와 풍차를 보고, 신선대의 기암절벽을 둘러본 뒤 외도 보타니아에서 섬 정원을 즐기는 1박 2일 코스입니다. 푸른 남해와 섬 풍경을 좋아하는 분, 사진 찍기 좋은 명소를 찾는 분께 추천합니다.',
    city: '거제',
    duration: 2,
    author: 'jiwoo@example.com',
    tags: ['자연', '바다', '드라이브'],
    places: [
      {
        name: '바람의 언덕',
        address: '경남 거제시 남부면 갈곶리',
        lat: 34.733,
        lng: 128.648,
      },
      {
        name: '신선대',
        address: '경남 거제시 남부면',
        lat: 34.732,
        lng: 128.647,
      },
      {
        name: '외도 보타니아',
        address: '경남 거제시 일운면 외도',
        lat: 34.748,
        lng: 128.706,
      },
    ],
  },
  {
    id: 'seed_post_yangyang',
    title: '양양 1박 2일 서핑과 바다 코스',
    content:
      '서피비치에서 서핑과 해변 라운지를 즐기고, 죽도 해변과 하조대에서 동해의 절경을 본 뒤 낙산사에서 바다를 낀 사찰을 둘러보는 1박 2일 코스입니다. 액티비티와 바다를 함께 즐기고 싶은 활동적인 여행에 잘 맞습니다.',
    city: '양양',
    duration: 2,
    author: 'sohee@example.com',
    tags: ['액티비티', '바다', '커플'],
    places: [
      {
        name: '서피비치',
        address: '강원 양양군 현북면 하조대해안로',
        lat: 38.117,
        lng: 128.628,
      },
      {
        name: '죽도해변',
        address: '강원 양양군 현남면 인구리',
        lat: 38.066,
        lng: 128.626,
      },
      {
        name: '하조대',
        address: '강원 양양군 현북면 하조대길',
        lat: 38.081,
        lng: 128.639,
      },
      {
        name: '낙산사',
        address: '강원 양양군 강현면 낙산사로',
        lat: 38.123,
        lng: 128.628,
      },
    ],
  },
  {
    id: 'seed_post_gunsan',
    title: '군산 당일치기 근대문화 거리 코스',
    content:
      '경암동 철길마을에서 옛 정취를 느끼고, 초원사진관과 근대역사박물관에서 군산의 역사를 본 뒤 이성당에서 단팥빵과 야채빵을 맛보는 당일치기 코스입니다. 레트로한 분위기와 빵지순례를 함께 즐기고 싶은 분께 추천합니다.',
    city: '군산',
    duration: 1,
    author: 'seoyeon@example.com',
    tags: ['역사', '도심', '맛집'],
    places: [
      {
        name: '경암동 철길마을',
        address: '전북 군산시 경촌4길',
        lat: 35.987,
        lng: 126.718,
      },
      {
        name: '군산근대역사박물관',
        address: '전북 군산시 해망로',
        lat: 35.985,
        lng: 126.711,
      },
      {
        name: '초원사진관',
        address: '전북 군산시 구영2길',
        lat: 35.983,
        lng: 126.714,
      },
      {
        name: '이성당',
        address: '전북 군산시 중앙로',
        lat: 35.981,
        lng: 126.712,
      },
    ],
  },
  {
    id: 'seed_post_daejeon',
    title: '대전 당일치기 빵집과 도심 나들이 코스',
    content:
      '성심당 본점에서 튀김소보로와 명물 빵을 사고, 한밭수목원을 산책한 뒤 으능정이 스카이로드에서 도심 야경을 즐기는 당일치기 코스입니다. 전국에서 찾아오는 빵지순례와 도심 나들이를 함께 즐기고 싶은 분께 좋습니다.',
    city: '대전',
    duration: 1,
    author: 'junho@example.com',
    tags: ['맛집', '도심', '가족'],
    places: [
      {
        name: '성심당 본점',
        address: '대전 중구 대종로480번길',
        lat: 36.328,
        lng: 127.427,
      },
      {
        name: '한밭수목원',
        address: '대전 서구 둔산대로',
        lat: 36.368,
        lng: 127.388,
      },
      {
        name: '으능정이 스카이로드',
        address: '대전 중구 중앙로',
        lat: 36.329,
        lng: 127.427,
      },
    ],
  },
  {
    id: 'seed_post_danyang',
    title: '단양 1박 2일 절경 드라이브 코스',
    content:
      '도담삼봉에서 남한강 위 세 봉우리를 보고, 만천하 스카이워크에서 아찔한 전망을 즐긴 뒤 단양강 잔도를 걷는 1박 2일 코스입니다. 강과 절벽이 어우러진 절경을 따라 드라이브하기 좋고, 마늘 요리 같은 향토 음식도 별미입니다.',
    city: '단양',
    duration: 2,
    author: 'taemin@example.com',
    tags: ['자연', '액티비티', '드라이브'],
    places: [
      {
        name: '도담삼봉',
        address: '충북 단양군 매포읍 삼봉로',
        lat: 36.992,
        lng: 128.336,
      },
      {
        name: '만천하 스카이워크',
        address: '충북 단양군 적성면',
        lat: 36.976,
        lng: 128.387,
      },
      {
        name: '단양강 잔도',
        address: '충북 단양군 단양읍',
        lat: 36.992,
        lng: 128.365,
      },
    ],
  },
  {
    id: 'seed_post_seongsu',
    title: '서울 성수동 카페 투어 코스',
    content:
      '서울숲을 산책하고, 성수동 카페거리에서 공장을 개조한 개성 있는 카페들을 옮겨 다니며, 언더스탠드에비뉴의 편집숍을 구경하는 코스입니다. 트렌디한 분위기와 감성 카페를 좋아하는 분, 친구·연인과 가볍게 다니기 좋은 도심 코스입니다.',
    city: '서울',
    duration: 1,
    author: 'sohee@example.com',
    tags: ['카페', '도심', '커플'],
    places: [
      {
        name: '서울숲',
        address: '서울 성동구 뚝섬로',
        lat: 37.5444,
        lng: 127.0374,
      },
      {
        name: '성수동 카페거리',
        address: '서울 성동구 성수이로',
        lat: 37.544,
        lng: 127.056,
      },
      {
        name: '언더스탠드에비뉴',
        address: '서울 성동구 왕십리로',
        lat: 37.544,
        lng: 127.044,
      },
    ],
  },
  {
    id: 'seed_post_gijang',
    title: '부산 기장 1박 2일 해안 드라이브 코스',
    content:
      '죽성 드림성당에서 바다를 배경으로 사진을 찍고, 아난티 코브와 오시리아 해안을 따라 드라이브한 뒤 일광해수욕장에서 여유를 즐기는 1박 2일 코스입니다. 부산 도심 대신 한적한 동부 해안을 따라 달리고 싶은 커플 여행에 추천합니다.',
    city: '부산',
    duration: 2,
    author: 'jiwoo@example.com',
    tags: ['바다', '드라이브', '커플'],
    places: [
      {
        name: '죽성 드림성당',
        address: '부산 기장군 기장읍 죽성리',
        lat: 35.247,
        lng: 129.247,
      },
      {
        name: '아난티 코브',
        address: '부산 기장군 기장읍 기장해안로',
        lat: 35.19,
        lng: 129.223,
      },
      {
        name: '일광해수욕장',
        address: '부산 기장군 일광읍',
        lat: 35.262,
        lng: 129.233,
      },
    ],
  },
  {
    id: 'seed_post_boseong',
    title: '보성 당일치기 녹차밭 힐링 코스',
    content:
      '대한다원 보성 녹차밭의 푸른 계단식 차밭을 걷고, 녹차 아이스크림과 녹차 음식을 맛본 뒤 율포 해수욕장에서 바다를 보며 마무리하는 당일치기 코스입니다. 초록빛 풍경 속에서 천천히 걸으며 힐링하고 싶은 분께 추천합니다.',
    city: '보성',
    duration: 1,
    author: 'haneul@example.com',
    tags: ['자연', '힐링', '드라이브'],
    places: [
      {
        name: '대한다원 보성녹차밭',
        address: '전남 보성군 보성읍 녹차로',
        lat: 34.706,
        lng: 127.076,
      },
      {
        name: '율포해수욕장',
        address: '전남 보성군 회천면',
        lat: 34.648,
        lng: 127.131,
      },
    ],
  },
  {
    id: 'seed_post_pyeongchang',
    title: '평창 1박 2일 대관령 자연 코스',
    content:
      '대관령 양떼목장에서 초원과 양들을 보고, 오대산 월정사의 전나무 숲길을 걸은 뒤 대관령 하늘목장에서 탁 트인 능선을 감상하는 1박 2일 코스입니다. 시원한 고원의 공기를 마시며 자연 속에서 쉬고 싶은 분, 가족 여행에 잘 맞습니다.',
    city: '평창',
    duration: 2,
    author: 'junho@example.com',
    tags: ['자연', '힐링', '가족'],
    places: [
      {
        name: '대관령 양떼목장',
        address: '강원 평창군 대관령면',
        lat: 37.687,
        lng: 128.743,
      },
      {
        name: '오대산 월정사',
        address: '강원 평창군 진부면 오대산로',
        lat: 37.731,
        lng: 128.592,
      },
      {
        name: '대관령 하늘목장',
        address: '강원 평창군 대관령면',
        lat: 37.662,
        lng: 128.735,
      },
    ],
  },
  {
    id: 'seed_post_seoul_budget',
    title: '서울 1만원대 하루 산책과 시장 먹거리 코스',
    content:
      '서울을 처음 오는 친구에게 추천하기 좋은 저예산 당일 코스입니다. 오전에는 청계천을 따라 광화문까지 천천히 걸으며 도심 분위기를 보고, 점심은 광장시장에서 빈대떡·마약김밥·육회 중 예산에 맞춰 고릅니다. 오후에는 낙산공원 성곽길을 올라 도심 전망을 보고, 해가 지면 동대문디자인플라자 외관 조명까지 보고 마무리합니다. 이동은 지하철과 도보 중심이라 교통비 부담이 적고, 비가 오면 낙산공원 대신 DDP 내부 전시나 동대문 쇼핑몰로 대체하기 쉽습니다.',
    city: '서울',
    duration: 1,
    author: 'jiwoo@example.com',
    tags: ['가성비', '도심', '맛집'],
    places: [
      {
        name: '청계천',
        address: '서울 중구 청계천로',
        lat: 37.5694,
        lng: 126.9787,
      },
      {
        name: '광화문광장',
        address: '서울 종로구 세종대로',
        lat: 37.5726,
        lng: 126.9769,
      },
      {
        name: '광장시장',
        address: '서울 종로구 창경궁로',
        lat: 37.5701,
        lng: 126.9997,
      },
      {
        name: '낙산공원',
        address: '서울 종로구 낙산길',
        lat: 37.5808,
        lng: 127.0075,
      },
      {
        name: '동대문디자인플라자',
        address: '서울 중구 을지로',
        lat: 37.5665,
        lng: 127.0092,
      },
    ],
  },
  {
    id: 'seed_post_seoul_family_museum',
    title: '서울 아이와 가는 박물관·공원 코스',
    content:
      '아이와 서울을 하루 다녀올 때 이동 피로를 줄이도록 용산과 여의도 권역으로 묶은 코스입니다. 오전에는 국립중앙박물관에서 실내 전시를 보고, 바로 옆 용산가족공원에서 간단히 산책합니다. 점심은 이촌역 주변 식당을 이용하면 이동이 짧고, 오후에는 여의도 한강공원으로 넘어가 자전거·돗자리 피크닉을 즐깁니다. 날씨가 덥거나 추우면 한강공원 시간을 줄이고 IFC몰 실내 코스로 대체할 수 있어 가족 여행 변수가 적습니다.',
    city: '서울',
    duration: 1,
    author: 'seoyeon@example.com',
    tags: ['가족', '도심', '힐링'],
    places: [
      {
        name: '국립중앙박물관',
        address: '서울 용산구 서빙고로',
        lat: 37.5238,
        lng: 126.9805,
      },
      {
        name: '용산가족공원',
        address: '서울 용산구 서빙고로',
        lat: 37.5216,
        lng: 126.9831,
      },
      {
        name: '이촌역',
        address: '서울 용산구 이촌로',
        lat: 37.5223,
        lng: 126.9735,
      },
      {
        name: '여의도한강공원',
        address: '서울 영등포구 여의동로',
        lat: 37.5284,
        lng: 126.933,
      },
      {
        name: 'IFC몰',
        address: '서울 영등포구 국제금융로',
        lat: 37.5251,
        lng: 126.9255,
      },
    ],
  },
  {
    id: 'seed_post_busan_rainy',
    title: '부산 비 오는 날 실내 위주 1박 2일 코스',
    content:
      '부산 여행 날짜에 비 예보가 있을 때 쓰기 좋은 실내 중심 1박 2일 코스입니다. 첫날은 부산역에서 가까운 영도 권역으로 이동해 피아크와 흰여울문화마을 카페를 묶고, 저녁에는 숙소가 많은 광안리로 넘어가 야경만 짧게 봅니다. 둘째 날은 센텀시티와 영화의전당을 같은 블록으로 묶어 쇼핑·전시·식사를 한 번에 해결합니다. 해변 산책 비중을 줄이고 실내 대기 시간을 확보해서 우천 취소 위험이 낮습니다.',
    city: '부산',
    duration: 2,
    author: 'sohee@example.com',
    tags: ['카페', '도심', '야경'],
    places: [
      {
        name: '부산역',
        address: '부산 동구 중앙대로',
        lat: 35.1151,
        lng: 129.0413,
        day: 1,
      },
      {
        name: '피아크',
        address: '부산 영도구 해양로195번길',
        lat: 35.0851,
        lng: 129.0584,
        day: 1,
      },
      {
        name: '광안리해수욕장',
        address: '부산 수영구 광안해변로',
        lat: 35.1532,
        lng: 129.1187,
        day: 1,
      },
      {
        name: '센텀시티',
        address: '부산 해운대구 센텀남대로',
        lat: 35.169,
        lng: 129.129,
        day: 2,
      },
      {
        name: '영화의전당',
        address: '부산 해운대구 수영강변대로',
        lat: 35.1711,
        lng: 129.127,
        day: 2,
      },
    ],
  },
  {
    id: 'seed_post_busan_family',
    title: '부산 아이와 가는 아쿠아리움·해변 코스',
    content:
      '아이와 부산을 여행할 때 동선을 짧게 유지하는 해운대 중심 코스입니다. 오전에는 SEA LIFE 부산아쿠아리움에서 실내 관람을 하고, 점심은 해운대시장이나 구남로 주변에서 해결합니다. 오후에는 해운대해수욕장에서 모래놀이와 산책을 하고, 체력이 남으면 동백섬 누리마루까지 가볍게 걷습니다. 이동 거리가 짧고 화장실·식당·카페가 많아 유아 동반 가족에게 편합니다. 여름 성수기에는 오전 일찍 아쿠아리움 예약을 권장합니다.',
    city: '부산',
    duration: 1,
    author: 'haneul@example.com',
    tags: ['가족', '바다', '도심'],
    places: [
      {
        name: 'SEA LIFE 부산아쿠아리움',
        address: '부산 해운대구 해운대해변로',
        lat: 35.1596,
        lng: 129.1603,
      },
      {
        name: '해운대시장',
        address: '부산 해운대구 구남로41번길',
        lat: 35.1628,
        lng: 129.1632,
      },
      {
        name: '해운대해수욕장',
        address: '부산 해운대구 우동',
        lat: 35.1587,
        lng: 129.1604,
      },
      {
        name: '동백섬',
        address: '부산 해운대구 동백로',
        lat: 35.1527,
        lng: 129.1526,
      },
    ],
  },
  {
    id: 'seed_post_jeju_rainy',
    title: '제주 비 오는 날 동쪽 실내·카페 코스',
    content:
      '제주 동쪽 숙소를 잡았는데 비가 올 때 쓰기 좋은 대체 코스입니다. 아르떼뮤지엄 제주는 애월 쪽이라 동쪽 일정에 넣으면 왕복 이동이 커서 제외하고, 구좌·성산 권역 안에서 비자림, 세화해변, 실내 카페를 짧게 묶습니다. 비가 강하면 비자림 산책을 줄이고 세화 주변 카페 체류 시간을 늘리면 됩니다. 성산일출봉처럼 날씨 영향을 크게 받는 장소를 무리하게 넣지 않아 일정 실패 확률이 낮습니다.',
    city: '제주',
    duration: 1,
    author: 'jiwoo@example.com',
    tags: ['카페', '힐링', '비오는날'],
    places: [
      {
        name: '비자림',
        address: '제주시 구좌읍 비자숲길',
        lat: 33.4914,
        lng: 126.8114,
        day: 1,
      },
      {
        name: '카페 공작소',
        address: '제주시 구좌읍 해맞이해안로',
        lat: 33.5238,
        lng: 126.8582,
        day: 1,
      },
      {
        name: '세화해변',
        address: '제주시 구좌읍 세화리',
        lat: 33.5263,
        lng: 126.8584,
        day: 1,
      },
    ],
  },
  {
    id: 'seed_post_jeju_family',
    title: '제주 가족 여행 3박 4일 서쪽·남쪽 여유 코스',
    content:
      '부모님이나 아이와 함께 가는 제주 가족 여행은 하루에 많은 장소를 넣지 않는 것이 중요합니다. 첫날은 공항 도착 후 애월 해안도로까지만 가볍게 보고 서쪽 숙소로 이동합니다. 둘째 날은 협재해수욕장과 한림공원을 같은 한림 권역으로 묶고, 셋째 날은 중문 권역의 천제연폭포와 주상절리대만 여유 있게 봅니다. 마지막 날은 제주시로 올라와 동문시장에서 기념품을 사고 공항으로 이동하는 흐름이라 왕복 이동이 적습니다.',
    city: '제주',
    duration: 4,
    author: 'seoyeon@example.com',
    tags: ['가족', '자연', '드라이브'],
    places: [
      {
        name: '제주국제공항',
        address: '제주시 공항로',
        lat: 33.5113,
        lng: 126.4929,
        day: 1,
      },
      {
        name: '애월해안도로',
        address: '제주시 애월읍',
        lat: 33.4628,
        lng: 126.3094,
        day: 1,
      },
      {
        name: '협재해수욕장',
        address: '제주시 한림읍 협재리',
        lat: 33.394,
        lng: 126.24,
        day: 2,
      },
      {
        name: '한림공원',
        address: '제주시 한림읍 한림로',
        lat: 33.3898,
        lng: 126.2391,
        day: 2,
      },
      {
        name: '천제연폭포',
        address: '서귀포시 천제연로',
        lat: 33.2527,
        lng: 126.4182,
        day: 3,
      },
      {
        name: '주상절리대',
        address: '서귀포시 이어도로',
        lat: 33.2379,
        lng: 126.425,
        day: 3,
      },
      {
        name: '동문시장',
        address: '제주시 관덕로14길',
        lat: 33.5116,
        lng: 126.526,
        day: 4,
      },
    ],
  },
  {
    id: 'seed_post_gangneung_family',
    title: '강릉 아이와 가는 바다·체험 1박 2일 코스',
    content:
      '아이와 강릉을 간다면 바다만 보는 것보다 체험과 실내 장소를 섞는 것이 좋습니다. 첫날은 경포아쿠아리움과 경포호 산책을 묶고, 저녁에는 초당순두부마을에서 부담 없는 식사를 합니다. 둘째 날은 오죽헌에서 짧게 역사 이야기를 보고, 안목해변 커피거리에서는 부모는 커피를 마시고 아이는 해변 산책을 즐기는 흐름입니다. 비가 오면 경포호 산책 시간을 줄이고 아쿠아리움 체류 시간을 늘리면 됩니다.',
    city: '강릉',
    duration: 2,
    author: 'minji@example.com',
    tags: ['가족', '바다', '역사'],
    places: [
      {
        name: '경포아쿠아리움',
        address: '강원 강릉시 난설헌로',
        lat: 37.7967,
        lng: 128.9021,
        day: 1,
      },
      {
        name: '경포호',
        address: '강원 강릉시 저동',
        lat: 37.7951,
        lng: 128.8971,
        day: 1,
      },
      {
        name: '초당순두부마을',
        address: '강원 강릉시 초당동',
        lat: 37.7912,
        lng: 128.9145,
        day: 1,
      },
      {
        name: '오죽헌',
        address: '강원 강릉시 율곡로',
        lat: 37.7793,
        lng: 128.8784,
        day: 2,
      },
      {
        name: '안목해변 커피거리',
        address: '강원 강릉시 창해로14번길',
        lat: 37.7714,
        lng: 128.9476,
        day: 2,
      },
    ],
  },
  {
    id: 'seed_post_gyeongju_family_slow',
    title: '경주 가족 여행 2박 3일 느린 역사 코스',
    content:
      '경주는 볼 곳이 많지만 가족 여행에서는 하루에 두세 곳만 천천히 보는 편이 만족도가 높습니다. 첫날은 대릉원과 첨성대를 걸으며 시내권에 적응하고, 둘째 날은 불국사와 석굴암을 오전에 보고 오후에는 황리단길에서 쉬어갑니다. 마지막 날은 국립경주박물관에서 신라 유물을 보고 동궁과 월지 야경으로 마무리합니다. 역사 설명이 필요한 장소가 많아 아이와 함께라면 이동 중에 짧은 이야기나 사진 자료를 준비하면 좋습니다.',
    city: '경주',
    duration: 3,
    author: 'dohyun@example.com',
    tags: ['가족', '역사', '야경'],
    places: [
      {
        name: '대릉원',
        address: '경북 경주시 황남동',
        lat: 35.8379,
        lng: 129.2115,
      },
      {
        name: '첨성대',
        address: '경북 경주시 인왕동',
        lat: 35.8348,
        lng: 129.219,
      },
      {
        name: '불국사',
        address: '경북 경주시 불국로',
        lat: 35.79,
        lng: 129.332,
      },
      {
        name: '국립경주박물관',
        address: '경북 경주시 일정로',
        lat: 35.8292,
        lng: 129.2282,
      },
      {
        name: '동궁과 월지',
        address: '경북 경주시 원화로',
        lat: 35.8348,
        lng: 129.2265,
      },
    ],
  },
  {
    id: 'seed_post_jeonju_couple',
    title: '전주 커플 1박 2일 한옥 감성 코스',
    content:
      '전주한옥마을을 단순히 빠르게 둘러보는 대신, 숙소와 저녁 시간을 감성 있게 잡은 커플 코스입니다. 낮에는 경기전과 전동성당을 천천히 보고, 오후에는 한옥마을 골목 카페에서 쉬어갑니다. 저녁에는 남부시장 야시장이나 객리단길 식당을 이용하고, 다음 날 아침에는 사람이 적은 시간에 한옥 골목을 산책합니다. 사진을 많이 찍고 싶다면 한복 대여는 오후보다 오전이 덜 붐벼서 좋습니다.',
    city: '전주',
    duration: 2,
    author: 'haneul@example.com',
    tags: ['커플', '역사', '카페'],
    places: [
      {
        name: '전주한옥마을',
        address: '전북 전주시 완산구 기린대로',
        lat: 35.815,
        lng: 127.153,
      },
      {
        name: '경기전',
        address: '전북 전주시 완산구 태조로',
        lat: 35.8157,
        lng: 127.15,
      },
      {
        name: '전동성당',
        address: '전북 전주시 완산구 태조로',
        lat: 35.8138,
        lng: 127.149,
      },
      {
        name: '남부시장',
        address: '전북 전주시 완산구 풍남문2길',
        lat: 35.811,
        lng: 127.143,
      },
      {
        name: '객리단길',
        address: '전북 전주시 완산구 전주객사길',
        lat: 35.8192,
        lng: 127.1428,
      },
    ],
  },
];

// 상세 페이지가 실제 커뮤니티처럼 보이도록 각 코스에 자연스러운 댓글을 넣는다.
const COMMENTS: SeedComment[] = [
  {
    key: 'busan-1',
    postId: 'seed_post_busan',
    author: 'dohyun@example.com',
    content:
      '감천문화마을에서 자갈치시장으로 넘어가는 동선이 좋아요. 저녁은 해운대보다 광안리 쪽도 괜찮았습니다.',
  },
  {
    key: 'busan-2',
    postId: 'seed_post_busan',
    author: 'sohee@example.com',
    content:
      '뚜벅이 기준으로도 무리 없는 코스라 저장해뒀어요. 부모님 모시고 가도 괜찮을까요?',
  },
  {
    key: 'jeju-1',
    postId: 'seed_post_jeju',
    author: 'haneul@example.com',
    content:
      '동쪽 코스는 아침 일찍 성산일출봉부터 가면 훨씬 여유롭습니다. 월정리 노을도 좋았어요.',
  },
  {
    key: 'gyeongju-1',
    postId: 'seed_post_gyeongju',
    author: 'minji@example.com',
    content:
      '동궁과 월지는 꼭 밤에 가는 걸 추천합니다. 낮보다 훨씬 분위기가 좋아요.',
  },
  {
    key: 'jeonju-1',
    postId: 'seed_post_jeonju',
    author: 'jiwoo@example.com',
    content: '전주한옥마을은 오전에 가면 사람이 적어서 사진 찍기 편했습니다.',
  },
  {
    key: 'yeosu-1',
    postId: 'seed_post_yeosu',
    author: 'taemin@example.com',
    content: '낭만포차거리는 주말에 웨이팅이 길어서 조금 일찍 가는 게 좋아요.',
  },
  {
    key: 'sokcho-1',
    postId: 'seed_post_sokcho',
    author: 'seoyeon@example.com',
    content:
      '설악산 소공원은 날씨가 좋으면 케이블카 줄이 길어요. 오전 방문 추천합니다.',
  },
  {
    key: 'gapyeong-1',
    postId: 'seed_post_gapyeong',
    author: 'dohyun@example.com',
    content:
      '서울 근교라 당일치기로 부담 없어서 좋네요. 남이섬은 평일이 훨씬 여유롭습니다.',
  },
  {
    key: 'yangyang-1',
    postId: 'seed_post_yangyang',
    author: 'junho@example.com',
    content:
      '서핑 처음이면 강습 예약하고 가는 게 안전합니다. 바람 부는 날은 체감온도가 낮아요.',
  },
  {
    key: 'seongsu-1',
    postId: 'seed_post_seongsu',
    author: 'minji@example.com',
    content:
      '서울숲 산책 후 성수 카페로 넘어가는 흐름이 좋습니다. 비 오는 날에도 괜찮은 코스예요.',
  },
  {
    key: 'pyeongchang-1',
    postId: 'seed_post_pyeongchang',
    author: 'sohee@example.com',
    content:
      '아이들과 가기 좋겠네요. 월정사 전나무 숲길은 유모차도 괜찮을까요?',
  },
  {
    key: 'gunsan-1',
    postId: 'seed_post_gunsan',
    author: 'haneul@example.com',
    content:
      '군산은 빵지순례랑 근대문화 코스가 잘 어울려요. 이성당은 오전에 가야 종류가 많았습니다.',
  },
  {
    key: 'seoul-budget-1',
    postId: 'seed_post_seoul_budget',
    author: 'taemin@example.com',
    content:
      '서울 처음 오는 친구에게 추천하기 좋네요. 낙산공원은 해 질 무렵에 올라가면 사진이 훨씬 잘 나왔습니다.',
  },
  {
    key: 'seoul-family-1',
    postId: 'seed_post_seoul_family_museum',
    author: 'minji@example.com',
    content:
      '아이와 가면 국립중앙박물관 어린이박물관 예약도 같이 확인하는 게 좋아요. 한강공원까지 동선이 무리 없었습니다.',
  },
  {
    key: 'busan-rainy-1',
    postId: 'seed_post_busan_rainy',
    author: 'dohyun@example.com',
    content:
      '비 오는 부산 코스가 따로 있는 게 좋네요. 센텀 쪽은 식사와 쇼핑을 한 번에 해결하기 편했습니다.',
  },
  {
    key: 'jeju-family-1',
    postId: 'seed_post_jeju_family',
    author: 'sohee@example.com',
    content:
      '가족 여행은 하루 장소 수를 줄이는 게 진짜 중요하더라고요. 서쪽과 남쪽을 나눈 구성이 참고됐습니다.',
  },
  {
    key: 'gangneung-family-1',
    postId: 'seed_post_gangneung_family',
    author: 'jiwoo@example.com',
    content:
      '초당순두부마을을 중간에 넣은 게 좋아요. 아이와 가면 식사 장소가 가까운 게 제일 편했습니다.',
  },
  {
    key: 'gyeongju-family-slow-1',
    postId: 'seed_post_gyeongju_family_slow',
    author: 'haneul@example.com',
    content:
      '경주는 욕심내면 금방 지치는데 2박 3일로 나누니 훨씬 현실적인 일정 같아요.',
  },
];

// 마이페이지와 저장 수가 비어 보이지 않도록 저장 샘플을 넣는다.
const SAVED_POSTS: SeedSavedPost[] = [
  { user: 'minji@example.com', postId: 'seed_post_gangneung' },
  { user: 'minji@example.com', postId: 'seed_post_gyeongju' },
  { user: 'dohyun@example.com', postId: 'seed_post_busan' },
  { user: 'dohyun@example.com', postId: 'seed_post_jeju_west' },
  { user: 'seoyeon@example.com', postId: 'seed_post_yeosu' },
  { user: 'seoyeon@example.com', postId: 'seed_post_pyeongchang' },
  { user: 'junho@example.com', postId: 'seed_post_sokcho' },
  { user: 'haneul@example.com', postId: 'seed_post_gapyeong' },
  { user: 'jiwoo@example.com', postId: 'seed_post_seoul_night' },
  { user: 'sohee@example.com', postId: 'seed_post_busan_cafe' },
  { user: 'taemin@example.com', postId: 'seed_post_danyang' },
  { user: 'taemin@example.com', postId: 'seed_post_namhae' },
  { user: 'minji@example.com', postId: 'seed_post_seoul_budget' },
  { user: 'dohyun@example.com', postId: 'seed_post_busan_rainy' },
  { user: 'seoyeon@example.com', postId: 'seed_post_jeju_family' },
  { user: 'junho@example.com', postId: 'seed_post_gyeongju_family_slow' },
  { user: 'sohee@example.com', postId: 'seed_post_gangneung_family' },
];

// 댓글 좋아요 샘플. 댓글 섹션이 비어 보이지 않게 만든다.
const COMMENT_LIKES: SeedCommentLike[] = [
  { user: 'minji@example.com', commentKey: 'busan-1' },
  { user: 'seoyeon@example.com', commentKey: 'busan-1' },
  { user: 'junho@example.com', commentKey: 'busan-2' },
  { user: 'dohyun@example.com', commentKey: 'jeju-1' },
  { user: 'jiwoo@example.com', commentKey: 'gyeongju-1' },
  { user: 'haneul@example.com', commentKey: 'yeosu-1' },
  { user: 'minji@example.com', commentKey: 'sokcho-1' },
  { user: 'sohee@example.com', commentKey: 'gapyeong-1' },
  { user: 'taemin@example.com', commentKey: 'yangyang-1' },
  { user: 'dohyun@example.com', commentKey: 'seongsu-1' },
  { user: 'junho@example.com', commentKey: 'gunsan-1' },
  { user: 'jiwoo@example.com', commentKey: 'seoul-budget-1' },
  { user: 'seoyeon@example.com', commentKey: 'seoul-family-1' },
  { user: 'minji@example.com', commentKey: 'busan-rainy-1' },
  { user: 'taemin@example.com', commentKey: 'jeju-family-1' },
  { user: 'junho@example.com', commentKey: 'gangneung-family-1' },
  { user: 'dohyun@example.com', commentKey: 'gyeongju-family-slow-1' },
];

async function main() {
  const seedPostIds = COURSES.map((course) => course.id);
  const seedUserIds = USERS.map((user) => user.id);

  // seed를 반복 실행해도 중복되지 않도록 샘플 데이터만 교체한다.
  // 사용자가 직접 만든 게시글은 보존해야 하므로 전체 테이블을 비우지 않는다.
  await prisma.commentLike.deleteMany({
    where: {
      OR: [
        { userId: { in: seedUserIds } },
        { comment: { postId: { in: seedPostIds } } },
      ],
    },
  });
  await prisma.savedPost.deleteMany({
    where: {
      OR: [{ userId: { in: seedUserIds } }, { postId: { in: seedPostIds } }],
    },
  });
  await prisma.postTag.deleteMany({ where: { postId: { in: seedPostIds } } });
  await prisma.place.deleteMany({ where: { postId: { in: seedPostIds } } });
  await prisma.postEmbedding.deleteMany({
    where: { postId: { in: seedPostIds } },
  });
  await prisma.comment.deleteMany({
    where: {
      OR: [{ postId: { in: seedPostIds } }, { authorId: { in: seedUserIds } }],
    },
  });
  await prisma.post.deleteMany({ where: { id: { in: seedPostIds } } });

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
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
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
            day: inferPlaceDay(course, place, index),
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

  const commentIdByKey = new Map<string, string>();
  for (const comment of COMMENTS) {
    const created = await prisma.comment.create({
      data: {
        content: comment.content,
        postId: comment.postId,
        authorId: userIdByEmail.get(comment.author)!,
      },
      select: { id: true },
    });
    commentIdByKey.set(comment.key, created.id);
  }

  await prisma.savedPost.createMany({
    data: SAVED_POSTS.map((saved) => ({
      userId: userIdByEmail.get(saved.user)!,
      postId: saved.postId,
    })),
    skipDuplicates: true,
  });

  await prisma.commentLike.createMany({
    data: COMMENT_LIKES.map((like) => ({
      userId: userIdByEmail.get(like.user)!,
      commentId: commentIdByKey.get(like.commentKey)!,
    })),
    skipDuplicates: true,
  });

  console.log(
    `Travel seed data inserted: ${COURSES.length} courses, ${COMMENTS.length} comments, ${SAVED_POSTS.length} saves`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
