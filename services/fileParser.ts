import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

declare global {
    interface Window {
        pdfjsWorker: string;
    }
}

pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfjsWorker;

const getTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
};

const getTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return value;
};

const getTextFromTxt = async (file: File): Promise<string> => {
    return file.text();
};

export const parseResumeFile = async (file: File): Promise<string> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
        case 'pdf':
            return getTextFromPdf(file);
        case 'docx':
            return getTextFromDocx(file);
        case 'txt':
            return getTextFromTxt(file);
        default:
            throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
    }
};