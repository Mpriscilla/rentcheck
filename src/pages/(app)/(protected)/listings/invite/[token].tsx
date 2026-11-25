import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from 'deepspace'
import { EmptyState } from '@/components/ui'
import { callListingAction } from '@/lib/listing-actions'

export default function ListingInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const attemptedToken = useRef('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || attemptedToken.current === token) return
    attemptedToken.current = token
    setError(false)
    callListingAction<{ listingId: string }>('acceptListingInvite', { token })
      .then(({ listingId }) => navigate(`/listings/${listingId}`, { replace: true }))
      .catch(() => setError(true))
  }, [isLoaded, isSignedIn, navigate, token])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <EmptyState
          title="Listing not found"
          description="This invite may be invalid, expired, or turned off."
          action={{ label: 'Back to listings', onClick: () => navigate('/listings') }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 text-center">
      <p aria-busy="true" className="text-muted-foreground">
        {isSignedIn ? 'Joining the listing…' : 'Sign in to join this listing.'}
      </p>
      {!isSignedIn && <Link className="mt-4 inline-block text-sm underline" to="/listings">Back to listings</Link>}
    </div>
  )
}
