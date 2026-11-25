import { describe, expect, it } from 'vitest';
import { companyReviewSchema, normalizeSkills, parseSaraminPostingUrl } from './posting';

describe('공고 URL', () => {
  it('정규화 및 추적 정보 제거', () => {
    expect(parseSaraminPostingUrl('https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123&track=abc')).toEqual({key:'saramin:123',url:'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=123'});
    expect(parseSaraminPostingUrl('https://saramin.co.kr/zf_user/jobs/view/123').key).toBe('saramin:123');
  });
  it('잘못된 출처와 공고 ID 거절', () => {
    expect(() => parseSaraminPostingUrl('https://evil.test/zf_user/jobs/relay/view?rec_idx=123')).toThrow();
    expect(() => parseSaraminPostingUrl('https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=abc')).toThrow();
  });
});
describe('기술스택', () => {
  it('중복 제거', () => expect(normalizeSkills({skills:['React',' react ','TypeScript']})).toEqual(['React','TypeScript']));
  it('잘못된 응답 거절', () => expect(() => normalizeSkills({skills:[42]})).toThrow());
});
describe('기업 정보', () => {
  const company={name:'예시 기업',url:'https://www.jobplanet.co.kr/companies/123',rating:null,reviewCount:null,checkedAt:'2026-01-01T00:00:00.000Z'};
  it('미확인 값을 보존', () => expect(companyReviewSchema.parse(company).rating).toBeNull());
  it('범위를 벗어난 값과 잘못된 URL 거절', () => {
    expect(companyReviewSchema.safeParse({...company,rating:6}).success).toBe(false);
    expect(companyReviewSchema.safeParse({...company,reviewCount:-1}).success).toBe(false);
    expect(companyReviewSchema.safeParse({...company,url:'https://evil.test/companies/123'}).success).toBe(false);
  });
});
