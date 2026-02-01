import { create } from "zustand";

export type Toast = {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
};

type ToastState = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = generateId();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((item) => item.id !== id),
        }));
      }, 3500);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
