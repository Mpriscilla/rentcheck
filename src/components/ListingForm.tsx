import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import { ArrowLeft } from 'lucide-react'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { validateListingFields } from '@/lib/listings'
import type { ListingSummary } from '@/lib/listing-summary'

export interface ListingFormData {
  title: string
  listingText: string
  rentAmount?: number | null
  address?: string
  collaborators?: string[]
  aiSummary?: ListingSummary | null
}

interface ListingFormProps {
  initialData?: ListingFormData
  listingId?: string
}

export default function ListingForm({ initialData, listingId }: ListingFormProps) {
  const navigate = useNavigate()
  const { ready, createConfirmed, putConfirmed } = useMutations<ListingFormData>('listings')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [listingText, setListingText] = useState(initialData?.listingText ?? '')
  const [rentAmount, setRentAmount] = useState(
    initialData?.rentAmount == null ? '' : String(initialData.rentAmount),
  )
  const [address, setAddress] = useState(initialData?.address ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEditing = listingId !== undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const validationError = validateListingFields(title, listingText, rentAmount)
    if (validationError) {
      setError(validationError)
      return
    }

    const data: ListingFormData = {
      title: title.trim(),
      listingText: listingText.trim(),
    }
    if (listingId) {
      data.rentAmount = rentAmount.trim() ? Number(rentAmount) : null
      data.address = address.trim()
      data.aiSummary = null
    } else {
      if (rentAmount.trim()) data.rentAmount = Number(rentAmount)
      if (address.trim()) data.address = address.trim()
    }

    setSaving(true)
    try {
      if (listingId) {
        await putConfirmed(listingId, data)
        navigate(`/listings/${listingId}`)
      } else {
        const id = await createConfirmed(data)
        navigate(`/listings/${id}`)
      }
    } catch (writeError) {
      setError(
        writeError instanceof Error
          ? `We couldn't save this listing. ${writeError.message}`
            : "We couldn't save this listing. Please check your connection and try again.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link
        to={isEditing && listingId ? `/listings/${listingId}` : '/listings'}
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {isEditing ? 'Back to listing' : 'All listings'}
      </Link>

      <header className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-primary">RentCheck</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isEditing ? 'Edit listing' : 'Add a listing'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Save the details so you and your roommates can review them before signing.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="space-y-2">
          <Label htmlFor="listing-title">Title <span className="text-destructive">*</span></Label>
          <Input
            id="listing-title"
            autoFocus
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Cedar Street 2-bedroom"
            aria-invalid={!!error && !title.trim() || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listing-text">Listing text <span className="text-destructive">*</span></Label>
          <Textarea
            id="listing-text"
            required
            value={listingText}
            onChange={(event) => setListingText(event.target.value)}
            placeholder="Paste the apartment listing here"
            className="min-h-56 resize-y"
            aria-invalid={!!error && !listingText.trim() || undefined}
          />
          <p className="text-xs text-muted-foreground">
            Keep the original description, including details you want to discuss together.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="listing-rent">Monthly rent <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="listing-rent"
                type="number"
                min="0"
                step="any"
                value={rentAmount}
                onChange={(event) => setRentAmount(event.target.value)}
                placeholder="2400"
                className="pl-7"
                aria-invalid={error.includes('Rent') || undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-address">Address <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              id="listing-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, city, state"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" onClick={() => navigate('/listings')}>
            Cancel
          </Button>
          <Button type="submit" disabled={!ready || saving} loading={saving}>
            {isEditing ? 'Save changes' : 'Save listing'}
          </Button>
        </div>
        {!ready && <p className="text-right text-xs text-muted-foreground">Connecting securely…</p>}
      </form>
    </div>
  )
}
