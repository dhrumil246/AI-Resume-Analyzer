import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { resumes as initialResumes } from "../../constants";

type ResumeState = {
  resumes: Resume[];
  addResume: (resume: Resume) => void;
  removeResume: (id: string) => void;
  updateResume: (id: string, updates: Partial<Resume>) => void;
  getResumeById: (id: string) => Resume | undefined;
  setResumes: (resumes: Resume[]) => void;
};

const isBrowser = typeof window !== "undefined";

const createStore = () =>
  create<ResumeState>((set, get) => ({
    resumes: initialResumes,
    addResume: (resume) =>
      set((state) => ({ resumes: [resume, ...state.resumes] })),
    removeResume: (id) =>
      set((state) => ({
        resumes: state.resumes.filter((resume) => resume.id !== id),
      })),
    updateResume: (id, updates) =>
      set((state) => ({
        resumes: state.resumes.map((resume) =>
          resume.id === id ? { ...resume, ...updates } : resume
        ),
      })),
    getResumeById: (id) => get().resumes.find((resume) => resume.id === id),
    setResumes: (resumes) => set({ resumes }),
  }));

const createPersistedStore = () =>
  create<ResumeState>()(
    persist(
      (set, get) => ({
        resumes: initialResumes,
        addResume: (resume) =>
          set((state) => ({ resumes: [resume, ...state.resumes] })),
        removeResume: (id) =>
          set((state) => ({
            resumes: state.resumes.filter((resume) => resume.id !== id),
          })),
        updateResume: (id, updates) =>
          set((state) => ({
            resumes: state.resumes.map((resume) =>
              resume.id === id ? { ...resume, ...updates } : resume
            ),
          })),
        getResumeById: (id) =>
          get().resumes.find((resume) => resume.id === id),
        setResumes: (resumes) => set({ resumes }),
      }),
      {
        name: "resume-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ resumes: state.resumes }),
      }
    )
  );

export const useResumeStore = isBrowser
  ? createPersistedStore()
  : createStore();
