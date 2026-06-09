type PublicUserInput = {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
};

export const publicUserSelect = {
  id: true,
  email: true,
  nickname: true,
  createdAt: true,
} as const;

export function toPublicUser(user: PublicUserInput): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.toISOString(),
  };
}
