import React, { useState } from 'react';
import type { GeminiResponse, ResumeData, Experience, Education, Project } from '../types';
import { CheckIcon, WarningIcon, DownloadIcon, ResetIcon } from './icons';
import jsPDF from 'jspdf';

interface OutputSectionProps {
  data: GeminiResponse | null;
  isLoading: boolean;
  error: string | null;
  profilePicture: string | null;
}

const EditableField: React.FC<{ value: string; onChange: (newValue: string) => void; isTextArea?: boolean }> = ({ value, onChange, isTextArea = false }) => {
    const commonClasses = "w-full bg-gray-50 p-2 border border-gray-200 rounded-md focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition";
    if (isTextArea) {
        return <textarea value={value} onChange={(e) => onChange(e.target.value)} className={`${commonClasses} min-h-[100px] resize-y`} />;
    }
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={commonClasses} />;
};

const OutputSection: React.FC<OutputSectionProps> = ({ data, isLoading, error, profilePicture }) => {
    const [editableResume, setEditableResume] = useState<ResumeData | null>(null);
    
    React.useEffect(() => {
        if (data?.optimizedResume) {
            setEditableResume(data.optimizedResume);
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
        }
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
            doc.text(contactInfo.name, textX, y + 25);
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const contactLine = [contactInfo.email, contactInfo.phone, contactInfo.linkedin].filter(Boolean).join('  |  ');
            doc.text(contactLine, textX, y + 45);
            y += picSize + 20;
        } else {
            doc.setFontSize(22).setFont('helvetica', 'bold').text(contactInfo.name, pageWidth / 2, y, { align: 'center' });
            y += 25;
            doc.setFontSize(10).setFont('helvetica', 'normal');
            const contactLine = [contactInfo.email, contactInfo.phone, contactInfo.linkedin].filter(Boolean).join('  |  ');
            doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
            y += 30;
        }

        // --- SECTION HELPER ---
        const drawSection = (title: string, bodyFn: () => void) => {
             const titleHeight = 35;
             checkPageBreak(titleHeight);
             doc.setFontSize(14).setFont('helvetica', 'bold');
             doc.text(title, margin, y);
             y += 10;
             doc.setLineWidth(1.5).line(margin, y, pageWidth - margin, y);
             y += 15;
             bodyFn();
             y += 15; // Spacing after section
        };
        
        // --- SUMMARY ---
        drawSection('Professional Summary', () => {
            const summaryLines = doc.splitTextToSize(summary, pageWidth - margin * 2);
            const requiredHeight = summaryLines.length * 12;
            checkPageBreak(requiredHeight);
            doc.setFontSize(10).setFont('helvetica', 'normal');
            doc.text(summaryLines, margin, y);
            y += requiredHeight;
        });

        // --- SKILLS ---
        if (skills.length > 0) {
            drawSection('Skills', () => {
                const skillsText = skills.join('  •  ');
                const skillsLines = doc.splitTextToSize(skillsText, pageWidth - margin * 2);
                const requiredHeight = skillsLines.length * 12;
                checkPageBreak(requiredHeight);
                doc.setFontSize(10).setFont('helvetica', 'normal');
                doc.text(skillsLines, margin, y);
                y += requiredHeight;
            });
        }
        
        // --- EXPERIENCE & PROJECTS ---
        const drawWorkItems = (items: (Experience | Project)[]) => {
            items.forEach(item => {
                const isExp = 'role' in item;
                const heading = isExp ? item.role : item.name;
                const subheading = isExp ? item.company : '';
                const dates = isExp ? item.dates : '';
                
                const bulletPointsHeight = item.description.reduce((total, bullet) => {
                    const bulletLines = doc.splitTextToSize(`• ${bullet}`, pageWidth - (margin * 2) - 10);
                    return total + (bulletLines.length * 12) + 4;
                }, 0);

                const itemHeight = 14 + (subheading ? 14 : 0) + bulletPointsHeight + 10;
                checkPageBreak(itemHeight);

                doc.setFontSize(11).setFont('helvetica', 'bold');
                doc.text(heading, margin, y);
                if (dates) {
                     doc.setFont('helvetica', 'normal').text(dates, pageWidth - margin, y, { align: 'right' });
                }
                y += 14;

                if (subheading) {
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(subheading, margin, y);
                    y += 14;
                }

                doc.setFont('helvetica', 'normal');
                item.description.forEach(bullet => {
                    const bulletLines = doc.splitTextToSize(`• ${bullet}`, pageWidth - (margin * 2) - 10);
                    const requiredHeight = bulletLines.length * 12 + 4;
                    checkPageBreak(requiredHeight);
                    doc.text(bulletLines, margin + 10, y);
                    y += requiredHeight - 2;
                });
                y += 10;
            });
        };

        if (experience.length > 0) {
            drawSection('Experience', () => drawWorkItems(experience));
        }

        if (projects.length > 0) {
            drawSection('Projects', () => drawWorkItems(projects));
        }
        
        // --- EDUCATION ---
        if (education.length > 0) {
            drawSection('Education', () => {
                education.forEach(edu => {
                    const requiredHeight = 14 + 14 + 10;
                    checkPageBreak(requiredHeight);
                    doc.setFontSize(11).setFont('helvetica', 'bold');
                    doc.text(edu.institution, margin, y);
                    doc.setFont('helvetica', 'normal');
                    doc.text(edu.dates, pageWidth - margin, y, { align: 'right' });
                    y += 14;
                    doc.setFontSize(10).setFont('helvetica', 'italic');
                    doc.text(edu.degree, margin, y);
                    y += 20;
                });
            });
        }
        
        doc.save(`${contactInfo.name.replace(' ', '_')}_Resume.pdf`);
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
                        title="Revert all fields to the original AI suggestion"
                    >
                        <ResetIcon className="w-5 h-5"/> Revert to AI Suggestion
                    </button>
                     <button
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300"
                    >
                        <DownloadIcon className="w-5 h-5"/> Download PDF
                    </button>
                 </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Optimized Resume</h2>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Professional Summary</h3>
                        <EditableField value={editableResume.summary} onChange={val => handleResumeChange('summary', val)} isTextArea />
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Skills</h3>
                        <EditableField value={editableResume.skills.join(', ')} onChange={val => handleResumeChange('skills', val.split(',').map(s => s.trim()))} />
                         <p className="text-xs text-gray-500 mt-1">Separate skills with a comma.</p>
                    </div>

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
                    
                    {editableResume.projects.length > 0 && <div>
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
                    </div>}

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
                </div>
            </div>
        </div>
    );
};

export default OutputSection;