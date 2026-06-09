// 📌 개발용 초기 데이터 생성 파일. DB를 비운 뒤에도 같은 샘플 데이터를 다시 넣을 수 있다.
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

async function main() {
  // 현재는 인증 학습 전이므로 실제 bcrypt 해시 대신 임시 문자열을 저장한다.
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

  const [parasite, oldboy, burning] = await Promise.all([
    prisma.movie.upsert({
      where: { tmdbId: 496243 },
      update: {
        title: '기생충',
        originalTitle: 'Parasite',
        overview: '계층 격차를 블랙코미디와 스릴러로 풀어낸 봉준호 감독의 영화.',
        releaseDate: new Date('2019-05-30'),
      },
      create: {
        id: 'seed_movie_parasite',
        tmdbId: 496243,
        title: '기생충',
        originalTitle: 'Parasite',
        overview: '계층 격차를 블랙코미디와 스릴러로 풀어낸 봉준호 감독의 영화.',
        releaseDate: new Date('2019-05-30'),
      },
    }),
    prisma.movie.upsert({
      where: { tmdbId: 670 },
      update: {
        title: '올드보이',
        originalTitle: 'Oldboy',
        overview: '오랜 감금 이후 복수를 추적하는 박찬욱 감독의 스릴러.',
        releaseDate: new Date('2003-11-21'),
      },
      create: {
        id: 'seed_movie_oldboy',
        tmdbId: 670,
        title: '올드보이',
        originalTitle: 'Oldboy',
        overview: '오랜 감금 이후 복수를 추적하는 박찬욱 감독의 스릴러.',
        releaseDate: new Date('2003-11-21'),
      },
    }),
    prisma.movie.upsert({
      where: { tmdbId: 491584 },
      update: {
        title: '버닝',
        originalTitle: 'Burning',
        overview: '미스터리한 관계와 불안을 섬세하게 따라가는 이창동 감독의 영화.',
        releaseDate: new Date('2018-05-17'),
      },
      create: {
        id: 'seed_movie_burning',
        tmdbId: 491584,
        title: '버닝',
        originalTitle: 'Burning',
        overview: '미스터리한 관계와 불안을 섬세하게 따라가는 이창동 감독의 영화.',
        releaseDate: new Date('2018-05-17'),
      },
    }),
  ]);

  const tags = await Promise.all(
    ['드라마', '스릴러', '공포', '감동', '반전'].map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const tagByName = new Map(tags.map((tag) => [tag.name, tag]));

  const [parasiteReview, oldboyReview, burningReview] = await Promise.all([
    prisma.review.upsert({
      where: { id: 'seed_review_parasite' },
      update: {
        title: '기생충은 왜 오래 남는가',
        content:
          '기생충은 가족 이야기처럼 시작하지만 계층 문제를 날카롭게 드러낸다. 장면마다 긴장과 유머가 공존해서 다시 보고 싶은 영화다.',
        rating: 5,
        isSpoiler: false,
        authorId: minji.id,
        movieId: parasite.id,
      },
      create: {
        id: 'seed_review_parasite',
        title: '기생충은 왜 오래 남는가',
        content:
          '기생충은 가족 이야기처럼 시작하지만 계층 문제를 날카롭게 드러낸다. 장면마다 긴장과 유머가 공존해서 다시 보고 싶은 영화다.',
        rating: 5,
        isSpoiler: false,
        authorId: minji.id,
        movieId: parasite.id,
      },
    }),
    prisma.review.upsert({
      where: { id: 'seed_review_oldboy' },
      update: {
        title: '올드보이의 강렬한 반전',
        content:
          '올드보이는 복수극의 형태를 빌려 인간의 집착과 죄책감을 밀도 있게 보여준다. 결말의 충격이 영화 전체를 다시 보게 만든다.',
        rating: 5,
        isSpoiler: true,
        authorId: dohyun.id,
        movieId: oldboy.id,
      },
      create: {
        id: 'seed_review_oldboy',
        title: '올드보이의 강렬한 반전',
        content:
          '올드보이는 복수극의 형태를 빌려 인간의 집착과 죄책감을 밀도 있게 보여준다. 결말의 충격이 영화 전체를 다시 보게 만든다.',
        rating: 5,
        isSpoiler: true,
        authorId: dohyun.id,
        movieId: oldboy.id,
      },
    }),
    prisma.review.upsert({
      where: { id: 'seed_review_burning' },
      update: {
        title: '버닝이 남기는 불안감',
        content:
          '버닝은 사건을 명확히 설명하기보다 인물의 공허함과 의심을 천천히 쌓아 올린다. 여운이 길게 남는 드라마다.',
        rating: 4,
        isSpoiler: false,
        authorId: minji.id,
        movieId: burning.id,
      },
      create: {
        id: 'seed_review_burning',
        title: '버닝이 남기는 불안감',
        content:
          '버닝은 사건을 명확히 설명하기보다 인물의 공허함과 의심을 천천히 쌓아 올린다. 여운이 길게 남는 드라마다.',
        rating: 4,
        isSpoiler: false,
        authorId: minji.id,
        movieId: burning.id,
      },
    }),
  ]);

  const reviewTags = [
    { reviewId: parasiteReview.id, tagId: tagByName.get('드라마')!.id },
    { reviewId: parasiteReview.id, tagId: tagByName.get('스릴러')!.id },
    { reviewId: oldboyReview.id, tagId: tagByName.get('스릴러')!.id },
    { reviewId: oldboyReview.id, tagId: tagByName.get('반전')!.id },
    { reviewId: burningReview.id, tagId: tagByName.get('드라마')!.id },
    { reviewId: burningReview.id, tagId: tagByName.get('감동')!.id },
  ];

  await Promise.all(
    reviewTags.map((reviewTag) =>
      prisma.reviewTag.upsert({
        where: {
          reviewId_tagId: reviewTag,
        },
        update: {},
        create: reviewTag,
      }),
    ),
  );

  console.log('Seed data inserted');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
