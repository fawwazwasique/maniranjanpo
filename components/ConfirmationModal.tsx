import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
            {title}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-base text-slate-600 dark:text-slate-300">{children}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;