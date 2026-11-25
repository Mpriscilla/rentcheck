import { useNavigate, useParams } from 'react-router-dom'
import { useAuth, useQuery } from 'deepspace'
import { EmptyState } from '@/components/ui'
import ListingForm, { type ListingFormData } from '@/components/ListingForm'

export default function EditListingPage() {
  const { listingId } = useParams<{ listingId: string }>()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { records, status } = useQuery<ListingFormData>('listings')

  if (status === 'loading') {
    return (
      <div aria-busy="true" className="mx-auto max-w-3xl px-6 py-14 text-muted-foreground">
        Loading listing…
      </div>
    )
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
        <EmptyState title="Listing not found" description="This listing may have been removed or you may not have access to it." />
      </div>
    )
  }

  if (listing.createdBy !== userId) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <EmptyState
          title="This listing is read-only"
          description="Only the person who added this listing can make changes."
        />
      </div>
    )
  }

  return <ListingForm key={listing.recordId} listingId={listing.recordId} initialData={listing.data} />
}
