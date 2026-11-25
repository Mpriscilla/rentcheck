import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  'Paste a listing',
  'Get an AI summary of costs and red flags',
  'Vote with roommates live',
]

export default function RentCheckIntro() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-20">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">RentCheck</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Review apartment listings with your roommates before you sign.
        </h1>

        <ol className="mt-10 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-border bg-background p-5 text-sm font-medium leading-6 text-foreground"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              >
                {index + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>

        <Link
          to="/listings"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Go to Listings
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
