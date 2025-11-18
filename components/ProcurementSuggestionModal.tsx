import React from 'react';
import type { POItem, ProcurementSuggestion } from '../types';
import { XMarkIcon, SparklesIcon } from './icons';

interface ProcurementSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: POItem | null;
  suggestion: ProcurementSuggestion | null;
  isLoading: boolean;
  error: string | null;
}

const SuggestionItem: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div>
    <h4 className="font-semibold text-lg text-slate-700 dark:text-slate-200 mb-2">{title}</h4>
    <ul className="list-disc list-inside space-y-1.5 text-base text-slate-600 dark:text-slate-400 pl-2">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  </div>
);

const ProcurementSuggestionModal: React.FC<ProcurementSuggestionModalProps> = ({ isOpen, onClose, item, suggestion, isLoading, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-red-500"/>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">AI Procurement Strategy</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-6">
          {item && (
            <div className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.partNumber}</p>
                <p className="text-base text-slate-500 dark:text-slate-400">Quantity Required: {item.quantity} units</p>
            </div>
          )}
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-300">Generating AI suggestions...</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">This may take a moment.</p>
            </div>
          )}

          {error && (
             <div className="text-center p-12">
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          )}

          {suggestion && !isLoading && (
            <div className="space-y-6">
              <SuggestionItem title="Potential Supplier Types" items={suggestion.supplier_types} />
              <SuggestionItem title="Key Negotiation Tactics" items={suggestion.negotiation_tactics} />
              <SuggestionItem title="Important Lead Time Considerations" items={suggestion.lead_time_considerations} />
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcurementSuggestionModal;