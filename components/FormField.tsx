
import React from 'react';

interface FormFieldProps {
  label: string;
  id: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, id, children, required, className = "" }) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
};

export default FormField;
