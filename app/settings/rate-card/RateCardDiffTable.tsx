import type { RateCardDiff, RateCardDiffStatus } from "@/lib/rate-cards/diff";

const STATUS_STYLE: Record<RateCardDiffStatus, string> = {
  removed: "border-rose-200 bg-rose-50 text-rose-700",
  changed: "border-amber-200 bg-amber-50 text-amber-700",
  added: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unchanged: "border-slate-200 bg-slate-50 text-slate-500",
};

const STATUS_LABEL: Record<RateCardDiffStatus, string> = {
  removed: "Reverts to national",
  changed: "Price changes",
  added: "Newly priced by you",
  unchanged: "Unchanged",
};

const gbp = (value: number) => `£${value.toLocaleString("en-GB")}`;

/**
 * What publishing would actually do.
 *
 * `removed` gets the loudest treatment on purpose: a version is exactly the file uploaded, so a
 * code priced today but left out of this file reverts to the national rate. That is easy to do
 * by accident when someone edits a spreadsheet down to "just the lines that changed".
 */
export default function RateCardDiffTable({ diff }: { diff: RateCardDiff }) {
  const { summary } = diff;
  const reverting = diff.entries.filter((entry) => entry.status === "removed");

  return (
    <div className="mt-5">
      <p className="text-sm font-bold text-slate-800">
        {summary.changed} price{summary.changed === 1 ? "" : "s"} change,{" "}
        {summary.added} newly priced, {summary.removed} revert to national,{" "}
        {summary.unchanged} unchanged
        {summary.inherited > 0 && (
          <span className="font-normal text-slate-500">
            {" "}
            · {summary.inherited} national item{summary.inherited === 1 ? "" : "s"} stay
            inherited
          </span>
        )}
      </p>

      {reverting.length > 0 && (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800">
          <span className="font-bold">
            {reverting.length} work item{reverting.length === 1 ? "" : "s"} you price today
            {reverting.length === 1 ? " is" : " are"} not in this file
          </span>{" "}
          and will go back to national rates. A version is exactly the file you upload — include
          every line you want to keep pricing.
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Work item</th>
              <th className="py-2 pr-3">Now</th>
              <th className="py-2 pr-3">After</th>
              <th className="py-2 pr-3">Change</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {diff.entries.map((entry) => (
              <tr key={entry.workItemCode} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-3">
                  <div className="font-semibold text-slate-800">{entry.description}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {entry.workItemCode}
                    {entry.currentSource === "national" && " · on national rates"}
                  </div>
                </td>
                <td className="py-2 pr-3 text-slate-600">{gbp(entry.currentExpectedGbp)}</td>
                <td className="py-2 pr-3 font-semibold text-slate-800">
                  {gbp(entry.nextExpectedGbp)}
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {entry.deltaGbp === 0 ? (
                    entry.durationChanged ? (
                      <span className="text-[11px] text-slate-500">duration only</span>
                    ) : (
                      "—"
                    )
                  ) : (
                    <span className={entry.deltaGbp > 0 ? "text-rose-700" : "text-emerald-700"}>
                      {entry.deltaGbp > 0 ? "+" : ""}
                      {gbp(entry.deltaGbp)}
                      {entry.deltaPct !== null && ` (${entry.deltaPct > 0 ? "+" : ""}${entry.deltaPct}%)`}
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[entry.status]}`}
                  >
                    {STATUS_LABEL[entry.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
