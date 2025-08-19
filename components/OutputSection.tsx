import React, { useState, useEffect, useRef } from 'react';
import type { GeminiResponse, ResumeData, Experience, Education, Project } from '../types';
import { CheckIcon, WarningIcon, DownloadIcon, ResetIcon, GripVerticalIcon } from './icons';
import jsPDF from 'jspdf';

interface OutputSectionProps {
  data: GeminiResponse | null;
  isLoading: boolean;
  error: string | null;
  profilePicture: string | null;
}

type SectionKey = keyof Omit<ResumeData, 'contactInfo'>;
type SectionOrderState = {
    page1: SectionKey[];
    page2: SectionKey[];
};

const EditableField: React.FC<{ value: string; onChange: (newValue: string) => void; isTextArea?: boolean }> = ({ value, onChange, isTextArea = false }) => {
    const commonClasses = "w-full bg-gray-50 p-2 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition";
    if (isTextArea) {
        return <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${commonClasses} min-h-[100px] resize-y`} />;
    }
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses} />;
};

const OutputSection: React.FC<OutputSectionProps> = ({ data, isLoading, error, profilePicture }) => {
    const [editableResume, setEditableResume] = useState<ResumeData | null>(null);
    const [sectionOrder, setSectionOrder] = useState<SectionOrderState>({ page1: [], page2: [] });

    const dragItem = useRef<{ pageKey: 'page1' | 'page2'; index: number } | null>(null);
    const dragOverItem = useRef<{ pageKey: 'page1' | 'page2'; index: number } | null>(null);
    const [draggedOverPosition, setDraggedOverPosition] = useState<{ pageKey: 'page1' | 'page2'; index: number } | null>(null);
    
    const populateInitialOrder = (resume: ResumeData) => {
        const initialOrder: SectionKey[] = ['summary', 'skills', 'experience', 'projects', 'education'];
        const filteredOrder = initialOrder.filter(key => {
            const sectionData = resume[key];
            if (Array.isArray(sectionData)) return sectionData.length > 0;
            return !!sectionData;
        });
        setSectionOrder({ page1: filteredOrder, page2: [] });
    };

    useEffect(() => {
        if (data?.optimizedResume) {
            setEditableResume(data.optimizedResume);
            populateInitialOrder(data.optimizedResume);
        }
    }, [data]);
    
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
        }
    };

    const handleDragStart = (e: React.DragEvent, pageKey: 'page1' | 'page2', index: number) => {
        dragItem.current = { pageKey, index };
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, pageKey: 'page1' | 'page2', index: number) => {
        e.preventDefault();
        dragOverItem.current = { pageKey, index };
        setDraggedOverPosition({ pageKey, index });
    };

    const handleDragLeave = () => {
        setDraggedOverPosition(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };
    
    const handleDropOnPage = (pageKey: 'page1' | 'page2') => {
       if (!dragItem.current) return;
       const { pageKey: fromPage, index: fromIndex } = dragItem.current;
       const toIndex = sectionOrder[pageKey].length;

       if(fromPage === pageKey && fromIndex === toIndex) return;

       dragOverItem.current = { pageKey, index: toIndex };
       handleDrop();
    }
    
    const handleDrop = () => {
        if (!dragItem.current || !dragOverItem.current) {
            setDraggedOverPosition(null);
            return;
        }

        const { pageKey: fromPage, index: fromIndex } = dragItem.current;
        const { pageKey: toPage, index: toIndex } = dragOverItem.current;

        if (fromPage === toPage && fromIndex === toIndex) {
            setDraggedOverPosition(null);
            return;
        }

        const newOrder = JSON.parse(JSON.stringify(sectionOrder));
        const [draggedItem] = newOrder[fromPage].splice(fromIndex, 1);
        newOrder[toPage].splice(toIndex, 0, draggedItem);
        
        setSectionOrder(newOrder);

        dragItem.current = null;
        dragOverItem.current = null;
        setDraggedOverPosition(null);
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

        const { contactInfo, summary, skills, experience, education, projects } = editableResume;

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
        
        renderPageContent(sectionOrder.page1);
        
        if (sectionOrder.page2.length > 0) {
            doc.addPage();
            y = margin;
            renderPageContent(sectionOrder.page2);
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
            default:
                return null;
        }
    };
    
    const renderDropIndicator = (pageKey: 'page1' | 'page2', index: number) => {
        if (draggedOverPosition?.pageKey === pageKey && draggedOverPosition?.index === index) {
            // Prevent indicator from showing on its own item unless it's a new position
            if (dragItem.current && dragItem.current.pageKey === pageKey && (dragItem.current.index === index || dragItem.current.index + 1 === index)) {
                if (dragOverItem.current && dragOverItem.current.pageKey === dragItem.current.pageKey && dragOverItem.current.index === dragItem.current.index) {
                     return null;
                }
            }
            return <div className="h-1 my-1 bg-indigo-500 rounded-full" />;
        }
        return null;
    };
    
    return (
        <div className="w-full max-w-4xl mx-auto mt-8 space-y-8">
             {/* Feedback Section */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Feedback</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2"><CheckIcon className="w-5 h-5"/> Strengths</h3>
                        <ul className="list-disc pl-5 space-y-1 text-green-700">
                            {data.feedback.strengths.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2"><WarningIcon className="w-5 h-5"/> Areas for Improvement</h3>
                         <ul className="list-disc pl-5 space-y-1 text-yellow-700">
                            {data.feedback.improvements.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
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
                <p className="text-sm text-gray-500 mb-6">Drag and drop sections between pages to organize your PDF.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" onDragOver={handleDragOver}>
                    {(['page1', 'page2'] as const).map(pageKey => (
                        <div key={pageKey} className="p-4 border-2 border-dashed rounded-lg bg-gray-50/50 min-h-[400px] flex flex-col"
                          onDrop={() => handleDropOnPage(pageKey)}
                          onDragLeave={handleDragLeave}
                        >
                             <h3 className="text-center font-bold text-gray-500 mb-4 border-b pb-2">Page {pageKey === 'page1' ? 1 : 2}</h3>
                             <div className="flex-grow space-y-2">
                                {sectionOrder[pageKey].map((sectionKey, index) => (
                                     <div key={sectionKey}>
                                        {renderDropIndicator(pageKey, index)}
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, pageKey, index)}
                                            onDragEnter={(e) => handleDragEnter(e, pageKey, index)}
                                            onDrop={handleDrop}
                                            className={`relative group bg-white p-6 rounded-lg transition-all border shadow-sm`}
                                        >
                                            <div className="absolute top-1/2 left-[-0.75rem] -translate-y-1/2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700">
                                                <GripVerticalIcon className="w-6 h-6" />
                                            </div>
                                            {renderSection(sectionKey)}
                                        </div>
                                    </div>
                                ))}
                                {renderDropIndicator(pageKey, sectionOrder[pageKey].length)}
                                {sectionOrder[pageKey].length === 0 && (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                        Drop sections here
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