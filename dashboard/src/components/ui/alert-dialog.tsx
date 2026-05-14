import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Dialog } from './dialog';

export type AlertVariant = 'success' | 'error' | 'info';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: React.ReactNode;
  variant?: AlertVariant;
  buttonText?: string;
  onClose?: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'info',
  buttonText = 'OK',
  onClose,
}: AlertDialogProps) {
  
  const getIcon = () => {
    switch (variant) {
      case 'success': return <CheckCircle2 color="var(--success)" size={24} />;
      case 'error': return <AlertCircle color="var(--danger)" size={24} />;
      case 'info': return <Info color="var(--primary)" size={24} />;
      default: return null;
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={getIcon()}
      maxWidth={400}
      footer={
        <button 
          className="btn btn-primary" 
          onClick={handleClose}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {buttonText}
        </button>
      }
    >
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: 14 }}>
        {message}
      </div>
    </Dialog>
  );
}
