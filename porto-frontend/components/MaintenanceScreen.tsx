import React from 'react';

interface MaintenanceScreenProps {
  onRetry: () => void;
  isChecking: boolean;
}

const GearIcon: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onRetry, isChecking }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center px-4">
        <div className="mb-8 flex justify-center">
          <GearIcon className="w-20 h-20 text-teal-400 animate-spin" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Wartung
        </h1>
        <p className="text-gray-400 text-base md:text-lg mb-6 max-w-md mx-auto">
          {isChecking
            ? 'Backend-Verbindung wird geprüft...'
            : 'Das Backend ist derzeit nicht erreichbar. Bitte überprüfe, ob der Server läuft.'}
        </p>
        {!isChecking && (
          <button
            onClick={onRetry}
            className="
              px-6 py-3 text-sm font-medium
              bg-teal-600 hover:bg-teal-700
              text-white rounded-lg
              transition-all duration-200
              flex items-center gap-2 mx-auto
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900
              active:scale-95
              shadow-lg hover:shadow-xl
            "
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
};

export default MaintenanceScreen;

