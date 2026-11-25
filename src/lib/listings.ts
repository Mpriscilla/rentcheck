export function validateListingFields(
  title: string,
  listingText: string,
  rentAmount: string,
): string | null {
  if (!title.trim()) return 'Add a title for this listing.'
  if (!listingText.trim()) return 'Paste the listing text to continue.'

  if (rentAmount.trim()) {
    const rent = Number(rentAmount)
    if (!Number.isFinite(rent) || rent <= 0) {
      return 'Rent must be a positive number.'
    }
  }

  return null
}
