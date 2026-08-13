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
  usualSearchKeywords: string[];
  experience: string;
  preferredLocation: string;
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

export interface JobMatch {
  job: Job;
  subScores: SubScore[];
  matchedSkills: string[];
  missingSkills: string[];
  reasonSummary: string;
  strengths: SkillMatch[];
  gaps: SkillGap[];
  isHiddenGem: boolean;
  hiddenGemNote?: string;
}

export interface MatchResponse {
  matches: JobMatch[];
  aiEnhanced: boolean;
}
