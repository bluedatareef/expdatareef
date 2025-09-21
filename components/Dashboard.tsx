'use client'

import React, { useMemo, useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Answers, Question, AnswerObject } from '../types';
import { QuestionType } from '../types';
import { sdgMapping } from '../constants/sdgs';
import { StatCard } from './dashboard/StatCard';
import { QualitativeCard } from './dashboard/QualitativeCard';
import { Modal } from './Modal';
import { useTheme } from '../context/ThemeContext';
import { AiMarkdown } from './AiMarkdown';

interface DashboardProps {
  answers: Answers;
  destination: string;
  questions: Question[];
  geminiApiKey: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ answers, destination, questions, geminiApiKey }) => {
  const [modalContent, setModalContent] = useState<{ title: string; content: string; } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const theme = useTheme();

  const questionsBySection = useMemo(() => {
    const dashboardQuestions = questions.filter(q => q.type !== QuestionType.FILE);

    return dashboardQuestions.reduce((acc, question) => {
      (acc[question.section] = acc[question.section] || []).push(question);
      return acc;
    }, {} as Record<string, Question[]>);
  }, [questions]);

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setAiSummary('');

    if (!geminiApiKey) {
        alert("Please configure your Gemini API key in settings before using AI features.");
        setIsGeneratingSummary(false);
        return;
    }

    const answeredQuestions = questions.filter(q => {
        const answer = answers[q.id];
        return answer && answer.value !== null && answer.value !== undefined && answer.value !== '';
    });

    if (answeredQuestions.length === 0) {
        alert("Please answer some questions before generating a summary.");
        setIsGeneratingSummary(false);
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        
        const context = answeredQuestions.map(q => {
            const answerObj = answers[q.id];
            let answerText = answerObj?.value;

            if (answerText instanceof File) {
                answerText = answerText.name;
            } else if (typeof answerText === 'boolean') {
                answerText = answerText ? 'Yes' : 'No';
            }
            return `Q: ${q.text.replace('{Destination}', destination)}\nA: ${answerText}`;
        }).join('\n\n');

        const prompt = `You are a sustainability analyst providing a report for a tourist destination. Based on the following questionnaire data for "${destination}", generate a concise sustainability summary. The summary should be easy to read and well-structured, highlighting both key strengths and potential areas for improvement. Use markdown for formatting, including headings (e.g., "## Strengths") and bullet points.

        Data:
        ${context}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        setAiSummary(response.text);
        setIsSummaryModalOpen(true);

    } catch (error) {
        console.error("Error generating AI summary:", error);
        alert("Failed to generate AI summary. Please check the console for details.");
    } finally {
        setIsGeneratingSummary(false);
    }
  };


  const handleOpenModal = (question: Question, answer: string) => {
    const title = question.text.replace(/{Destination}/g, destination);
    setModalContent({ title, content: answer });
  };
  
  const renderWidget = (question: Question) => {
      const answerObj = answers[question.id];
      const answerValue = answerObj?.value;
      const sdgInfo = sdgMapping[question.id];
      
      if (!answerObj || answerValue === null || answerValue === undefined) return null;

      switch(question.type) {
          case QuestionType.NUMBER:
          case QuestionType.BOOLEAN:
              return <StatCard key={question.id} question={question} value={answerValue} sdgInfo={sdgInfo} destination={destination} />;
          
          case QuestionType.TEXTAREA:
          case QuestionType.TEXT:
          case QuestionType.URL:
          case QuestionType.EMAIL:
          case QuestionType.TEL:
             if (typeof answerValue !== 'string' || answerValue.trim() === '') return null;
             return <QualitativeCard key={question.id} question={question} value={answerValue} sdgInfo={sdgInfo} onReadMore={() => handleOpenModal(question, answerValue)} destination={destination} />

          default:
              return null;
      }
  };

  return (
    <div className="space-y-12">
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 flex items-center justify-between">
        <div>
            <h2 className="text-lg font-semibold text-white">Sustainability Overview</h2>
            <p className="text-sm text-gray-400">Analyze your data and generate an AI-powered summary.</p>
        </div>
        <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className={`px-4 py-2 text-sm font-medium text-white ${theme.background.primary} ${theme.background.hover} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${theme.ring.primary} ${theme.background.disabled} disabled:cursor-not-allowed flex items-center`}
        >
            {isGeneratingSummary ? (
                 <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                </>
            ) : '✨ Generate AI Summary'}
        </button>
      </div>

      {Object.entries(questionsBySection).map(([section, sectionQuestions]) => {
          const sectionId = `dashboard-section-${section.replace(/\s+/g, '-')}`;
          return (
            <section key={section} id={sectionId} className="scroll-mt-24">
              <div className={`border-b ${theme.border.primary} pb-4 mb-6`}>
                <h2 className={`text-2xl font-bold ${theme.text.primary}`}>{section}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sectionQuestions.map(renderWidget)}
              </div>
            </section>
          )
      })}
      <Modal isOpen={!!modalContent} onClose={() => setModalContent(null)} title={modalContent?.title || ''}>
        <p className="text-gray-300 whitespace-pre-wrap">{modalContent?.content}</p>
      </Modal>

      <Modal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)} 
        title={`AI Sustainability Summary for ${destination}`}
      >
        {aiSummary ? <AiMarkdown text={aiSummary} /> : <p>Generating summary...</p>}
      </Modal>
    </div>
  );
};
