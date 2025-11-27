
import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from './icons';

interface ErrorBannerProps {
  projectId: string;
  onDismiss: () => void;
  message: string;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ projectId, onDismiss, message }) => {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-lg w-full bg-red-100 dark:bg-red-900/90 backdrop-blur-sm border-l-4 border-red-500 text-red-800 dark:text-red-100 p-4 rounded-lg shadow-2xl" role="alert">
      <div className="flex items-start">
        <div className="py-1">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-4" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg mb-1">Connection Error</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
          <a
            href={`https://console.firebase.google.com/project/${projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-bold underline hover:text-red-900 dark:hover:text-white transition-colors"
          >
            Open Firebase Console
          </a>
        </div>
        <button onClick={onDismiss} className="ml-2 -mt-2 -mr-2 p-1.5 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 focus:outline-none">
          <span className="sr-only">Dismiss</span>
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ErrorBanner;
