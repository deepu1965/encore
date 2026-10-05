'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Modal, type ModalProps } from '@/components/ui/modal';

export interface ConfirmationDialogProps extends Omit<ModalProps, 'children'> {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
  children?: ReactNode;
}

export function ConfirmationDialog({
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  children,
  onClose,
  ...modalProps
}: ConfirmationDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal {...modalProps} onClose={onClose} showClose={false}>
      <div className="flex flex-col gap-4">
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'primary'} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
