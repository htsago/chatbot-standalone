import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-24 right-6 z-50 animate-slide-in">
      <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-sm">
        <div className="flex-shrink-0 w-3 h-3 bg-teal-500 rounded-full animate-pulse shadow-lg shadow-teal-500/50"></div>
        <p className="text-white text-sm flex-1 leading-relaxed font-medium">{message}</p>
        <button
          onClick={onClose}
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


