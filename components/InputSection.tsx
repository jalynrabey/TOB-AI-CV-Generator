import React, { useState, useCallback, useRef } from 'react';
import type { PersonalInfo } from '../types';
import { SparklesIcon, UploadCloudIcon, UserIcon, XIcon } from './icons';

interface InputSectionProps {
  personalInfo: PersonalInfo;
  setPersonalInfo: React.Dispatch<React.SetStateAction<PersonalInfo>>;
  profilePicture: string | null;
  setProfilePicture: (pic: string | null) => void;
  resumeText: string;
  jobDescription: string;
  setJobDescription: (value: string) => void;
  desiredRole: string;
  setDesiredRole: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onFileSelect: (file: File) => void;
  selectedFileName: string | null;
  clearFile: () => void;
  isParsingFile: boolean;
  apiKey: string;
  setApiKey: (key: string) => void;
  apiProvider: string;
  setApiProvider: (provider: 'gemini' | 'openai') => void;
  setResumeText: (text: string) => void;
}

const InputSection: React.FC<InputSectionProps> = ({
  personalInfo,
  setPersonalInfo,
  profilePicture,
  setProfilePicture,
  resumeText,
  jobDescription,
  setJobDescription,
  desiredRole,
  setDesiredRole,
  onGenerate,
  isLoading,
  onFileSelect,
  selectedFileName,
  clearFile,
  isParsingFile,
  apiKey,
  setApiKey,
  apiProvider,
  setApiProvider,
  setResumeText
}) => {
  const [inputType, setInputType] = useState<'text' | 'file'>('text');
  const [isApiOptionsOpen, setApiOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfilePicture(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        onFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const isFormValid = () => {
      return personalInfo.name && personalInfo.email && resumeText && (jobDescription || desiredRole);
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
      <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Your Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-1 flex flex-col items-center justify-center">
                  <input type="file" accept="image/*" className="sr-only" ref={profilePicInputRef} onChange={handleProfilePictureChange} />
                  <div className="relative group">
                      <button onClick={() => profilePicInputRef.current?.click()} className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 hover:bg-gray-200 hover:border-indigo-400 transition-colors cursor-pointer overflow-hidden">
                          {profilePicture ? (
                              <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                              <div className="text-center text-gray-500">
                                  <UserIcon className="w-10 h-10 mx-auto" />
                                  <span className="text-xs mt-1 block">Upload Photo</span>
                              </div>
                          )}
                      </button>
                      {profilePicture && (
                           <button onClick={() => setProfilePicture(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <XIcon className="w-4 h-4" />
                           </button>
                      )}
                  </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" name="name" placeholder="Full Name *" value={personalInfo.name} onChange={handlePersonalInfoChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:col-span-2" required/>
                  <input type="email" name="email" placeholder="Email Address *" value={personalInfo.email} onChange={handlePersonalInfoChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition sm:col-span-2" required/>
                  <input type="tel" name="phone" placeholder="Phone Number" value={personalInfo.phone} onChange={handlePersonalInfoChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
                  <input type="url" name="linkedin" placeholder="LinkedIn Profile URL" value={personalInfo.linkedin} onChange={handlePersonalInfoChange} className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"/>
              </div>
          </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Your Current Resume *</h2>
        <div className="flex border-b border-gray-200">
            <button onClick={() => setInputType('text')} className={`px-4 py-2 text-sm font-medium transition-colors ${inputType === 'text' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Paste Text</button>
            <button onClick={() => setInputType('file')} className={`px-4 py-2 text-sm font-medium transition-colors ${inputType === 'file' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Upload File</button>
        </div>
        <div className="pt-4">
          {inputType === 'text' ? (
            <textarea placeholder="Paste the full text of your current resume here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-y"/>
          ) : (
             <div className="mt-2">
              {selectedFileName ? (
                <div className="flex items-center justify-between p-3 bg-gray-100 border border-gray-200 rounded-lg">
                  <p className="text-gray-700 font-medium truncate">{selectedFileName}</p>
                  <button onClick={clearFile} className="text-red-500 hover:text-red-700 font-semibold ml-4">Remove</button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop} className="flex justify-center items-center w-full px-6 py-10 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <div className="text-center">
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2 text-sm text-gray-600">
                            <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOCX, or TXT</p>
                        <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx,.txt"/>
                    </div>
                </div>
              )}
               {isParsingFile && <p className="text-center text-sm text-indigo-600 mt-2">Parsing file...</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">3. Target Role / Description *</h2>
        <p className="text-sm text-gray-600 mb-4">Provide a role title for general optimization, or a full job description for specific tailoring.</p>
        
        <div className="mb-4">
            <label htmlFor="desired-role" className="block text-sm font-medium text-gray-700 mb-1">Desired Role Title</label>
            <input 
                type="text" 
                id="desired-role"
                placeholder="e.g., Senior Frontend Engineer" 
                value={desiredRole} 
                onChange={(e) => setDesiredRole(e.target.value)} 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
        </div>

        <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 font-semibold text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div>
            <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-1">Target Job Description</label>
            <textarea 
                id="job-description"
                placeholder="Paste the full job description for the role you're targeting..." 
                value={jobDescription} 
                onChange={(e) => setJobDescription(e.target.value)} 
                className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-y"
            />
        </div>
      </div>
      
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <button onClick={() => setApiOptionsOpen(!isApiOptionsOpen)} className="font-semibold text-gray-700 w-full text-left">
              Advanced API Options {isApiOptionsOpen ? '▲' : '▼'}
          </button>
          {isApiOptionsOpen && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="api-provider" className="block text-sm font-medium text-gray-600 mb-1">AI Provider</label>
                      <select id="api-provider" value={apiProvider} onChange={(e) => setApiProvider(e.target.value as 'gemini' | 'openai')} className="w-full p-2 border border-gray-300 rounded-lg">
                          <option value="gemini">Google Gemini</option>
                          <option value="openai" disabled>OpenAI (coming soon)</option>
                      </select>
                  </div>
                   <div>
                      <label htmlFor="api-key" className="block text-sm font-medium text-gray-600 mb-1">Your API Key (Optional)</label>
                      <input 
                        type="password" 
                        id="api-key"
                        placeholder="Overrides environment variable"
                        value={apiKey} 
                        onChange={(e) => setApiKey(e.target.value)} 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                  </div>
              </div>
          )}
      </div>

       <div className="mt-6">
        <button
          onClick={onGenerate}
          disabled={!isFormValid() || isLoading}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="w-6 h-6" />
              Generate My Optimized Resume
            </>
          )}
        </button>
      </div>

    </div>
  );
};

export default InputSection;