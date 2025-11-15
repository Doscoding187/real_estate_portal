import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-lg">
          <div
            className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}
          >
            {showCloseButton && (
              <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                <button
                  type="button"
                  className="bg-white rounded-md text-slate-400 hover:text-slate-500 focus:outline-none"
                  onClick={onClose}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )}

            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {title && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-slate-900">
                    {title}
                  </h3>
                  {showCloseButton && (
                    <button
                      type="button"
                      className="sm:hidden text-slate-400 hover:text-slate-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  )}
                </div>
              )}
              <div>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
