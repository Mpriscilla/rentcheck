import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { ArrowLeft, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmModal, EmptyState } from '@/components/ui'
import type { ListingFormData } from '@/components/ListingForm'

export default function ListingDetailPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { records, status } = useQuery<ListingFormData>('listings')
  const { ready, removeConfirmed } = useMutations<ListingFormData>('listings')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (status === 'loading') {
    return <div aria-busy="true" className="mx-auto max-w-3xl px-6 py-14 text-muted-foreground">Loading listing…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <EmptyState
          title="We couldn't load this listing"
          description="Check your connection and try again."
          action={{ label: 'Try again', onClick: () => navigate(0) }}
        />
      </div>
    )
  }

  const listing = records.find((record) => record.recordId === listingId)
  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <EmptyState
          title="Listing not found"
          description="This listing may have been removed or you may not have access to it."
          action={{ label: 'Back to listings', onClick: () => navigate('/listings') }}
        />
      </div>
    )
  }

  const isCreator = listing.createdBy === userId

  async function deleteListing() {
    if (!listing || !isCreator) return
    setDeleteError('')
    setDeleting(true)
    try {
      await removeConfirmed(listing.recordId)
      navigate('/listings')
    } catch (writeError) {
      setDeleteError(
        writeError instanceof Error
          ? `We couldn't delete this listing. ${writeError.message}`
          : "We couldn't delete this listing. Please check your connection and try again.",
      )
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link to="/listings" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        All listings
      </Link>

      <header className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary">Apartment listing</p>
        <h1 className="text-3xl font-semibold tracking-tight">{listing.data.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {listing.data.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {listing.data.address}
            </span>
          )}
          {listing.data.rentAmount != null && (
            <span className="font-medium text-foreground">
              {formatRent(listing.data.rentAmount)} <span className="font-normal text-muted-foreground">/ month</span>
            </span>
          )}
        </div>
      </header>

      {deleteError && (
        <p role="alert" className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {deleteError}
        </p>
      )}

      <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="mb-4 text-lg font-medium">Original listing</h2>
        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
          {listing.data.listingText}
        </p>
      </section>

      {isCreator && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/listings/${listing.recordId}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Pencil className="size-4" aria-hidden />
            Edit listing
          </Link>
          <Button variant="destructive" disabled={!ready} onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete listing
          </Button>
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={deleteListing}
        title="Delete this listing?"
        description="This will permanently remove the saved listing."
        confirmText="Delete listing"
        loading={deleting}
      />
    </article>
  )
}

function formatRent(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}
