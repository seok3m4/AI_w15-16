import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { OpenAiService } from '../src/rag/openai.service';
import { RagService } from '../src/rag/rag.service';

const envFile =
  process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--dotenv-file='))
    ?.replace(/^--dotenv-file=/, '') ?? path.resolve(__dirname, '../../../.env');

config({ path: path.resolve(envFile) });

const SAMPLE_USERS = [
  { id: 'seed_user_minji', email: 'minji@example.com', name: '김민지' },
  { id: 'seed_user_dohyun', email: 'dohyun@example.com', name: '이도현' },
  { id: 'seed_user_seoyeon', email: 'seoyeon@example.com', name: '박서연' },
  { id: 'seed_user_junho', email: 'junho@example.com', name: '최준호' },
  { id: 'seed_user_haneul', email: 'haneul@example.com', name: '정하늘' },
  { id: 'seed_user_jiwoo', email: 'jiwoo@example.com', name: '윤지우' },
  { id: 'seed_user_taemin', email: 'taemin@example.com', name: '강태민' },
  { id: 'seed_user_sohee', email: 'sohee@example.com', name: '한소희' },
];

type SeedPlace = {
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  day?: number;
  order?: number;
};

type SeedCourse = {
  id: string;
  title: string;
  content: string;
  city: string;
  duration?: number | null;
  tags?: string[];
  places?: SeedPlace[];
  thumbnailUrl?: string | null;
};

type Args = {
  dryRun: boolean;
  skipEmbeddings: boolean;
  filePath: string;
  envFilePath: string;
};

function parseArgs(): Args {
  const defaultPath = path.resolve(__dirname, '../../../travel_courses_seed.json');
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes('--dry-run'),
    skipEmbeddings: args.includes('--skip-embeddings'),
    filePath:
      args
        .find((arg) => arg.startsWith('--file='))
        ?.replace(/^--file=/, '') ?? defaultPath,
    envFilePath: path.resolve(envFile),
  };
}

function readCourses(filePath: string): SeedCourse[] {
  const absolutePath = path.resolve(filePath);
  const parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('Import file must be a JSON array.');
  }

  return parsed.map((course, index) => {
    if (
      typeof course !== 'object' ||
      course === null ||
      !('id' in course) ||
      !('title' in course) ||
      !('content' in course) ||
      !('city' in course)
    ) {
      throw new Error(`Invalid course at index ${index}.`);
    }

    return course as SeedCourse;
  });
}

function uniqueNames(rawTags: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawTags) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  }

  return result;
}

function inferPlaceDay(course: SeedCourse, place: SeedPlace, index: number) {
  if (place.day) {
    return place.day;
  }

  const places = course.places ?? [];
  const duration = Math.max(1, course.duration ?? 1);
  if (duration === 1 || places.length === 0) {
    return 1;
  }

  const chunkSize = Math.ceil(places.length / duration);
  return Math.min(duration, Math.floor(index / chunkSize) + 1);
}

function normalizeConnectionString(connectionString: string): string {
  const url = new URL(connectionString);

  if (
    url.hostname.endsWith('.render.com') &&
    !url.searchParams.has('sslmode')
  ) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}

async function upsertSampleUsers(prisma: PrismaClient) {
  const users: Array<{ id: string; email: string; name: string }> = [];

  for (const user of SAMPLE_USERS) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: 'import-only-seed-user',
      },
      select: { id: true, email: true, name: true },
    });
    users.push(saved);
  }

  return users;
}

async function createCourse(
  prisma: PrismaClient,
  course: SeedCourse,
  authorId: string,
) {
  const tags: Array<{ id: string; name: string }> = [];
  for (const name of uniqueNames(course.tags)) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });
    tags.push(tag);
  }

  const places = course.places ?? [];

  await prisma.post.create({
    data: {
      id: course.id,
      title: course.title,
      content: course.content,
      city: course.city,
      duration: course.duration ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      authorId,
      places: {
        create: places.map((place, index) => ({
          name: place.name,
          address: place.address ?? null,
          lat: place.lat,
          lng: place.lng,
          day: inferPlaceDay(course, place, index),
          order: place.order ?? index,
        })),
      },
      tags: {
        create: tags.map((tag) => ({
          tag: { connect: { id: tag.id } },
        })),
      },
    },
  });
}

async function main() {
  const { dryRun, envFilePath, filePath, skipEmbeddings } = parseArgs();
  const courses = readCourses(filePath);
  const ids = courses.map((course) => course.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error('Import file contains duplicate course ids.');
  }

  console.log(
    `Ready to import ${courses.length} courses across ${SAMPLE_USERS.length} sample users.`,
  );
  console.log(`Environment file: ${envFilePath}`);

  const distribution = new Map<string, number>();
  courses.forEach((_, index) => {
    const user = SAMPLE_USERS[index % SAMPLE_USERS.length];
    distribution.set(user.name, (distribution.get(user.name) ?? 0) + 1);
  });
  console.table([...distribution.entries()].map(([name, count]) => ({ name, count })));

  if (dryRun) {
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: normalizeConnectionString(connectionString),
    }),
  });

  await prisma.$connect();

  try {
    const authors = await upsertSampleUsers(prisma);
    await prisma.post.deleteMany({ where: { id: { in: ids } } });

    for (const [index, course] of courses.entries()) {
      const author = authors[index % authors.length];
      await createCourse(prisma, course, author.id);
      console.log(
        `Created ${index + 1}/${courses.length}: ${course.title} (${author.name})`,
      );
    }

    if (!skipEmbeddings) {
      const openai = new OpenAiService();
      if (!openai.enabled) {
        throw new Error(
          'OPENAI_API_KEY is required to create embeddings. Re-run with --skip-embeddings to import posts only.',
        );
      }

      const rag = new RagService(prisma as unknown as PrismaService, openai);
      for (const [index, course] of courses.entries()) {
        await rag.upsertEmbedding(course.id);
        console.log(`Embedded ${index + 1}/${courses.length}: ${course.title}`);
      }
    }

    console.log('Import complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
