
import React from 'react';
import { LogEntry } from '../types';

interface ActivityLogProps {
  logs: LogEntry[];
}

const ActivityLog: React.FC<ActivityLogProps> = ({ logs }) => {
  return (
    <div className="space-y-3 pt-6 border-t dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Activity Log</h3>
      <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
        {logs.slice().reverse().map(log => (
          <li key={log.id} className="text-sm border-l-2 pl-3 border-slate-200 dark:border-slate-600">
            <p className="text-slate-700 dark:text-slate-200">{log.action}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {new Date(log.timestamp).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityLog;
