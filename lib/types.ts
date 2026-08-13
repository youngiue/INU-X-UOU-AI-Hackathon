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
  usualSearchRoles: string[];
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
  fitScore: number;
  discoveryScore: number;
  finalScore: number;
  scoreBreakdown: {
    skill: number;
    experience: number;
    major: number;
    condition: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
}

export interface MatchResponse {
  matches: JobMatch[];
  aiEnhanced: boolean;
}
