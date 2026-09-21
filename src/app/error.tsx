"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-wide">The board hit a snag.</h1>
      <p className="text-sm text-muted-foreground">
        Something broke while drawing this page. Your saved layout is still in this browser.
      </p>
      <button
        type="button"
        className="h-9 w-fit rounded-lg bg-primary px-3 text-sm text-primary-foreground"
        onClick={reset}
      >
        Try again
      </button>
    </main>
  );
}
