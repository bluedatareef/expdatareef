
import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface SaveButtonProps {
  onSave: () => void;
  onLoad: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export const SaveButton: React.FC<SaveButtonProps> = ({ onSave, onLoad, saveStatus }) => {
  const theme = useTheme();
  
  const getButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </>
        );
      case 'saved':
        return '✓ Saved!';
      case 'error':
        return '✗ Save Failed';
      default:
        return '✓ All Saved';
    }
  };
  
  const getButtonClass = () => {
    let baseClass = `px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${theme.ring.primary} disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-300`;
    
    switch (saveStatus) {
      case 'saved':
        return `${baseClass} bg-green-600`;
      case 'error':
        return `${baseClass} bg-red-600`;
      case 'saving':
         return `${baseClass} bg-gray-500`;
      default: // idle
        return `${baseClass} bg-gray-600 hover:bg-gray-700`;
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        className={getButtonClass()}
        title="Your progress is saved automatically. Click to save immediately."
      >
        {getButtonContent()}
      </button>
      <button
        onClick={onLoad}
        className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
      >
        Load Progress
      </button>
    </div>
  );
};
