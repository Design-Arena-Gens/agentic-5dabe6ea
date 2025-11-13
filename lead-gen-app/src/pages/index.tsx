import { FormEvent, useMemo, useState } from "react";

type Lead = {
  keyword: string;
  businessName: string;
  phoneNumber: string;
  rankingPosition: number;
  website: string | null;
  location: string | null;
};

type LeadsResponse = {
  leads: Lead[];
  error?: string;
};

function toOrdinal(position: number) {
  const remainder = position % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

export default function HomePage() {
  const [queryText, setQueryText] = useState("plumber in Austin\nelectrician in Denver");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queries = useMemo(
    () =>
      queryText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [queryText]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (queries.length === 0) {
      setError("Add at least one keyword + location query.");
      setLeads([]);
      return;
    }

    setLoading(true);
    setError(null);
    setLeads([]);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ queries }),
      });

      const data: LeadsResponse = await response.json();

      if (!response.ok) {
        const message = data.error ?? "Unable to fetch leads.";
        throw new Error(message);
      }

      setLeads(data.leads);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Unknown error while generating leads.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="space-y-4 text-center md:text-left">
          <span className="inline-flex items-center justify-center rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
            Lead Generation Toolkit
          </span>
          <h1 className="text-3xl font-semibold sm:text-4xl md:text-5xl">
            Spot high-value Google Business Profile opportunities in seconds.
          </h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Paste keyword + location combinations (one per line). We&apos;ll pull businesses ranking beyond the
            local pack or missing websites so you can pitch optimized listings that actually convert.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl">
          <label className="flex flex-col gap-3">
            <span className="text-sm font-medium text-slate-200">Keyword + Location</span>
            <textarea
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 font-mono text-sm text-slate-100 outline-none ring-2 ring-transparent transition focus:border-sky-500/50 focus:ring-sky-500/30"
              placeholder="plumber in Austin\nroofing contractor in Tampa"
            />
            <span className="text-xs text-slate-400">
              Results return up to 7 leads. We include profiles ranking below the top 5 or missing website links.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-sky-700/40"
          >
            {loading ? "Collecting leads..." : "Find leads"}
          </button>

          {error && (
            <p className="rounded-xl border border-rose-900/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          )}
        </form>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-inner">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Lead list</h2>
            <p className="text-xs text-slate-400">Sorted by keyword and Google Maps ranking.</p>
          </div>

          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Keyword</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Business</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Phone</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Rank</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Website</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider text-slate-300">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      Feed in keyword + location pairs to uncover opportunities. Results appear here.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={`${lead.keyword}-${lead.businessName}-${lead.rankingPosition}`} className="hover:bg-slate-900/80">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-200">{lead.keyword}</td>
                      <td className="px-6 py-4 text-slate-100">{lead.businessName}</td>
                      <td className="px-6 py-4 text-slate-200">{lead.phoneNumber}</td>
                      <td className="px-6 py-4 text-slate-200">{toOrdinal(lead.rankingPosition)}</td>
                      <td className="px-6 py-4 text-sky-400">
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4">
                            {lead.website}
                          </a>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-200">{lead.location ?? "Unknown"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
