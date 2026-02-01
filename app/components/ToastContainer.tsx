import { useToastStore } from "~/store/toastStore";

const getToastStyle = (type?: "success" | "error" | "info") => {
  if (type === "success") return "toast-success";
  if (type === "error") return "toast-error";
  return "toast-info";
};

const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${getToastStyle(toast.type)}`}>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-gray-300 mt-1">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
