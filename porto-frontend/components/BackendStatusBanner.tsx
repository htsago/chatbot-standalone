import React from 'react';

interface BackendStatusBannerProps {
  isChecking: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}

const GearIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
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

const BackendStatusBanner: React.FC<BackendStatusBannerProps> = ({
  isChecking,
  isError,
  errorMessage,
  onRetry,
}) => {
  // Don't show banner if everything is OK
  if (!isChecking && !isError) {
    return null;
  }

  return (
    <div
      className={`
        relative w-full
        transition-all duration-300 ease-in-out
        ${isChecking 
          ? 'bg-gray-800/60 backdrop-blur-sm border-b border-gray-700/50' 
          : 'bg-red-600/80 backdrop-blur-sm border-b border-red-500/50'
        }
        shadow-md
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex-shrink-0">
              {isChecking && (
                <div className="relative">
                  <GearIcon className="w-4 h-4 text-teal-400 animate-spin" />
                </div>
              )}
              {isError && (
                <svg
                  className="w-4 h-4 text-red-200 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs sm:text-sm text-gray-200 font-medium truncate">
              {isChecking
                ? 'Backend-Verbindung wird geprüft...'
                : errorMessage || 'Backend-Verbindung fehlgeschlagen'}
            </span>
          </div>
          {isError && (
            <button
              onClick={onRetry}
              disabled={isChecking}
              className="
                ml-3 flex-shrink-0
                px-3 py-1.5 text-xs font-medium
                bg-red-700/80 hover:bg-red-700
                text-white rounded-md
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-600
                active:scale-95
              "
            >
              {isChecking ? (
                <>
                  <GearIcon className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                  <span className="hidden sm:inline">Prüfe...</span>
                </>
              ) : (
                <span>Erneut versuchen</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackendStatusBanner;

