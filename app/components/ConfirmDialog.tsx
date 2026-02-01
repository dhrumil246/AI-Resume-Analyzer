type ConfirmDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isOpen,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 className="text-xl font-semibold text-black mb-2">{title}</h3>
        {description && <p className="text-dark-200 mb-6">{description}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="primary-button w-fit">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="primary-button w-fit bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
