
import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children, className = "" }) => {
  return (
    <div className={`space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg ${className}`}>
      <h3 className="text-lg font-medium text-slate-800 dark:text-white">{title}</h3>
      {children}
    </div>
  );
};

export default FormSection;
