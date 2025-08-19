import React, { useState, useEffect, useRef } from 'react';
import type { GeminiResponse, ResumeData, Experience, Education, Project, Certification, Course } from '../types';
import { CheckIcon, WarningIcon, DownloadIcon, ResetIcon, SparklesIcon, ArrowUpIcon, ArrowDownIcon, TrashIcon, ChevronDownIcon } from './icons';
import { applySuggestion } from '../services/geminiService';
import jsPDF from 'jspdf';

interface OutputSectionProps {
  data: GeminiResponse | null;
  isLoading: boolean;
  error: string | null;
  profilePicture: string | null;
  apiKey: string;
}

type SectionKey = keyof Omit<ResumeData, 'contactInfo'>;
type PageKey = 'page1' | 'page2' | 'page3';
type SectionOrderState = {
    [key in PageKey]: SectionKey[];
};

const EditableField: React.FC<{ value: string; onChange: (newValue: string) => void; isTextArea?: boolean }> = ({ value, onChange, isTextArea = false }) => {
    const commonClasses = "w-full bg-gray-50 p-2 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition";
    if (isTextArea) {
        return <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${commonClasses} min-h-[100px] resize-y`} />;
    }
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses} />;
};

const OutputSection: React.FC<OutputSectionProps> = ({ data, isLoading, error, profilePicture, apiKey }) => {
    const [editableResume, setEditableResume] = useState<ResumeData | null>(null);
    const [sectionOrder, setSectionOrder] = useState<SectionOrderState>({ page1: [], page2: [], page3: [] });
    const [appliedImprovements, setAppliedImprovements] = useState<Record<number, boolean>>({});
    const [applyingImprovementIndex, setApplyingImprovementIndex] = useState<number | null>(null);
    const [applyError, setApplyError] = useState<string | null>(null);
    const [openMoveMenu, setOpenMoveMenu] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    
    const populateInitialOrder = (resume: ResumeData) => {
        const initialOrder: SectionKey[] = [
            'summary', 'skills', 'experience', 'projects', 'education', 
            'certifications', 'extraCourses', 'languages'
        ];
        const filteredOrder = initialOrder.filter(key => {
            const sectionData = resume[key];
            if (Array.isArray(sectionData)) return sectionData.length > 0;
            return !!sectionData;
        });
        setSectionOrder({ page1: filteredOrder, page2: [], page3: [] });
    };

    useEffect(() => {
        if (data?.optimizedResume) {
            setEditableResume(data.optimizedResume);
            populateInitialOrder(data.optimizedResume);
            setAppliedImprovements({});
            setApplyError(null);
        }
    }, [data]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMoveMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleApplySuggestion = async (suggestion: string, index: number) => {
        if (!editableResume) return;

        if (!apiKey && !process.env.API_KEY) {
            setApplyError('Cannot apply suggestion. API Key is missing from advanced options.');
            return;
        }

        setApplyingImprovementIndex(index);
        setApplyError(null);
        try {
            const updatedResume = await applySuggestion(editableResume, suggestion, apiKey);
            setEditableResume(updatedResume);
            setAppliedImprovements(prev => ({ ...prev, [index]: true }));
        } catch (err: any) {
            setApplyError(err.message || 'Failed to apply suggestion.');
        } finally {
            setApplyingImprovementIndex(null);
        }
    };
    
    if (isLoading) return null;
    if (error) {
        return (
            <div className="w-full max-w-4xl mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg text-red-700">
                <h3 className="font-bold text-lg mb-2">An Error Occurred</h3>
                <p>{error}</p>
            </div>
        );
    }
    if (!data || !editableResume) return null;

    const handleResumeChange = <K extends keyof ResumeData>(section: K, value: ResumeData[K]) => {
        setEditableResume(prev => prev ? { ...prev, [section]: value } : null);
    };

    const handleListItemChange = <T,>(section: keyof ResumeData, index: number, field: keyof T, value: string) => {
        const list = editableResume[section] as T[];
        const updatedList = list.map((item, i) => i === index ? { ...item, [field]: value } : item);
        handleResumeChange(section, updatedList as any);
    };

     const handleBulletPointChange = <T,>(section: keyof ResumeData, itemIndex: number, bulletIndex: number, value: string) => {
        const list = editableResume[section] as T[];
        const item = list[itemIndex] as { description: string[] };
        const updatedDescription = item.description.map((bullet, i) => i === bulletIndex ? value : bullet);
        const updatedItem = { ...item, description: updatedDescription };
        const updatedList = list.map((it, i) => i === itemIndex ? updatedItem : it);
        handleResumeChange(section, updatedList as any);
    };
    
    const handleRevert = () => {
        if (data?.optimizedResume) {
            setEditableResume(data.optimizedResume);
            populateInitialOrder(data.optimizedResume);
            setAppliedImprovements({});
            setApplyError(null);
        }
    };

    const handleMoveSectionUpDown = (pageKey: PageKey, index: number, direction: 'up' | 'down') => {
        const newOrder = JSON.parse(JSON.stringify(sectionOrder));
        const pageList = newOrder[pageKey];
        if (direction === 'up' && index > 0) {
            [pageList[index], pageList[index - 1]] = [pageList[index - 1], pageList[index]];
        } else if (direction === 'down' && index < pageList.length - 1) {
            [pageList[index], pageList[index + 1]] = [pageList[index + 1], pageList[index]];
        }
        setSectionOrder(newOrder);
    };

    const handleMoveToPage = (fromPage: PageKey, fromIndex: number, toPage: PageKey) => {
        if (fromPage === toPage) return;
        const newOrder = JSON.parse(JSON.stringify(sectionOrder));
        const [movedItem] = newOrder[fromPage].splice(fromIndex, 1);
        newOrder[toPage].push(movedItem);
        setSectionOrder(newOrder);
        setOpenMoveMenu(null);
    };

    const handleDeleteSection = (pageKey: PageKey, index: number) => {
        const newOrder = JSON.parse(JSON.stringify(sectionOrder));
        newOrder[pageKey].splice(index, 1);
        setSectionOrder(newOrder);
    };

    const handleDownloadPdf = () => {
        if (!editableResume) return;
        const doc = new jsPDF('p', 'pt', 'a4');
        const margin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let y = margin;

        const checkPageBreak = (requiredHeight: number) => {
            if (y + requiredHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        const { contactInfo, summary, skills, experience, education, projects, languages, certifications, extraCourses } = editableResume;

        // --- HEADER ---
        const hasPicture = !!profilePicture;
        const headerHeight = hasPicture ? 80 : 60;
        checkPageBreak(headerHeight);
        if (hasPicture) {
            const picSize = 70;
            doc.addImage(profilePicture!, 'PNG', margin, y, picSize, picSize);
            const textX = margin + picSize + 20;
            doc.setFontSize(24).setFont('helvetica', 'bold');
            doc.text(contactInfo?.name || '', textX, y + 25);
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const contactLine = [contactInfo?.email, contactInfo?.phone, contactInfo?.linkedin].filter(Boolean).join('  |  ');
            doc.text(contactLine, textX, y + 45);
            y += picSize + 20;
        } else {
            doc.setFontSize(22).setFont('helvetica', 'bold').text(contactInfo?.name || '', pageWidth / 2, y, { align: 'center' });
            y += 25;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const contactLine = [contactInfo?.email, contactInfo?.phone, contactInfo?.linkedin].filter(Boolean).join('  |  ');
            doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
            y += 30;
        }

        const drawSection = (title: string, bodyFn: () => void) => {
             const titleHeight = 35;
             checkPageBreak(titleHeight);
             doc.setFontSize(14).setFont('helvetica', 'bold');
             doc.text(title || '', margin, y);
             y += 10;
             doc.setLineWidth(1.5).line(margin, y, pageWidth - margin, y);
             y += 15;
             bodyFn();
             y += 15;
        };

        const drawWorkItems = (items: (Experience | Project)[]) => {
            (items || []).forEach(item => {
                if (!item) return;

                const isExp = 'role' in item;
                const heading = isExp ? item.role : item.name;
                const subheading = isExp ? item.company : '';
                const dates = isExp ? item.dates : '';
                const description = item.description || [];
                
                const bulletPointsHeight = description.reduce((total, bullet) => {
                    const bulletLines = doc.splitTextToSize(`• ${bullet || ''}`, pageWidth - (margin * 2) - 10);
                    return total + (bulletLines.length * 12) + 4;
                }, 0);

                const itemHeight = 14 + (subheading ? 14 : 0) + bulletPointsHeight + 10;
                checkPageBreak(itemHeight);

                doc.setFontSize(11).setFont('helvetica', 'bold');
                doc.text(heading || '', margin, y);
                if (dates) {
                     doc.setFont('helvetica', 'normal').text(dates || '', pageWidth - margin, y, { align: 'right' });
                }
                y += 14;

                if (subheading) {
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(subheading || '', margin, y);
                    y += 14;
                }

                doc.setFont('helvetica', 'normal');
                description.forEach(bullet => {
                    const bulletLines = doc.splitTextToSize(`• ${bullet || ''}`, pageWidth - (margin * 2) - 10);
                    const requiredHeight = bulletLines.length * 12 + 4;
                    checkPageBreak(requiredHeight);
                    doc.text(bulletLines, margin + 10, y);
                    y += requiredHeight - 2;
                });
                y += 10;
            });
        };
        
        const drawFunctions: { [key in SectionKey]?: () => void } = {
            summary: () => drawSection('Professional Summary', () => {
                const summaryText = summary || '';
                const textOptions = { maxWidth: pageWidth - margin * 2, align: 'justify' as const };
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const { h: requiredHeight } = doc.getTextDimensions(summaryText, textOptions);

                checkPageBreak(requiredHeight);

                doc.text(summaryText, margin, y, textOptions);
                y += requiredHeight;
            }),
            skills: () => drawSection('Skills', () => {
                const skillsText = (skills || []).join('  •  ');
                const textOptions = { maxWidth: pageWidth - margin * 2, align: 'justify' as const };
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const { h: requiredHeight } = doc.getTextDimensions(skillsText, textOptions);

                checkPageBreak(requiredHeight);
                
                doc.text(skillsText, margin, y, textOptions);
                y += requiredHeight;
            }),
            experience: () => drawSection('Experience', () => drawWorkItems(experience)),
            projects: () => drawSection('Projects', () => drawWorkItems(projects)),
            education: () => drawSection('Education', () => {
                (education || []).forEach(edu => {
                    if (!edu) return;
                    const requiredHeight = 14 + 14 + 10;
                    checkPageBreak(requiredHeight);
                    doc.setFontSize(11).setFont('helvetica', 'bold');
                    doc.text(edu.institution || '', margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(edu.dates || '', pageWidth - margin, y, { align: 'right' });
                    y += 14;
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(edu.degree || '', margin, y);
                    y += 20;
                });
            }),
            languages: () => drawSection('Languages', () => {
                const languagesText = (languages || []).join('  •  ');
                const textOptions = { maxWidth: pageWidth - margin * 2, align: 'justify' as const };
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const { h: requiredHeight } = doc.getTextDimensions(languagesText, textOptions);

                checkPageBreak(requiredHeight);
                
                doc.text(languagesText, margin, y, textOptions);
                y += requiredHeight;
            }),
            certifications: () => drawSection('Certifications', () => {
                (certifications || []).forEach(cert => {
                    if (!cert) return;
                    const requiredHeight = 14 + 14 + 10;
                    checkPageBreak(requiredHeight);
                    doc.setFontSize(11).setFont('helvetica', 'bold');
                    doc.text(cert.name || '', margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(cert.date || '', pageWidth - margin, y, { align: 'right' });
                    y += 14;
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(cert.authority || '', margin, y);
                    y += 20;
                });
            }),
            extraCourses: () => drawSection('Extra Courses', () => {
                (extraCourses || []).forEach(course => {
                    if (!course) return;
                    const requiredHeight = 14 + 14 + 10;
                    checkPageBreak(requiredHeight);
                    doc.setFontSize(11).setFont('helvetica', 'bold');
                    doc.text(course.name || '', margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(course.dates || '', pageWidth - margin, y, { align: 'right' });
                    y += 14;
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(course.institution || '', margin, y);
                    y += 20;
                });
            }),
        };

        const renderPageContent = (pageSections: SectionKey[]) => {
            pageSections.forEach(sectionKey => {
                const sectionData = editableResume[sectionKey as keyof ResumeData];
                const hasContent = Array.isArray(sectionData) ? sectionData.length > 0 : !!sectionData;
                if (hasContent) {
                   drawFunctions[sectionKey]?.();
                }
            });
        }
        
        let pagesRendered = 0;
        const pageKeys: PageKey[] = ['page1', 'page2', 'page3'];

        for (const pageKey of pageKeys) {
            const sectionsOnPage = sectionOrder[pageKey];
            if (sectionsOnPage.length > 0) {
                if (pagesRendered > 0) {
                    doc.addPage();
                    y = margin;
                }
                renderPageContent(sectionsOnPage);
                pagesRendered++;
            }
        }
        
        doc.save(`${(contactInfo?.name || 'resume').replace(' ', '_')}_Resume.pdf`);
    };

    const renderSection = (sectionKey: SectionKey) => {
        if (!editableResume) return null;

        switch(sectionKey) {
            case 'summary':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Professional Summary</h3>
                        <EditableField value={editableResume.summary} onChange={val => handleResumeChange('summary', val)} isTextArea />
                    </div>
                );
            case 'skills':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Skills</h3>
                        <EditableField value={editableResume.skills.join(', ')} onChange={val => handleResumeChange('skills', val.split(',').map(s => s.trim()))} />
                         <p className="text-xs text-gray-500 mt-1">Separate skills with a comma.</p>
                    </div>
                );
            case 'experience':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Experience</h3>
                        {editableResume.experience.map((exp, i) => (
                            <div key={i} className="mb-4 p-4 border rounded-lg bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                    <EditableField value={exp.role} onChange={val => handleListItemChange<Experience>('experience', i, 'role', val)} />
                                    <EditableField value={exp.company} onChange={val => handleListItemChange<Experience>('experience', i, 'company', val)} />
                                    <EditableField value={exp.dates} onChange={val => handleListItemChange<Experience>('experience', i, 'dates', val)} />
                                </div>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    {exp.description.map((desc, j) => (
                                        <li key={j}><EditableField value={desc} onChange={val => handleBulletPointChange<Experience>('experience', i, j, val)} /></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                );
            case 'projects':
                return (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Projects</h3>
                        {editableResume.projects.map((proj, i) => (
                            <div key={i} className="mb-4 p-4 border rounded-lg bg-gray-50">
                                <EditableField value={proj.name} onChange={val => handleListItemChange<Project>('projects', i, 'name', val)} />
                                 <ul className="list-disc pl-5 space-y-1 mt-2">
                                    {proj.description.map((desc, j) => (
                                        <li key={j}><EditableField value={desc} onChange={val => handleBulletPointChange<Project>('projects', i, j, val)} /></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                );
            case 'education':
                 return (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Education</h3>
                        {editableResume.education.map((edu, i) => (
                             <div key={i} className="mb-4 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <EditableField value={edu.institution} onChange={val => handleListItemChange<Education>('education', i, 'institution', val)} />
                                <EditableField value={edu.degree} onChange={val => handleListItemChange<Education>('education', i, 'degree', val)} />
                                <EditableField value={edu.dates} onChange={val => handleListItemChange<Education>('education', i, 'dates', val)} />
                            </div>
                        ))}
                    </div>
                );
            case 'languages':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Languages</h3>
                        <EditableField 
                            value={(editableResume.languages || []).join(', ')} 
                            onChange={val => handleResumeChange('languages', val.split(',').map(s => s.trim()))} 
                        />
                         <p className="text-xs text-gray-500 mt-1">Separate languages with a comma.</p>
                    </div>
                );
             case 'certifications':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Certifications</h3>
                        {(editableResume.certifications || []).map((cert, i) => (
                            <div key={i} className="mb-4 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <EditableField value={cert.name} onChange={val => handleListItemChange<Certification>('certifications', i, 'name', val)} />
                                <EditableField value={cert.authority} onChange={val => handleListItemChange<Certification>('certifications', i, 'authority', val)} />
                                <EditableField value={cert.date} onChange={val => handleListItemChange<Certification>('certifications', i, 'date', val)} />
                            </div>
                        ))}
                    </div>
                );
            case 'extraCourses':
                return (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Extra Courses</h3>
                        {(editableResume.extraCourses || []).map((course, i) => (
                            <div key={i} className="mb-4 p-4 border rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <EditableField value={course.name} onChange={val => handleListItemChange<Course>('extraCourses', i, 'name', val)} />
                                <EditableField value={course.institution} onChange={val => handleListItemChange<Course>('extraCourses', i, 'institution', val)} />
                                <EditableField value={course.dates} onChange={val => handleListItemChange<Course>('extraCourses', i, 'dates', val)} />
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    const getImprovementButtonClasses = (index: number) => {
        const baseClasses = "flex items-center justify-center gap-2 text-sm font-semibold py-1.5 px-3 rounded-md transition-colors duration-200 disabled:cursor-not-allowed w-full sm:w-auto flex-shrink-0";
        if (applyingImprovementIndex === index) {
            return `${baseClasses} bg-indigo-100 text-indigo-700`;
        }
        if (appliedImprovements[index]) {
            return `${baseClasses} bg-green-100 text-green-800`;
        }
        return `${baseClasses} bg-yellow-200 text-yellow-900 hover:bg-yellow-300 disabled:bg-gray-200 disabled:text-gray-500`;
    };
    
    return (
        <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
             {/* Feedback Section */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Feedback</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><CheckIcon className="w-5 h-5"/> Strengths</h3>
                        <ul className="list-disc pl-5 space-y-1 text-green-700 text-sm">
                            {data.feedback.strengths.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2"><WarningIcon className="w-5 h-5"/> Areas for Improvement</h3>
                         <ul className="space-y-3 text-yellow-800">
                            {data.feedback.improvements.map((item, i) => (
                                <li key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <span className="flex-grow text-sm">{item}</span>
                                    <button
                                        onClick={() => handleApplySuggestion(item, i)}
                                        disabled={applyingImprovementIndex !== null || !!appliedImprovements[i]}
                                        className={getImprovementButtonClasses(i)}
                                        style={{ minWidth: '120px' }}
                                    >
                                        {applyingImprovementIndex === i ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Applying...</span>
                                            </>
                                        ) : appliedImprovements[i] ? (
                                            <>
                                                <CheckIcon className="w-4 h-4"/>
                                                <span>Applied</span>
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="w-4 h-4"/>
                                                <span>Apply Fix</span>
                                            </>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {applyError && <p className="text-red-600 text-sm mt-3 font-medium">{applyError}</p>}
                    </div>
                </div>
            </div>

            {/* Editable Resume Section */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 relative">
                 <div className="absolute top-8 right-8 flex items-center gap-3">
                     <button
                        onClick={handleRevert}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all duration-300"
                        title="Revert all fields and section order to the original AI suggestion"
                    >
                        <ResetIcon className="w-5 h-5"/> Revert
                    </button>
                     <button
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300"
                    >
                        <DownloadIcon className="w-5 h-5"/> Download PDF
                    </button>
                 </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Optimized Resume</h2>
                <p className="text-sm text-gray-500 mb-6">Use the controls on each section to organize your resume across up to three pages.</p>
                
                <div className="flex flex-col gap-8">
                    {(['page1', 'page2', 'page3'] as const).map((pageKey, pageIndex) => (
                        <div key={pageKey} className="p-4 border-2 border-dashed rounded-lg bg-gray-50/50 min-h-[200px] flex flex-col">
                             <h3 className="text-center font-bold text-gray-500 mb-4 border-b pb-2">Page {pageIndex + 1}</h3>
                             <div className="flex-grow space-y-4">
                                {sectionOrder[pageKey].map((sectionKey, index) => (
                                     <div key={sectionKey} className="relative group bg-white p-6 rounded-lg border shadow-sm">
                                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full border p-1">
                                            <button onClick={() => handleMoveSectionUpDown(pageKey, index, 'up')} disabled={index === 0} className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowUpIcon className="w-4 h-4 text-gray-600"/>
                                            </button>
                                            <button onClick={() => handleMoveSectionUpDown(pageKey, index, 'down')} disabled={index === sectionOrder[pageKey].length - 1} className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                                <ArrowDownIcon className="w-4 h-4 text-gray-600"/>
                                            </button>
                                            <div className="relative" ref={openMoveMenu === sectionKey ? menuRef : null}>
                                                <button onClick={() => setOpenMoveMenu(openMoveMenu === sectionKey ? null : sectionKey)} className="p-1.5 rounded-full hover:bg-gray-200 flex items-center">
                                                    <span className="text-xs font-semibold mr-1 ml-1 text-gray-600">Move</span>
                                                    <ChevronDownIcon className="w-3 h-3 text-gray-600"/>
                                                </button>
                                                {openMoveMenu === sectionKey && (
                                                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border z-10">
                                                        {(['page1', 'page2', 'page3'] as PageKey[]).map((toPageKey, toPageIndex) => (
                                                            <button 
                                                                key={toPageKey}
                                                                onClick={() => handleMoveToPage(pageKey, index, toPageKey)}
                                                                disabled={pageKey === toPageKey}
                                                                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                                            >
                                                                Page {toPageIndex + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                             <div className="h-4 w-px bg-gray-200 mx-1"></div>
                                            <button onClick={() => handleDeleteSection(pageKey, index)} className="p-1.5 rounded-full hover:bg-red-100 group/trash">
                                                <TrashIcon className="w-4 h-4 text-gray-600 group-hover/trash:text-red-500"/>
                                            </button>
                                        </div>
                                        {renderSection(sectionKey)}
                                    </div>
                                ))}
                                {sectionOrder[pageKey].length === 0 && (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm p-10">
                                        This page is empty. Move sections here from other pages.
                                    </div>
                                )}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OutputSection;
