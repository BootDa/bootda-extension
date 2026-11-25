import { z } from 'zod';

export function parseSaraminPostingUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || !['www.saramin.co.kr', 'saramin.co.kr'].includes(url.hostname) || url.port || url.username || url.password) {
    throw new Error('사람인 공고 주소가 아닙니다.');
  }
  const id = ['/zf_user/jobs/relay/view', '/zf_user/jobs/view'].includes(url.pathname)
    ? url.searchParams.get('rec_idx')
    : /^\/zf_user\/jobs\/view\/(\d+)\/?$/.exec(url.pathname)?.[1];
  if (!id || !/^\d+$/.test(id)) throw new Error('공고 ID를 확인할 수 없습니다.');
  return { key: `saramin:${id}`, url: `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}` };
}

export const skillsSchema = z.object({ skills: z.array(z.string().trim().min(1).max(80)).max(100) }).strict();
export function normalizeSkills(value: unknown): string[] {
  const { skills } = skillsSchema.parse(value);
  const unique = new Map<string, string>();
  for (const skill of skills) {
    const normalized = skill.normalize('NFKC').toLowerCase();
    if (!unique.has(normalized)) unique.set(normalized, skill);
  }
  return [...unique.values()];
}

export const companyReviewSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().url().refine(value => {
    const u = new URL(value);
    return u.origin === 'https://www.jobplanet.co.kr' && !u.username && !u.password && /^\/companies\/\d+\/?$/.test(u.pathname);
  }),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  checkedAt: z.string().datetime(),
}).strict();

export type Posting = {
  key: string;
  source: 'saramin';
  company: string;
  title: string;
  deadline: string | null;
  url: string;
  skills: string[];
  companyReview: z.infer<typeof companyReviewSchema> | null;
  notes: string;
};
