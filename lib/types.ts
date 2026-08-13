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
    ulsanStatus?: string;
  };
  locationPrecision?: "ADDRESS_CONFIRMED" | "SIGUNGU_CONFIRMED" | "SIDO_ONLY" | "UNKNOWN";
}

export interface JobMatch {
  job: Job;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  gateStatus?: "PASS" | "FAIL" | "UNVERIFIED";
  location_match?: {
    level: "EXACT_LOCAL_MATCH" | "ULSAN_BROAD_MATCH" | "LOCATION_MISMATCH" | "UNKNOWN";
    requested: string | null;
    job_sigungu: string | null;
    reason: string;
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
