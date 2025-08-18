import { GoogleGenAI, Type } from "@google/genai";
import type { PersonalInfo, GeminiResponse } from '../types';

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        feedback: {
            type: Type.OBJECT,
            properties: {
                strengths: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 strengths of the original resume."
                },
                improvements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 areas for improvement in the original resume."
                }
            }
        },
        optimizedResume: {
            type: Type.OBJECT,
            properties: {
                contactInfo: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        email: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        linkedin: { type: Type.STRING },
                    }
                },
                summary: {
                    type: Type.STRING,
                    description: "A powerful, concise professional summary of 3-5 sentences, optimized for the target role."
                },
                skills: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "A list of relevant technical and soft skills, tailored to the job description."
                },
                experience: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            role: { type: Type.STRING },
                            company: { type: Type.STRING },
                            dates: { type: Type.STRING },
                            description: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "Action-oriented, results-driven bullet points."
                            }
                        }
                    }
                },
                education: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            institution: { type: Type.STRING },
                            degree: { type: Type.STRING },
                            dates: { type: Type.STRING }
                        }
                    }
                },
                projects: {
                    type: Type.ARRAY,
                    items: {
                         type: Type.OBJECT,
                         properties: {
                            name: { type: Type.STRING },
                            description: { 
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "Bullet points describing the project."
                            }
                         }
                    }
                }
            }
        }
    }
};


export const generateResume = async (
  personalInfo: PersonalInfo,
  resumeText: string,
  jobDescription: string,
  desiredRole: string,
  apiKey: string
): Promise<GeminiResponse> => {
  const keyToUse = apiKey || process.env.API_KEY;
  if (!keyToUse) {
      throw new Error("API key not provided. Please enter your API key in the advanced options or ensure the API_KEY environment variable is set.");
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse });
  
  let targetInfo = '';
  if (desiredRole) {
      targetInfo += `\n- Target Role: ${desiredRole}`;
  }
  if (jobDescription) {
      targetInfo += `\n- Target Job Description:\n---\n${jobDescription}\n---`;
  }

  const prompt = `
    Act as a world-class solution architect and an expert human resources specialist. Your task is to analyze the provided resume against the target role/job description and generate an optimized resume.

    Here is the user's information:
    - Personal Details: ${JSON.stringify(personalInfo)}
    - Current Resume Text:
    ---
    ${resumeText}
    ---
    ${targetInfo ? `\nHere is the target the user is applying for:${targetInfo}` : ''}

    Based on this information, perform the following tasks and provide the output in a single, valid JSON object that strictly adheres to the provided schema. Do not include any introductory text, explanations, or markdown formatting.

    1.  **feedback**: Provide concise, constructive feedback. Identify 3 strengths and 3 areas for improvement from the original resume.
    2.  **optimizedResume**: Generate the full content for a new, optimized resume.
        - **contactInfo**: Use the provided personal details.
        - **summary**: Write a new, powerful professional summary (3-5 sentences).
        - **skills**: Create a list of relevant skills based on the job description and resume.
        - **experience**: Rephrase bullet points to be action-oriented and results-driven, incorporating keywords from the job description.
        - **education**: Extract and list educational background.
        - **projects**: If present in the original resume, extract and list projects. If not, provide an empty array.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.5,
            },
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText) as GeminiResponse;
        
        if (!parsedResponse.optimizedResume.projects) {
            parsedResponse.optimizedResume.projects = [];
        }

        return parsedResponse;
    } catch (error) {
        console.error("Error generating resume with Gemini API:", error);
        throw new Error("Failed to generate the resume. Please check your inputs and API key, then try again.");
    }
};