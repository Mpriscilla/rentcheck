import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import type { ListingFormData } from '@/components/ListingForm'

export default function ListingsPage() {
  const navigate = useNavigate()
  const { records, status } = useQuery<ListingFormData>('listings', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
      <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary">RentCheck</p>
          <h1 className="text-3xl font-semibold tracking-tight">Saved listings</h1>
          <p className="mt-2 text-muted-foreground">Keep apartment options together while you decide.</p>
        </div>
        <Link
          to="/listings/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Plus className="size-4" aria-hidden />
          Add a listing
        </Link>
      </header>

      {status === 'loading' && (
        <div aria-busy="true" className="space-y-3">
          <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={<Search />}
          title="We couldn't load your listings"
          description="Check your connection and try again."
          action={{ label: 'Try again', onClick: () => navigate(0) }}
        />
      )}

      {status === 'ready' && records.length === 0 && (
        <EmptyState
          icon={<Search />}
          title="No listings yet"
          description="Save an apartment listing to start comparing your options."
          action={{ label: 'Add your first listing', onClick: () => navigate('/listings/new') }}
        />
      )}

      {status === 'ready' && records.length > 0 && (
        <ul className="grid gap-4">
          {records.map((listing) => (
            <li key={listing.recordId}>
              <Link
                to={`/listings/${listing.recordId}`}
                className="group flex items-center justify-between gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/40 sm:p-6"
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg font-medium text-foreground">
                    {listing.data.title}
                  </span>
                  {listing.data.address && (
                    <span className="mt-1 block truncate text-sm text-muted-foreground">
                      {listing.data.address}
                    </span>
                  )}
                  <span className="mt-2 block line-clamp-2 text-sm text-muted-foreground">
                    {listing.data.listingText}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  {listing.data.rentAmount != null && (
                    <span className="hidden text-sm font-medium text-foreground sm:inline">
                      {formatRent(listing.data.rentAmount)}
                      <span className="font-normal text-muted-foreground"> / mo</span>
                    </span>
                  )}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatRent(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}
