const STEPS = [
  {
    n: "01",
    title: "Brief the job",
    body: "Paste the work in your own words, or drop a PDF drawing. The catalog fills materials and labor lines for you.",
  },
  {
    n: "02",
    title: "See every line",
    body: "Quantity times cost, length times width times price per sq ft, hours times rate. Edit anything. The sheet is yours.",
  },
  {
    n: "03",
    title: "Know the margin",
    body: "Contingency, markup, GST and profit update as you type, with a warning when margin drops below your floor.",
  },
];

const RULES = [
  "direct = materials + labor",
  "contingency = direct x contingency %",
  "bid = (direct + contingency) x (1 + markup %)",
  "margin = profit / bid",
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full border-t border-neutral-200/70 bg-white px-6 py-16 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">How it works</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-neutral-900 sm:text-4xl">
          Every part of the bid, out in the open.
        </h2>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-neutral-200/80 bg-[#FAFAFA] p-5">
              <span className="text-xs font-black text-neutral-400">{s.n}</span>
              <h3 className="mt-3 text-base font-bold text-neutral-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200/80 p-5">
            <h3 className="text-base font-bold text-neutral-900">AI reads the ask. The math stays exact.</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Language models only help interpret a brief or classify a document. Every dollar figure comes from
              plain code you can check by hand:
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-neutral-700">
              {RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 p-5">
            <h3 className="text-base font-bold text-neutral-900">What is a preview today</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              The blueprint take-off classifies your PDF, but the line counts are sample quantities until a drawing
              parser ships. Review every line before a bid goes to a client. The estimator is built for small trade
              businesses, not enterprise takeoff teams.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
