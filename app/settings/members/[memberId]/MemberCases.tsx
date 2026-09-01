"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import CaseCard from "@/app/components/dashboard/CaseCard";
import Pagination from "@/app/components/settings/Pagination";
import type { Case } from "@/types/dashboard";

/** One row of cards per page, matching the dashboard's four-across case grid. */
const PAGE_SIZE = 4;

/**
 * A member's cases as the same cards the dashboard and assessments list use, so a case
 * looks the same wherever it is met. The whole set is loaded with the page and paged
 * client-side — a member's caseload is small enough that a round trip per page would cost
 * more than it saves.
 */
export default function MemberCases({ cases, memberName }: { cases: Case[]; memberName: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [paging, startTransition] = useTransition();
  const pageCount = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = cases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (cases.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-slate-500">
        No cases yet. Anything {memberName} creates will appear here.
      </p>
    );
  }

  return (
    <div className="px-5 pb-5">
      <div
        className={`grid items-stretch gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
          paging ? "opacity-60" : ""
        }`}
      >
        {visible.map((caseData) => (
          <CaseCard
            key={caseData.id}
            caseData={caseData}
            onClick={(id) => router.push(`/cases/${id}`)}
          />
        ))}
      </div>
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        total={cases.length}
        pageSize={PAGE_SIZE}
        pending={paging}
        onChange={(next) => startTransition(() => setPage(next))}
        label="cases"
      />
    </div>
  );
}
