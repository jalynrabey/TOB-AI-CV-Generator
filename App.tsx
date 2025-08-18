import React, { useState, useCallback } from 'react';
import type { PersonalInfo, GeminiResponse } from './types';
import { generateResume } from './services/geminiService';
import { parseResumeFile } from './services/fileParser';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import { SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
  });
  const [resumeText, setResumeText] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [desiredRole, setDesiredRole] = useState<string>('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeminiResponse | null>(null);
  
  const [apiKey, setApiKey] = useState<string>('');
  const [apiProvider, setApiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);

  const handleFileSelect = useCallback(async (file: File) => {
      if (!file) return;
      setIsParsingFile(true);
      setResumeText('');
      setSelectedFile(file);
      setError(null);
      try {
          const text = await parseResumeFile(file);
          setResumeText(text);
      } catch (err: any) {
          setError(err.message || "Failed to parse file. Please try a different file or format.");
          setSelectedFile(null);
      } finally {
          setIsParsingFile(false);
      }
  }, []);

  const clearFile = useCallback(() => {
      setSelectedFile(null);
      setResumeText('');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!personalInfo.name || !personalInfo.email || !resumeText || (!jobDescription && !desiredRole)) {
        setError("Please fill in all required fields: Name, Email, Resume, and either Desired Role or Job Description.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedData(null);

    try {
      if (apiProvider === 'gemini') {
          const response = await generateResume(personalInfo, resumeText, jobDescription, desiredRole, apiKey);
          setGeneratedData(response);
      } else {
          throw new Error("OpenAI is not yet supported.");
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [personalInfo, resumeText, jobDescription, desiredRole, apiKey, apiProvider]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="flex justify-center items-center gap-3">
             <SparklesIcon className="w-10 h-10 text-indigo-600" />
             <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800">
                AI Resume Optimizer
             </h1>
          </div>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Transform your resume into a powerful tool that lands interviews. Provide your info, add a job description, and let AI craft a perfectly tailored resume.
          </p>
        </header>

        <InputSection
          personalInfo={personalInfo}
          setPersonalInfo={setPersonalInfo}
          profilePicture={profilePicture}
          setProfilePicture={setProfilePicture}
          resumeText={resumeText}
          setResumeText={setResumeText}
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          desiredRole={desiredRole}
          setDesiredRole={setDesiredRole}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          onFileSelect={handleFileSelect}
          selectedFileName={selectedFile?.name || null}
          clearFile={clearFile}
          isParsingFile={isParsingFile}
          apiKey={apiKey}
          setApiKey={setApiKey}
          apiProvider={apiProvider}
          setApiProvider={setApiProvider}
        />
        
        <OutputSection data={generatedData} isLoading={isLoading} error={error} profilePicture={profilePicture}/>
      </main>
      
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI Resume Optimizer. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;