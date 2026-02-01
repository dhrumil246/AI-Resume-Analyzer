import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import Navbar from "~/components/Navbar";
import { deleteResumeFile, getResumeFile, deleteResumePreview } from "~/lib/resumeStorage.client";
import { useResumeStore } from "~/store/resumeStore";
import { useToastStore } from "~/store/toastStore";

const ScoreBadge = ({ score }: { score: number }) => {
  const badgeClass =
    score >= 80
      ? "bg-[--color-badge-green] text-[--color-badge-green-text]"
      : score >= 60
      ? "bg-[--color-badge-yellow] text-[--color-badge-yellow-text]"
      : "bg-[--color-badge-red] text-[--color-badge-red-text]";

  return (
    <span className={`score-badge ${badgeClass}`}>
      <span className="text-sm font-semibold">{score}</span>
    </span>
  );
};

const FeedbackSection = ({
  title,
  score,
  tips,
}: {
  title: string;
  score: number;
  tips: { type: "good" | "improve"; tip: string; explanation?: string }[];
}) => (
  <div className="gradient-border">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-semibold text-black">{title}</h3>
      <ScoreBadge score={score} />
    </div>
    <ul className="flex flex-col gap-3">
      {tips.map((tip, index) => (
        <li key={`${title}-${index}`} className="text-sm text-dark-200">
          <span className="font-semibold text-black">{tip.tip}</span>
          {tip.explanation && (
            <p className="text-sm text-dark-200 mt-1">{tip.explanation}</p>
          )}
        </li>
      ))}
    </ul>
  </div>
);

const ResumeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const resume = useResumeStore((state) =>
    id ? state.getResumeById(id) : undefined
  );
  const removeResume = useResumeStore((state) => state.removeResume);
  const updateResume = useResumeStore((state) => state.updateResume);
  const addToast = useToastStore((state) => state.addToast);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  useEffect(() => {
    if (!resume?.resumePath || typeof window === "undefined") return;

    let objectUrl: string | null = null;
    setIsLoadingFile(true);

    getResumeFile(resume.resumePath)
      .then((stored) => {
        if (!stored) return;
        const blob = new Blob([stored.data], { type: stored.type });
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(() => {
        setPdfUrl(null);
      })
      .finally(() => setIsLoadingFile(false));

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resume?.resumePath]);

  if (!resume) {
    return (
      <main className="bg-[ url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="page-heading">
            <h1>Resume not found</h1>
            <h2>Upload a resume to get started.</h2>
            <Link to="/upload" className="primary-button w-fit">
              Upload resume
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const handleDelete = async () => {
    if (!resume) return;
    try {
      setIsDeleting(true);
      if (resume.resumePath) {
        await deleteResumeFile(resume.resumePath);
      }
      if (resume.imagePath) {
        await deleteResumePreview(resume.imagePath);
      }
      removeResume(resume.id);
      addToast({
        title: "Resume deleted",
        description: "The resume was removed from local storage.",
        type: "info",
      });
      navigate("/");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveName = () => {
    if (!resume || !id) return;
    const trimmedName = editedName.trim();
    if (trimmedName) {
      updateResume(id, { companyName: trimmedName });
      addToast({
        title: "Name updated",
        description: "Resume name has been saved.",
        type: "success",
      });
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(resume?.companyName || "");
    setIsEditingName(false);
  };

  return (
    <main className="bg-[ url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading">
          <h1>{resume.jobTitle || "Resume feedback"}</h1>
          <h2>Overall score: {resume.feedback.overallScore}</h2>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-6 pb-16 flex flex-col gap-8">
        <div className="gradient-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-dark-200">Resume name</p>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className="text-lg font-semibold text-black border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter resume name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-sm px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-semibold text-black">
                    {resume.companyName || "Untitled resume"}
                  </p>
                  <button
                    onClick={() => {
                      setEditedName(resume.companyName || "");
                      setIsEditingName(true);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
              {resume.createdAt && (
                <p className="text-xs text-dark-200 mt-1">
                  {new Date(resume.createdAt).toLocaleString()}
                </p>
              )}
            </div>
            <ScoreBadge score={resume.feedback.overallScore} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-button w-fit"
              >
                View PDF
              </a>
            ) : (
              <button
                type="button"
                className="primary-button w-fit opacity-70 cursor-not-allowed"
                disabled
              >
                {isLoadingFile ? "Loading PDF..." : "PDF unavailable"}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="primary-button w-fit bg-red-500"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete resume"}
            </button>
          </div>
        </div>

        {pdfUrl ? (
          <div className="gradient-border">
            <h3 className="text-xl font-semibold text-black mb-4">Resume</h3>
            <iframe
              title="Resume PDF"
              src={pdfUrl}
              className="pdf-embed"
            />
          </div>
        ) : (
          <div className="gradient-border">
            <h3 className="text-xl font-semibold text-black mb-2">Resume</h3>
            <p className="text-sm text-dark-200">
              {isLoadingFile
                ? "Loading resume preview..."
                : "PDF preview is unavailable."}
            </p>
          </div>
        )}

        <FeedbackSection
          title="ATS"
          score={resume.feedback.ATS.score}
          tips={resume.feedback.ATS.tips}
        />
        <FeedbackSection
          title="Tone & Style"
          score={resume.feedback.toneAndStyle.score}
          tips={resume.feedback.toneAndStyle.tips}
        />
        <FeedbackSection
          title="Content"
          score={resume.feedback.content.score}
          tips={resume.feedback.content.tips}
        />
        <FeedbackSection
          title="Structure"
          score={resume.feedback.structure.score}
          tips={resume.feedback.structure.tips}
        />
        <FeedbackSection
          title="Skills"
          score={resume.feedback.skills.score}
          tips={resume.feedback.skills.tips}
        />
      </section>
    </main>
  );
};

export default ResumeDetail;
