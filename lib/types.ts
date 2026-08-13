export interface UserProfile {
  major: string;
  education: string;
  careerExperiences: string[];
  internshipExperiences: string[];
  projectExperiences: string[];
  certificates: string[];
  skills: string[];
  trainingExperiences: string[];
  preferredConditions: string;
  interestedIndustries: string[];
  usualSearchKeywords?: string[];
  experience: string;
  preferredLocation: string;
  age?: number;
  yearsExperience?: number;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  discoveredRole: string;
  location: string;
  employmentType: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  relatedMajors: string[];
  sourceUrl: string;
  hardGates?: string[];
  qualityTier?: "CORE" | "SUPPORT" | "EXCLUDE";
  postingStatus?: "OPEN" | "CLOSED" | "UNKNOWN";
  usageMode?: "CURRENT_OPPORTUNITY" | "CAREER_DISCOVERY_REFERENCE";
  analysisConfidence?: "HIGH" | "MEDIUM" | "LOW";
  descriptionQuality?: "HIGH" | "MEDIUM" | "LOW";
  verificationLevel?: "A" | "B" | "C" | "D" | "E";
  ulsanStatus?: string;
  occupationType?: string;
  employer?: string;
  actualTasks?: string[];
  analysisSkills?: string[];
  toolsNormalized?: string[];
  aiRequiredSkills?: string[];
  transferableSkills?: string[];
  relatedRoles?: string[];
  suitableExperienceExamples?: string[];
  hardGateSummary?: string[];
  titleTaskGap?: { level?: string; reason?: string };
  discoveryValue?: string;
  analysisNote?: string;
  workLocation?: {
    raw?: string;
    sido?: "울산" | string | null;
    sigungu?: "중구" | "남구" | "동구" | "북구" | "울주군" | null;
    sigunguCandidates?: ("중구" | "남구" | "동구" | "북구" | "울주군")[];
    worksites?: { name: string; sigungu: "중구" | "남구" | "동구" | "북구" | "울주군"; detail?: string }[];
    ulsanStatus?: string;
  };
  locationPrecision?: "ADDRESS_CONFIRMED" | "SIGUNGU_CONFIRMED" | "MULTI_WORKSITE_CONFIRMED" | "COMPANY_ADDRESS_FALLBACK" | "MULTI_SIGUNGU_CONFIRMED" | "SIDO_ONLY" | "UNKNOWN";
}

export interface SubScore {
  label: string;
  score: number;
  weight: number;
}

export interface SkillMatch {
  label: string;
  sourceContext: string;
  relatedTo: string;
}

export interface SkillGap {
  label: string;
  suggestion?: string;
}

export type MatchEvidenceCategory =
  | "major" | "education" | "skill" | "certificate" | "career"
  | "internship" | "project" | "training" | "industry" | "location";

export interface MatchEvidence {
  id: string;
  category: MatchEvidenceCategory;
  profileValue: string;
  jobValue: string;
  explanationBasis?: string;
}

export interface JobMatch {
  job: Job;
  score: number;
  subScores: SubScore[];
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  reasonSummary: string;
  strengths: SkillMatch[];
  gaps: SkillGap[];
  isHiddenGem: boolean;
  hiddenGemNote?: string;
  gateStatus?: "PASS" | "FAIL" | "UNVERIFIED";
  location_match?: {
    level: "EXACT_LOCAL_MATCH" | "MULTI_WORKSITE_MATCH" | "MULTI_SIGUNGU_MATCH" | "COMPANY_ADDRESS_FALLBACK" | "ULSAN_BROAD_MATCH" | "LOCATION_MISMATCH" | "UNKNOWN";
    requested: string | null;
    job_sigungu: string | null;
    reason: string;
  };
  matchedEvidence?: MatchEvidence[];
  missingEvidence?: MatchEvidence[];
  locationMatch?: boolean;
  matchedQualifications?: string[];
  missingQualifications?: string[];
  uncertainQualifications?: string[];
  aiExplanation?: {
    summary: string;
    recommendationReasons: string[];
    profileConnections: string[];
    missingConditions: string[];
    improvementSuggestions: string[];
    unexpectedConnections: string[];
    similarRoles: Array<{ role: string; reason: string }>;
  };
}

export interface MatchResponse {
  status: "MATCHED" | "NO_MATCH";
  current_opportunities: JobMatch[];
  career_discovery: JobMatch[];
  no_match_reason?: string;
  matches: JobMatch[];
  aiEnhanced: boolean;
}
