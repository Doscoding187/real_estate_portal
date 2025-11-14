import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  autoDismiss?: boolean;
  dismissTime?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  onClose,
  autoDismiss = true,
  dismissTime = 5000,
}) => {
  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        onClose();
      }, dismissTime);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissTime, onClose]);

  const variantClasses = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-orange-50 text-orange-800 border-orange-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const iconMap = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <XCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const iconClasses = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-orange-400',
    info: 'text-blue-400',
  };

  return (
    <div
      className={`max-w-sm w-full rounded-lg shadow-lg border p-4 ${variantClasses[variant]}`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconClasses[variant]}`}>
          {iconMap[variant]}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="rounded-md inline-flex text-slate-400 hover:text-slate-500 focus:outline-none"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
