import { useMemo, useState } from "react";
import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { useResumeStore } from "~/store/resumeStore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job" },
  ];
}

export default function Home() {
  const resumes = useResumeStore((state) => state.resumes);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("score");

  const filteredResumes = useMemo(() => {
    if (!resumes) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const matches = resumes.filter((resume) => {
      if (!normalizedQuery) return true;
      const company = resume.companyName?.toLowerCase() ?? "";
      const title = resume.jobTitle?.toLowerCase() ?? "";
      return company.includes(normalizedQuery) || title.includes(normalizedQuery);
    });

    const sorted = [...matches].sort((a, b) => {
      if (sortKey === "company") {
        return (a.companyName ?? "").localeCompare(b.companyName ?? "");
      }

      if (sortKey === "newest") {
        const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bTime - aTime;
      }

      return b.feedback.overallScore - a.feedback.overallScore;
    });

    return sorted;
  }, [query, resumes, sortKey]);

  return (
    <main>
      <Navbar />
      <section className="main-section">
        <div className="page-heading">
          <h1> Track your applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback</h2>
        </div>
      </section>
      <section className="filter-bar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by company or role"
          aria-label="Search resumes"
        />
        <select
          className="filter-select"
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value)}
          aria-label="Sort resumes"
        >
          <option value="score">Top score</option>
          <option value="newest">Newest</option>
          <option value="company">Company A-Z</option>
        </select>
        <button
          type="button"
          className="primary-button w-fit"
          onClick={() => {
            setQuery("");
            setSortKey("score");
          }}
        >
          Clear
        </button>
      </section>
      {filteredResumes.length > 0 ? (
        <div className="resumes-section">
          {filteredResumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pb-16">
          <p className="text-dark-200">
            {!resumes || resumes.length === 0
              ? "No resumes yet."
              : "No results match your search."}
          </p>
        </div>
      )}
    </main>
  );
}
