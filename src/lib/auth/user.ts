type PublicUserInput = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam: string | null;
  createdAt: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  nickname: string;
  favoriteTeam: string | null;
  createdAt: string;
};

export const publicUserSelect = {
  id: true,
  email: true,
  nickname: true,
  favoriteTeam: true,
  createdAt: true,
} as const;

export function toPublicUser(user: PublicUserInput): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    favoriteTeam: user.favoriteTeam,
    createdAt: user.createdAt.toISOString(),
  };
}
