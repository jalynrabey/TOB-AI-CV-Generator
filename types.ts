
export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
}

export interface Experience {
  role: string;
  company: string;
  dates: string;
  description: string[];
}

export interface Education {
  institution: string;
  degree: string;
  dates: string;
}

export interface Project {
    name: string;
    description: string[];
}

export interface ResumeData {
  contactInfo: PersonalInfo;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
}

export interface GeminiResponse {
  feedback: {
    strengths: string[];
    improvements: string[];
  };
  optimizedResume: ResumeData;
}
