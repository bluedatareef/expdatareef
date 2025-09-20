import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface CheckSheetButtonProps {
  onCheck: () => void;
  isChecking: boolean;
}

export const CheckSheetButton: React.FC<CheckSheetButtonProps> = ({ onCheck, isChecking }) => {
  const theme = useTheme();

  return (
    <button
      onClick={onCheck}
      disabled={isChecking}
      title="Sync from Sheet"
      className={`px-4 py-2 text-sm font-medium text-white ${theme.background.primary} ${theme.background.hover} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${theme.ring.primary} ${theme.background.disabled} disabled:cursor-not-allowed flex items-center`}
    >
      {isChecking ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Syncing...
        </>
      ) : 'Sheet'}
    </button>
  );
};