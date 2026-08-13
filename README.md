# 울산 숨은 취업기회 AI

직무명이 아니라 채용공고의 실제 업무와 사용자 역량을 비교해, 사용자가 몰랐던 울산 지역 취업기회를 발견하는 해커톤 웹서비스입니다.

## 현재 구현 범위

- 전공, 기술, 경험, 희망 근무지역 입력
- 샘플 울산 채용공고 기반 업무 적합도 계산
- 숨은 직무 TOP 3와 매칭 근거 표시
- 부족 기술을 추가했을 때 점수를 다시 계산하는 What-if
- `OPENAI_API_KEY`가 있으면 상위 결과의 설명을 OpenAI Responses API로 보강
- 키가 없거나 AI 호출이 실패해도 코드 기반 결과로 정상 동작

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

OpenAI 기능을 사용하려면 `.env.local`에 서버 전용 키를 넣습니다.

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-nano
```

`.env.local`은 GitHub에 올리지 않습니다.

## 팀 브랜치

- `feature/core-backend`: API, 공통 타입, 배포
- `feature/ai-matching`: OpenAI, 점수 계산, 스키마
- `feature/profile-ui`: 사용자 입력 화면
- `feature/results-ui`: 추천 결과와 What-if 화면

자세한 분업 방식은 [docs/team-roles.md](docs/team-roles.md)를 참고하세요.

AI 활용 범위, 개인정보 처리 원칙과 데이터 출처 표기 기준은 [docs/ai-usage-and-data.md](docs/ai-usage-and-data.md)를 참고하세요.

## 주요 구조

```text
app/api/match/       매칭 API
components/profile/  프로필 입력 화면
components/results/  추천 결과 화면
data/                임시 채용공고 데이터
lib/matching/        점수 계산
lib/openai/          선택적 AI 설명 생성
lib/schemas/         요청 검증 및 구조화 출력
lib/types.ts         공통 타입
```

## 데이터

운영 매칭은 `data/ulsan-jobs.json`, `data/ulsan-humanities-business-jobs.json`,
`data/ulsan-public-service-jobs.json`의 RAW 공고와 각 AI_ANALYSIS JSON을 ID 기준으로 결합해 사용합니다.
