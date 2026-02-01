import { Link } from "react-router";
import { useEffect, useState } from "react";
import ConfirmDialog from "~/components/ConfirmDialog";
import { 
  deleteResumeFile, 
  deleteResumePreview, 
  getResumePreview 
} from "~/lib/resumeStorage.client";
import { useResumeStore } from "~/store/resumeStore";
import { useToastStore } from "~/store/toastStore";

const getBadgeClass = (score: number) =>
  score >= 80
    ? "bg-[--color-badge-green] text-[--color-badge-green-text]"
    : score >= 60
    ? "bg-[--color-badge-yellow] text-[--color-badge-yellow-text]"
    : "bg-[--color-badge-red] text-[--color-badge-red-text]";

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath, resumePath },
}: {
  resume: Resume;
}) => {
  const removeResume = useResumeStore((state) => state.removeResume);
  const addToast = useToastStore((state) => state.addToast);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (imagePath) {
      // Check if it's a static path (demo data) or IndexedDB key
      if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
        // Static file path - use directly
        setPreviewUrl(imagePath);
      } else {
        // IndexedDB key - fetch from storage
        getResumePreview(imagePath).then((preview) => {
          if (isMounted && preview) {
            setPreviewUrl(preview);
          }
        });
      }
    } else {
      setPreviewUrl(null);
    }
    return () => { isMounted = false; };
  }, [imagePath]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      if (resumePath) {
        await deleteResumeFile(resumePath);
      }
      if (imagePath) {
        await deleteResumePreview(imagePath);
      }
      removeResume(id);
      addToast({
        title: "Resume deleted",
        description: "The resume was removed from local storage.",
        type: "info",
      });
      setIsConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link
        to={`/resume/${id}`}
        className="resume-card animate-in fade-in duration-1000"
      >
        <div className="resume-card-header">
          <div className="flex flex-col gap-2">
            <h2 className="!text-black font-bold break-words">
              {companyName || "Untitled"}
            </h2>
            <h3 className="text-lg break-words text-gray-500">
              {jobTitle || "Role not specified"}
            </h3>
          </div>
          <span className={`score-badge ${getBadgeClass(feedback.overallScore)}`}>
            <span className="text-sm font-semibold">
              {feedback.overallScore}
            </span>
          </span>
        </div>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${companyName ?? "Resume"} preview`}
            className="w-full h-auto rounded-none border border-gray-200"
          />
        ) : (
          <div className="flex items-center justify-center h-64 rounded-none border border-dashed border-gray-300 text-sm text-dark-200">
            Preview unavailable
          </div>
        )}
        <div className="mt-auto flex justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsConfirmOpen(true);
            }}
            className="primary-button w-fit bg-red-500"
          >
            Delete
          </button>
        </div>
      </Link>
      <ConfirmDialog
        title="Delete resume?"
        description="This will remove the resume and its local PDF file."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        isOpen={isConfirmOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
};

export default ResumeCard;