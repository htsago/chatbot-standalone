import { useEffect, useCallback } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000, type = 'info' }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-500/60',
          dot: 'bg-green-500',
          shadow: 'shadow-green-500/50',
          icon: (
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'error':
        return {
          border: 'border-red-500/60',
          dot: 'bg-red-500',
          shadow: 'shadow-red-500/50',
          icon: (
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
        };
      default:
        return {
          border: 'border-teal-500/60',
          dot: 'bg-teal-500',
          shadow: 'shadow-teal-500/50',
          icon: (
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed top-24 right-6 z-50 animate-slide-in">
      <div className={`bg-gray-800 border-2 ${styles.border} rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 min-w-[320px] max-w-md backdrop-blur-sm`}>
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <p className="text-white text-sm flex-1 leading-relaxed font-medium">{message}</p>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white active:scale-95 transition-all duration-200 p-1.5 rounded-xl hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;


