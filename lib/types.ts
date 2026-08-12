export interface UserProfile {
  major: string;
  skills: string[];
  experience: string;
  preferredLocation: string;
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
}

export interface JobMatch {
  job: Job;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

export interface MatchResponse {
  matches: JobMatch[];
  aiEnhanced: boolean;
}
