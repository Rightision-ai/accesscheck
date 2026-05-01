export default function TaglineQuote() {
  return (
    <section
      aria-labelledby="quote-heading"
      className="bg-[var(--primary-light)]"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2
          id="quote-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-main)] leading-[1.05]"
        >
          Built for the people who need it most.
        </h2>
        <blockquote className="mt-6 text-xl sm:text-2xl text-[var(--text-main)] leading-relaxed">
          “We don&rsquo;t just describe a home. We tell you{" "}
          <span className="text-[var(--primary-dark)] font-semibold underline decoration-[var(--primary)] decoration-2 underline-offset-4">
            whether it works for the person who&rsquo;ll live in it.
          </span>
          ”
          <footer className="mt-4 text-sm font-semibold text-[var(--text-dim)] not-italic">
            <cite>— The AccessCheck team, by Foundations</cite>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
