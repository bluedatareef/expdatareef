import React, { useMemo, useEffect } from 'react';
import { QuestionCard } from './QuestionCard';
import type { Question, Answers, AnswerObject, AiContact, SectionTimestamps } from '../types';
import { Type } from "@google/genai";
import { ai } from '../utils/geminiClient';
import { generateFullAnswerContext } from '../utils/aiHelper';
import { FormAccordion } from './FormAccordion';


interface QuestionnaireProps {
  questions: Question[];
  answers: Answers;
  onAnswerUpdate: (questionId: string, answer: AnswerObject) => void;
  destination: string;
  aiContacts: Record<string, AiContact[]>;
  setAiContacts: React.Dispatch<React.SetStateAction<Record<string, AiContact[]>>>;
  openSection: string | null;
  setOpenSection: (section: string | null) => void;
  activeQuestion: string | null;
  setActiveQuestion: (questionId: string | null) => void;
  sectionTimestamps: SectionTimestamps;
  isAdmin: boolean;
}

const getSectionCompletion = (questions: Question[], answers: Answers) => {
  const answered = questions.filter(q => {
    const answer = answers[q.id];
    return answer && answer.value !== null && answer.value !== undefined && answer.value !== '';
  }).length;
  return {
    completed: answered,
    total: questions.length
  };
};


export const Questionnaire: React.FC<QuestionnaireProps> = ({ 
    questions, 
    answers, 
    onAnswerUpdate, 
    destination,
    aiContacts,
    setAiContacts,
    openSection,
    setOpenSection,
    activeQuestion,
    setActiveQuestion,
    sectionTimestamps,
    isAdmin
}) => {
  const [loadingAiContactsSection, setLoadingAiContactsSection] = React.useState<string | null>(null);

  useEffect(() => {
    if (activeQuestion) {
        const element = document.getElementById(`question-${activeQuestion}`);
        if (element) {
            // Use a timeout to ensure the accordion is open before scrolling/focusing
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const input = element.querySelector('input, textarea, button') as HTMLElement | null;
                if (input) {
                    input.focus({ preventScroll: true });
                }
                setActiveQuestion(null); // Reset the active question trigger
            }, 150); // Delay allows for accordion animation
        }
    }
}, [activeQuestion, setActiveQuestion]);

  const handleAnswerChange = (questionId: string, answer: AnswerObject) => {
    onAnswerUpdate(questionId, answer);
  };

  const questionsBySection = useMemo(() => {
    return questions.reduce((acc, question) => {
      (acc[question.section] = acc[question.section] || []).push(question);
      return acc;
    }, {} as Record<string, Question[]>);
  }, [questions]);
  
  const handleAiSuggestContacts = async (section: string) => {
    setLoadingAiContactsSection(section);
    try {
        const fullContext = generateFullAnswerContext(questions, answers, destination);

        const prompt = `Based on the comprehensive sustainability assessment data provided below for the destination "${destination}", suggest 1-3 local or regional organizations, experts, or government bodies that could be valuable contacts for improving sustainability, specifically related to the "${section}" section. When available, prioritize contacts related to the official data sources listed in the context. Provide their name, a brief description of why they are relevant, and a website if available.

        Comprehensive Context for ${destination}:
        ${fullContext}
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        contacts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "Name of the organization, expert, or government body." },
                                    description: { type: Type.STRING, description: "A brief description of why they are a relevant contact for sustainability." },
                                    website: { type: Type.STRING, description: "The contact's website URL, if available." }
                                },
                                propertyOrdering: ["name", "description", "website"]
                            }
                        }
                    }
                },
            }
        });

        const jsonStr = response.text.trim();
        const result: { contacts?: AiContact[] } = JSON.parse(jsonStr);
        
        if (result.contacts && Array.isArray(result.contacts)) {
            setAiContacts(prev => ({...prev, [section]: result.contacts}));
        }

    } catch (error) {
        console.error("Error fetching AI suggestions:", error);
        alert("Failed to get AI suggestions. Please check the console for details.");
    } finally {
        setLoadingAiContactsSection(null);
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(questionsBySection).map(([section, sectionQuestions]) => {
          const completion = getSectionCompletion(sectionQuestions, answers);
          const lastEdited = sectionTimestamps[section];
          return (
            <FormAccordion
                key={section}
                section={section}
                completion={completion}
                isOpen={openSection === section}
                onToggle={() => setOpenSection(openSection === section ? null : section)}
                aiContacts={aiContacts[section]}
                isLoading={loadingAiContactsSection === section}
                onAiSuggestContacts={() => handleAiSuggestContacts(section)}
                lastEdited={lastEdited}
                isAdmin={isAdmin}
            >
                <div className="space-y-6 pt-4">
                    {sectionQuestions.map(question => (
                        <QuestionCard
                            key={question.id}
                            question={question}
                            currentAnswer={answers[question.id] ?? null}
                            onAnswerChange={(answer) => handleAnswerChange(question.id, answer)}
                            destination={destination}
                            isAdmin={isAdmin}
                            questions={questions}
                            answers={answers}
                        />
                    ))}
                </div>
            </FormAccordion>
          )
      })}
    </div>
  );
};