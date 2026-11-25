import { describe, expect, it } from 'vitest'
import { validateListingFields } from './listings'

describe('validateListingFields', () => {
  it('requires a title and listing text', () => {
    expect(validateListingFields('  ', 'Listing details', '')).toBe('Add a title for this listing.')
    expect(validateListingFields('Apartment', '  ', '')).toBe('Paste the listing text to continue.')
  })

  it('allows rent to be omitted and requires entered rent to be positive', () => {
    expect(validateListingFields('Apartment', 'Listing details', '')).toBeNull()
    expect(validateListingFields('Apartment', 'Listing details', '0')).toBe('Rent must be a positive number.')
    expect(validateListingFields('Apartment', 'Listing details', 'not a number')).toBe('Rent must be a positive number.')
    expect(validateListingFields('Apartment', 'Listing details', '1.25')).toBeNull()
  })
})
