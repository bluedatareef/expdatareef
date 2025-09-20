'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Components
import { DestinationSelector } from './DestinationSelector';
import { Questionnaire } from './Questionnaire';
import { Dashboard } from './Dashboard';
import { Sidebar } from './Sidebar';
import { SaveButton } from './SaveButton';
import { InfoSidebar } from './InfoSidebar';
import { InfoModal } from './InfoModal';
import { CheckSheetButton } from './CheckSheetButton';
import { AuthPanel } from './AuthPanel';
import { SettingsPanel } from './SettingsPanel';
import { ProgressBar } from './ProgressBar';
import { MapView } from './MapView';
import { PoiDetailPanel } from './PoiDetailPanel';
import { DataSyncPanel } from './DataSyncPanel';
import { UserProfilePanel } from './UserProfilePanel';
import { StakeholderDashboard } from './stakeholder/StakeholderDashboard';
import { ExplanationPage } from './ExplanationPage';

// Hooks, constants, utils, types
import { useLocalStorage } from '../hooks/useLocalStorage';
import { destinations } from '../constants/destinations';
import { questions } from '../constants/questions';
import { gstcCriteria } from '../constants/gstcCriteria';
import { sdgDetails } from '../constants/sdgDetails';
import { bcStrategies } from '../constants/bcStrategies';
import { saveDataToDb, loadDataFromDb, saveUserProfile, loadUserProfile } from '../utils/database';
import { getCurrentUserEmail, setCurrentUserEmail } from '../utils/session';
import { checkSheetForAnswers } from '../utils/sheetLoader';
import { loadAllCsvData } from '../utils/csvLoader';
import { loadMapData } from '../utils/mapLoader';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import type { Answers, AiContact, InfoModalData, Metric, BcStrategy, ApiKeys, SdgDetailInfo, Poi, GstcCriterionDetail, AnswerObject, SectionTimestamps, UserProfile } from '../types';

const MainLayout: React.FC<Omit<AppProps, 'selectedDestination'> & { 
  destination: string,
  startInStakeholderView: boolean,
  onInitialViewRendered: () => void,
}> = ({
  destination,
  answers,
  aiContacts,
  sectionTimestamps,
  setAnswers,
  setAiContacts,
  setSectionTimestamps,
  handleChangeDestination,
  apiKeys,
  setApiKeys,
  userProfile,
  handleLogin,
  handleLogout,
  handleUpdateProfile,
  handleSaveSettings,
  isAdmin,
  startInStakeholderView,
  onInitialViewRendered,
}) => {
  const [view, setView] = useState<'form' | 'dashboard' | 'map' | 'stakeholder'>(startInStakeholderView ? 'stakeholder' : 'form');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isCheckingSheet, setIsCheckingSheet] = useState(false);
  const [isInfoSidebarOpen, setIsInfoSidebarOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState<InfoModalData | null>(null);
  const [infoHubData, setInfoHubData] = useState<{
    metrics: Metric[];
    sdgs: SdgDetailInfo[];
    gstc: GstcCriterionDetail[];
    bc: BcStrategy[];
  } | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [mapData, setMapData] = useState<Record<string, Poi[]>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  // Auth and Settings State
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isDataSyncPanelOpen, setIsDataSyncPanelOpen] = useState(false);
  const [selectedApiModel, setSelectedApiModel] = useState('gemini');
  
  const theme = useTheme();
  const debounceTimeoutRef = useRef<number | null>(null);

  const isLoggedIn = !!userProfile;

  useEffect(() => {
    if (startInStakeholderView) {
        onInitialViewRendered();
    }
  }, [startInStakeholderView, onInitialViewRendered]);

  useEffect(() => {
    // When the user's login status changes, manage the auth panels.
    if (isLoggedIn && isAuthPanelOpen) {
      // If user has logged in, close the auth panel.
      setIsAuthPanelOpen(false);
    }
    if (!isLoggedIn && isProfilePanelOpen) {
      // If user has logged out, close the profile panel.
      setIsProfilePanelOpen(false);
    }
  }, [isLoggedIn, isAuthPanelOpen, isProfilePanelOpen]);

  const saveProgress = async () => {
    if (saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
        await saveDataToDb(destination, answers, sectionTimestamps);
        setSaveStatus('saved');
    } catch (error) {
        console.error('Failed to save progress:', error);
        setSaveStatus('error');
    }
  };

  // Debounced autosave effect
  useEffect(() => {
    if (Object.keys(answers).length === 0) return; // Don't save empty initial state

    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = window.setTimeout(() => {
        saveProgress();
    }, 2000); // 2-second debounce

    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [answers, destination, sectionTimestamps]);

  // Effect to reset status indicator
  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
        const timer = setTimeout(() => setSaveStatus('idle'), 3000);
        return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  
  useEffect(() => {
    // When a new destination is selected, reset all transient UI states.
    setIsDataSyncPanelOpen(false); // FIX: Ensure Data Sync panel is closed on destination change.
    setOpenSection(null);

    const autoFillFromSheet = async () => {
      // Only autofill if no answers exist for this destination yet
      const savedData = await loadDataFromDb(destination);
      if (!savedData?.answers || Object.keys(savedData.answers).length === 0) {
        setIsCheckingSheet(true);
        try {
          const sheetAnswers = await checkSheetForAnswers(destination);
          const newAnswersCount = Object.keys(sheetAnswers).length;

          if (newAnswersCount > 0) {
            handleBulkMergeAnswers(sheetAnswers);
          }
        } catch (error) {
          console.error("Failed to auto-fill from sheet:", error);
        } finally {
          setIsCheckingSheet(false);
        }
      }
    };

    autoFillFromSheet();
  }, [destination]);

  useEffect(() => {
    loadAllCsvData()
      .then(csvData => {
        setInfoHubData({ ...csvData, gstc: gstcCriteria, sdgs: sdgDetails, bc: bcStrategies });
      })
      .catch(error => console.error("Failed to load Info Hub data:", error));
    
    loadMapData()
      .then(setMapData)
      .catch(error => console.error("Failed to load map POI data:", error));
  }, []);

  useEffect(() => {
    if (view !== 'map' && selectedPoi) {
      setSelectedPoi(null);
    }
  }, [view, selectedPoi]);

  const { totalQuestions, completedQuestions } = useMemo(() => {
    const total = questions.length;
    const completed = questions.filter(q => {
      const answer = answers[q.id];
      return answer && answer.value !== null && answer.value !== undefined && answer.value !== '';
    }).length;

    return { totalQuestions: total, completedQuestions: completed };
  }, [answers]);

  const handleSave = () => {
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }
    saveProgress();
  };

  const handleLoad = async () => {
    if (!destination) return;
    const savedData = await loadDataFromDb(destination);
    if (savedData) {
      setAnswers(savedData.answers || {});
      setSectionTimestamps(savedData.timestamps || {});
      alert('Progress loaded successfully!');
    } else {
      alert('No saved progress found for this destination.');
    }
  };
  
  const handleAnswerUpdate = (questionId: string, answer: AnswerObject) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setSectionTimestamps(prev => ({
        ...prev,
        [question.section]: new Date().toISOString(),
      }));
    }
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };
  
  const handleBulkMergeAnswers = (newAnswers: Answers) => {
    const updatedSections = new Set<string>();
    Object.keys(newAnswers).forEach(questionId => {
        const question = questions.find(q => q.id === questionId);
        if (question) {
            updatedSections.add(question.section);
        }
    });

    const now = new Date().toISOString();
    const newTimestamps = Array.from(updatedSections).reduce((acc, section) => {
        acc[section] = now;
        return acc;
    }, {} as Record<string, string>);
    
    setSectionTimestamps(prev => ({...prev, ...newTimestamps}));
    setAnswers(prev => ({...prev, ...newAnswers}));
  };

  const handleCheckSheet = async () => {
    if (!destination) {
      alert("Please select a destination first.");
      return;
    }
    setIsCheckingSheet(true);
    try {
      const sheetAnswers = await checkSheetForAnswers(destination);
      const newAnswersCount = Object.keys(sheetAnswers).filter(key => !answers[key]?.value).length;

      if (Object.keys(sheetAnswers).length > 0) {
        handleBulkMergeAnswers({ ...sheetAnswers, ...answers });
        alert(`${newAnswersCount} new answer(s) auto-filled from the sheet. Your existing data was not overwritten.`);
      } else {
        alert("No answers found for the current destination in the sheet.");
      }
    } catch(error) {
      console.error("Error checking sheet for answers:", error);
      alert("Failed to check sheet for answers. See console for details.");
    } finally {
      setIsCheckingSheet(false);
    }
  };
  
  const handleSidebarQuestionSelect = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      if (view !== 'form') setView('form');
      setOpenSection(question.section);
      setActiveQuestion(questionId);
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen">
      <Sidebar 
        view={view}
        setView={setView}
        questions={questions}
        answers={answers}
        destination={destination}
        isLoggedIn={isLoggedIn}
        isAdmin={isAdmin}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onUserClick={() => isLoggedIn ? setIsProfilePanelOpen(true) : setIsAuthPanelOpen(true)}
        onSettingsClick={() => setIsSettingsPanelOpen(true)}
        onDataSyncClick={() => setIsDataSyncPanelOpen(true)}
        onPoiSelect={setSelectedPoi}
        mapPois={mapData[destination] || []}
        onQuestionSelect={handleSidebarQuestionSelect}
        userProfile={userProfile}
        infoHubData={infoHubData}
        setInfoModalData={setInfoModalData}
      />
      <div className={`min-w-0 transition-all duration-300 ease-in-out min-h-screen ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-96'}`}>
       {view !== 'stakeholder' && (
        <header className="bg-gray-800/80 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between p-4 border-b border-gray-700/50 flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              <img src="https://labs.landsurveyorsunited.com/datareef/icons/web/android-chrome-192x192.png" alt="DataReef Logo" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-white truncate">{destination}</h1>
              <button onClick={handleChangeDestination} className={`px-3 py-1 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-md flex-shrink-0`}>
                  Change Destination
              </button>
            </div>
            <div className="mt-2 max-w-md">
              <ProgressBar completed={completedQuestions} total={totalQuestions} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
             {isCheckingSheet && saveStatus !== 'saving' && (
                <div className="flex items-center text-xs text-gray-400" role="status" aria-live="polite">
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                </div>
            )}
            <div className="flex items-center bg-gray-700 rounded-lg p-1">
              <button onClick={() => setView('form')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'form' ? `${theme.background.secondary} text-white` : 'text-gray-300'}`}>Form</button>
              <button onClick={() => setView('dashboard')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'dashboard' ? `${theme.background.secondary} text-white` : 'text-gray-300'}`}>Dashboard</button>
              <button onClick={() => setView('map')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'map' ? `${theme.background.secondary} text-white` : 'text-gray-300'}`}>Map</button>
            </div>
            
            <SaveButton onSave={handleSave} onLoad={handleLoad} saveStatus={saveStatus} />
            <CheckSheetButton onCheck={handleCheckSheet} isChecking={isCheckingSheet} />
            
            <button onClick={() => setIsInfoSidebarOpen(true)} className="p-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500" title="Open Info Hub">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </header>
        )}

        <main className={`flex-1 overflow-y-auto ${view !== 'stakeholder' ? 'p-4 sm:p-6 lg:p-8' : ''}`}>
          {view === 'form' ? (
            <Questionnaire 
              questions={questions}
              answers={answers}
              onAnswerUpdate={handleAnswerUpdate}
              destination={destination}
              aiContacts={aiContacts}
              setAiContacts={setAiContacts}
              openSection={openSection}
              setOpenSection={setOpenSection}
              activeQuestion={activeQuestion}
              setActiveQuestion={setActiveQuestion}
              sectionTimestamps={sectionTimestamps}
              isAdmin={isLoggedIn}
              geminiApiKey={apiKeys.gemini}
            />
          ) : view === 'dashboard' ? (
            <Dashboard 
              answers={answers}
              destination={destination}
              questions={questions}
              geminiApiKey={apiKeys.gemini}
            />
          ) : view === 'map' ? (
            <MapView 
              destination={destination} 
              onPoiSelect={setSelectedPoi} 
              pois={mapData[destination] || []}
              mapboxToken={apiKeys.mapbox}
            />
          ) : (
             <StakeholderDashboard 
                questions={questions}
                answers={answers}
                initialDestination={destination}
                sectionTimestamps={sectionTimestamps}
                onDestinationChange={(dest) => {
                  handleChangeDestination();
                }}
                geminiApiKey={apiKeys.gemini}
             />
          )}
        </main>
      </div>

      {infoHubData && (
        <InfoSidebar 
          isOpen={isInfoSidebarOpen}
          onClose={() => setIsInfoSidebarOpen(false)}
          data={infoHubData}
          onItemClick={(item) => setInfoModalData(item)}
        />
      )}
      <InfoModal
        isOpen={!!infoModalData}
        onClose={() => setInfoModalData(null)}
        data={infoModalData}
      />
      <PoiDetailPanel
        poi={selectedPoi}
        onClose={() => setSelectedPoi(null)}
      />
      <AuthPanel
        isOpen={isAuthPanelOpen}
        onClose={() => setIsAuthPanelOpen(false)}
        onLogin={handleLogin}
      />
      <UserProfilePanel
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />
       <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        onSave={(settings) => handleSaveSettings(settings.keys, settings.model)}
        currentKeys={apiKeys}
        currentModel={selectedApiModel}
      />
       {isLoggedIn && isDataSyncPanelOpen && (
        <DataSyncPanel
            isOpen={isDataSyncPanelOpen}
            onClose={() => setIsDataSyncPanelOpen(false)}
            questions={questions}
            answers={answers}
            onAnswersMerge={handleBulkMergeAnswers}
            destination={destination}
        />
       )}
    </div>
  );
}

interface AppProps {
  selectedDestination: string;
  answers: Answers;
  aiContacts: Record<string, AiContact[]>;
  apiKeys: ApiKeys;
  sectionTimestamps: SectionTimestamps;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  setAiContacts: React.Dispatch<React.SetStateAction<Record<string, AiContact[]>>>;
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKeys>>;
  setSectionTimestamps: React.Dispatch<React.SetStateAction<SectionTimestamps>>;
  handleChangeDestination: () => void;
  userProfile: UserProfile | null;
  handleLogin: (email: string) => Promise<void>;
  handleLogout: () => void;
  handleUpdateProfile: (profile: UserProfile) => Promise<void>;
  handleSaveSettings: (keys: ApiKeys, model: string) => Promise<void>;
  isAdmin: boolean;
  startInStakeholderView: boolean;
  onInitialViewRendered: () => void;
}

function AIApp() {
  const [selectedDestination, setSelectedDestination] = useLocalStorage<string>('selectedDestination', '');
  
  const answersKey = useMemo(() => `answers_${selectedDestination || 'none'}`, [selectedDestination]);
  const [answers, setAnswers] = useLocalStorage<Answers>(answersKey, {});

  const timestampsKey = useMemo(() => `timestamps_${selectedDestination || 'none'}`, [selectedDestination]);
  const [sectionTimestamps, setSectionTimestamps] = useLocalStorage<SectionTimestamps>(timestampsKey, {});

  const aiContactsKey = useMemo(() => `aiContacts_${selectedDestination || 'none'}`, [selectedDestination]);
  const [aiContacts, setAiContacts] = useLocalStorage<Record<string, AiContact[]>>(aiContactsKey, {});
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: '', openai: '', claude: '', mapbox: '' });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthPanelOpen, setIsAuthPanelOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const isAdmin = userProfile?.role === 'admin';

  const [startInStakeholderView, setStartInStakeholderView] = useState(false);
  const [landingView, setLandingView] = useState<'selector' | 'explanation'>('selector');
  const lastDestinationFromStorage = JSON.parse(localStorage.getItem('selectedDestination') || '""');

  // Session restoration effect
  useEffect(() => {
    const checkSession = async () => {
        const userEmail = getCurrentUserEmail();
        if (userEmail) {
            const profile = await loadUserProfile(userEmail);
            if (profile) {
                setUserProfile(profile);
                setApiKeys(profile.apiKeys);
            } else {
                setCurrentUserEmail(null);
            }
        }
    };
    checkSession();
  }, []);

  const isLoggedIn = !!userProfile;
  const userAvatar = userProfile?.avatar || (userProfile ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name || userProfile.email)}&background=4b5563&color=e2e8f0&size=96` : undefined);

  useEffect(() => {
    if (isLoggedIn && isAuthPanelOpen) {
      setIsAuthPanelOpen(false);
    }
    if (!isLoggedIn && isProfilePanelOpen) {
      setIsProfilePanelOpen(false);
    }
  }, [isLoggedIn, isAuthPanelOpen, isProfilePanelOpen]);

  const handleLogin = async (email: string) => {
    try {
      let profile = await loadUserProfile(email);
      if (!profile) {
          const newProfile: UserProfile = {
              id: email,
              email,
              name: email.split('@')[0],
              apiKeys: { gemini: '', openai: '', claude: '', mapbox: '' },
              role: email.toLowerCase() === 'admin@datareef.com' ? 'admin' : 'user',
          };
          await saveUserProfile(newProfile);
          profile = newProfile;
      }
      
      setCurrentUserEmail(email);
      setUserProfile(profile);
      setApiKeys(profile.apiKeys);
    } catch (error) {
      console.error("Login failed:", error);
      alert("An error occurred during sign-in. Please try again.");
    }
  };

  const handleLogout = () => {
      setUserProfile(null);
      setCurrentUserEmail(null);
      setApiKeys({ gemini: '', openai: '', claude: '', mapbox: '' });
  };
  
  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
      await saveUserProfile(updatedProfile);
      setUserProfile(updatedProfile);
      alert('Profile updated!');
  };

  const handleSaveSettings = async (keys: ApiKeys, model: string) => {
      setApiKeys(keys);
      if (userProfile) {
          const updatedProfile = { ...userProfile, apiKeys: keys };
          await saveUserProfile(updatedProfile);
          setUserProfile(updatedProfile);
      }
      alert("Settings saved.");
  };

  const handleDestinationSelect = (destination: string) => {
    if (destination !== selectedDestination) {
      setSelectedDestination(destination);
    }
  };
  
  const handleChangeDestination = () => {
    setStartInStakeholderView(false);
    setSelectedDestination('');
  }

  if (!selectedDestination) {
    return (
      <div 
        className="min-h-screen text-white flex flex-col items-center justify-center p-4 relative bg-cover bg-center"
        style={{ backgroundImage: 'url(https://storage.ning.com/topology/rest/1.0/file/get/13715201495?profile=original)' }}
      >
        <div className="absolute inset-0 bg-gray-900 bg-opacity-70"></div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
                onClick={() => {
                    if (lastDestinationFromStorage) {
                        setStartInStakeholderView(true);
                        handleDestinationSelect(lastDestinationFromStorage);
                    } else {
                        setLandingView('explanation');
                    }
                }}
                className="p-1 rounded-full hover:bg-gray-700/50"
                title={lastDestinationFromStorage ? `Go to ${lastDestinationFromStorage} Dashboard` : "About the Assessment"}
            >
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                </div>
            </button>
            <button onClick={() => isLoggedIn ? setIsProfilePanelOpen(true) : setIsAuthPanelOpen(true)} className="p-1 rounded-full hover:bg-gray-700/50" title="User Account">
                {isLoggedIn && userAvatar ? (
                    <img src={userAvatar} alt="User Avatar" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                )}
          </button>
        </div>

        {landingView === 'selector' ? (
            <div className="relative z-10 w-full max-w-lg bg-gray-800/80 backdrop-blur-sm p-8 rounded-lg shadow-2xl text-center">
              <img src="https://labs.landsurveyorsunited.com/datareef/icons/web/android-chrome-192x192.png" alt="DataReef Logo" className="mx-auto h-16 w-auto mb-4" />
              <h1 className="text-3xl font-bold text-teal-400 mb-2">Welcome</h1>
              <p className="text-gray-400 mb-6">Select a destination to begin your sustainable tourism assessment.</p>
              <DestinationSelector 
                destinations={destinations}
                selectedDestination={selectedDestination}
                onSelectDestination={handleDestinationSelect}
              />
            </div>
        ) : (
            <ExplanationPage onBack={() => setLandingView('selector')} />
        )}

        <AuthPanel
          isOpen={isAuthPanelOpen}
          onClose={() => setIsAuthPanelOpen(false)}
          onLogin={async (email) => {
            await handleLogin(email);
            setIsAuthPanelOpen(false);
          }}
        />

        {userProfile && <UserProfilePanel
          isOpen={isProfilePanelOpen}
          onClose={() => setIsProfilePanelOpen(false)}
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onLogout={() => {
            handleLogout();
            setIsProfilePanelOpen(false);
          }}
        />}
      </div>
    );
  }

  return (
    <ThemeProvider destination={selectedDestination}>
      <MainLayout 
        destination={selectedDestination}
        answers={answers}
        aiContacts={aiContacts}
        apiKeys={apiKeys}
        sectionTimestamps={sectionTimestamps}
        setAnswers={setAnswers}
        setAiContacts={setAiContacts}
        setApiKeys={setApiKeys}
        setSectionTimestamps={setSectionTimestamps}
        handleChangeDestination={handleChangeDestination}
        userProfile={userProfile}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        handleUpdateProfile={handleUpdateProfile}
        handleSaveSettings={handleSaveSettings}
        isAdmin={isAdmin}
        startInStakeholderView={startInStakeholderView}
        onInitialViewRendered={() => setStartInStakeholderView(false)}
      />
    </ThemeProvider>
  );
}

export default AIApp;