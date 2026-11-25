import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getAuthToken, useAuth, useQuery } from 'deepspace'
import { ArrowLeft, MapPin, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Button, ConfirmModal, EmptyState } from '@/components/ui'
import type { ListingFormData } from '@/components/ListingForm'
import ListingCollaboration from '@/components/ListingCollaboration'
import { callListingAction } from '@/lib/listing-actions'
import type { ListingSummary } from '@/lib/listing-summary'

const SUMMARY_FAILURE_MESSAGE =
  "Couldn't generate a summary right now. Please try again. If it keeps happening, check your DeepSpace credits."

export default function ListingDetailPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { records, status } = useQuery<ListingFormData>('listings')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [generatedSummary, setGeneratedSummary] = useState<ListingSummary | null>(null)
  const summaryRequestInFlight = useRef(false)

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

  const recordId = listing.recordId
  const isCreator = listing.createdBy === userId
  const summary = generatedSummary ?? listing.data.aiSummary ?? null

  async function summarizeListing() {
    if (!isCreator || summaryRequestInFlight.current) return

    summaryRequestInFlight.current = true
    setSummaryLoading(true)
    setSummaryError('')

    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Authentication is required')

      const response = await fetch('/api/actions/summarizeListing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingId: recordId }),
      })
      if (!response.ok) throw new Error('Summary request failed')

      const body: unknown = await response.json()
      if (!isRecord(body)) throw new Error('Invalid summary response')
      if (body.success !== true) {
        setSummaryError(
          body.error === 'LISTING_TOO_LONG'
            ? 'This listing is too long to summarize. Please shorten it and try again.'
            : SUMMARY_FAILURE_MESSAGE,
        )
        return
      }

      if (!isRecord(body.data) || !isListingSummary(body.data.summary)) {
        throw new Error('Invalid summary response')
      }
      setGeneratedSummary(body.data.summary)
    } catch {
      setSummaryError(SUMMARY_FAILURE_MESSAGE)
    } finally {
      summaryRequestInFlight.current = false
      setSummaryLoading(false)
    }
  }

  async function deleteListing() {
    if (!listing || !isCreator) return
    setDeleteError('')
    setDeleting(true)
    try {
      await callListingAction('deleteListing', { listingId: listing.recordId })
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

      {(summary || isCreator) && (
        <section
          aria-busy={summaryLoading}
          className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium">AI summary</h2>
            {isCreator && (
              <Button
                disabled={summaryLoading}
                loading={summaryLoading}
                onClick={summarizeListing}
              >
                <Sparkles className="size-4" aria-hidden />
                {summaryLoading ? 'Summarizing…' : summary ? 'Regenerate' : 'Summarize with AI'}
              </Button>
            )}
          </div>

          {summary && (
            <div className="space-y-5 text-sm">
              <SummaryGroup title="Costs">
                <SummaryRow label="Rent" value={summary.costs.rent} />
                <SummaryRow label="Deposit" value={summary.costs.deposit} />
                <SummaryRow label="Fees" value={summary.costs.fees} />
              </SummaryGroup>
              <SummaryGroup title="Requirements">
                <SummaryRow label="Income" value={summary.requirements.income} />
                <SummaryRow label="Lease length" value={summary.requirements.leaseLength} />
                <SummaryRow label="Pets" value={summary.requirements.pets} />
                <SummaryRow label="Other" value={summary.requirements.other} />
              </SummaryGroup>
              <SummaryList
                title="Warning signs"
                emptyText="No warning signs identified in the listing text."
                items={summary.warningSigns}
              />
              <SummaryList
                title="Questions to ask the landlord"
                emptyText="No follow-up questions suggested."
                items={summary.questionsToAskLandlord}
              />
            </div>
          )}

          {summaryError && (
            <p role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {summaryError}
            </p>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            AI summary, not legal advice. Double-check with the landlord.
          </p>
        </section>
      )}

      <ListingCollaboration
        listingId={recordId}
        creatorId={listing.createdBy}
        collaborators={listing.data.collaborators ?? []}
      />

      {isCreator && (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/listings/${listing.recordId}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Pencil className="size-4" aria-hidden />
            Edit listing
          </Link>
          <Button variant="destructive" disabled={deleting} onClick={() => setConfirmingDelete(true)}>
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

function SummaryGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-medium">{title}</h3>
      <dl className="grid gap-2 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function SummaryList({
  title,
  emptyText,
  items,
}: {
  title: string
  emptyText: string
  items: string[]
}) {
  return (
    <section>
      <h3 className="mb-2 font-medium">{title}</h3>
      {items.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
        </ul>
      ) : (
        <p className="text-muted-foreground">{emptyText}</p>
      )}
    </section>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isListingSummary(value: unknown): value is ListingSummary {
  if (!isRecord(value) || !isRecord(value.costs) || !isRecord(value.requirements)) return false

  return (
    typeof value.costs.rent === 'string' &&
    typeof value.costs.deposit === 'string' &&
    typeof value.costs.fees === 'string' &&
    typeof value.requirements.income === 'string' &&
    typeof value.requirements.leaseLength === 'string' &&
    typeof value.requirements.pets === 'string' &&
    typeof value.requirements.other === 'string' &&
    Array.isArray(value.warningSigns) &&
    value.warningSigns.every((item) => typeof item === 'string') &&
    Array.isArray(value.questionsToAskLandlord) &&
    value.questionsToAskLandlord.every((item) => typeof item === 'string')
  )
}
