import React from 'react';
import { AlertTriangle, Info, ShieldAlert, Trash2 } from 'lucide-react';
import { Dialog } from './dialog';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  
  const getIcon = () => {
    switch (variant) {
      case 'danger': return <Trash2 color="var(--danger)" size={22} />;
      case 'warning': return <AlertTriangle color="var(--warning)" size={22} />;
      case 'info': return <Info color="var(--primary)" size={22} />;
      default: return <ShieldAlert color="var(--text-secondary)" size={22} />;
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger': return 'btn btn-danger';
      case 'warning': return 'btn btn-primary'; // Using primary for warning action as there's no warning btn
      case 'info': return 'btn btn-primary';
      default: return 'btn btn-primary';
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={getIcon()}
      maxWidth={400}
      footer={
        <>
          <button 
            className="btn btn-ghost" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button 
            className={getButtonClass()} 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: 14, margin: 0 }}>
        {message}
      </p>
    </Dialog>
  );
}
