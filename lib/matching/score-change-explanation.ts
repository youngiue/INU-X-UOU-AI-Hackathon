import type { JobMatch } from "../types.ts";

export function createScoreChangeExplanation(
  addedSkill: string,
  originalMatch: JobMatch,
  boostedMatch: JobMatch,
): string {
  const originalScore = Math.round(originalMatch.subScores.reduce((sum, item) => sum + item.score * item.weight, 0));
  const boostedScore = Math.round(boostedMatch.subScores.reduce((sum, item) => sum + item.score * item.weight, 0));
  const becameMatched = !originalMatch.matchedSkills.includes(addedSkill)
    && boostedMatch.matchedSkills.includes(addedSkill);
  const leftMissing = originalMatch.missingSkills.includes(addedSkill)
    && !boostedMatch.missingSkills.includes(addedSkill);
  const scoreDelta = boostedScore - originalScore;

  const matchChange = becameMatched && leftMissing
    ? `${addedSkill} 역량을 보유했다고 가정하면서 공고 요구 기술과 일치하는 항목이 늘고, 부족 기술 목록에서는 제외되었습니다.`
    : becameMatched
      ? `${addedSkill} 역량을 보유했다고 가정하면서 공고 요구 기술과 일치하는 항목이 늘었습니다.`
      : leftMissing
        ? `${addedSkill} 역량을 보유했다고 가정하면서 부족 기술 목록에서 해당 항목이 제외되었습니다.`
        : `${addedSkill} 역량을 추가했지만 일치 기술과 부족 기술 목록은 달라지지 않았습니다.`;
  const scoreChange = scoreDelta > 0
    ? `매칭 알고리즘이 다시 계산한 점수가 ${originalScore}점에서 ${boostedScore}점으로 변경되었습니다.`
    : scoreDelta < 0
      ? `매칭 알고리즘이 다시 계산한 점수는 ${originalScore}점에서 ${boostedScore}점으로 낮아졌습니다.`
      : `매칭 알고리즘이 다시 계산한 점수는 ${originalScore}점으로 동일합니다.`;

  return `${matchChange} ${scoreChange} 이는 해당 기술을 추가했다고 가정한 모의 결과이며 실제 경력이나 합격 가능성을 의미하지 않습니다.`;
}
