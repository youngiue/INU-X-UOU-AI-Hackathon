# 개발 역할 분담

데이터 전담 없이 4명이 기능 단위로 병렬 개발합니다. `data/jobs.ts`는 임시 샘플이며 실제 데이터 연동은 통합 담당자가 나중에 공급부만 교체합니다.

## 1. 통합·백엔드

- 소유: `app/api`, `lib/types.ts`, 환경변수, 배포, README
- 브랜치: `feature/core-backend`
- 완료 기준: 입력 JSON을 받아 TOP 3 응답, Vercel 배포 성공

## 2. AI·매칭

- 소유: `lib/openai`, `lib/matching`, `lib/schemas`
- 브랜치: `feature/ai-matching`
- 완료 기준: 점수 테스트, OpenAI 설명, 실패 시 fallback

## 3. 프로필 UI

- 소유: `components/profile`, 진입 화면
- 브랜치: `feature/profile-ui`
- 완료 기준: 입력 검증 후 `/api/match` 요청

## 4. 결과·What-if UI

- 소유: `components/results`, 결과 영역
- 브랜치: `feature/results-ui`
- 완료 기준: TOP 3, 이유, 기술, What-if 변화 표시

## 공통 규칙

1. `main`에 직접 push하지 않습니다.
2. 작업 전 `git pull` 후 자신의 브랜치를 만듭니다.
3. 공통 타입이나 `package.json`을 바꾸기 전에 팀에 알립니다.
4. PR 하나에는 한 기능만 담습니다.
5. `.env.local`과 API 키를 커밋하지 않습니다.
6. 완료는 내 컴퓨터가 아니라 PR 미리보기 또는 팀원 환경에서도 작동하는 상태입니다.
