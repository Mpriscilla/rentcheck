import { describe, expect, it } from 'vitest'
import { canCreate, canDelete, canRead, canUpdate, checkFieldPermissions } from 'deepspace/worker'
import { listingInvitesSchema } from './listing-invites-schema'
import { listingVotesSchema } from './listing-votes-schema'
import { listingsSchema } from './listings-schema'

const listing = {
  recordId: 'listing-1',
  createdBy: 'creator',
  data: { collaborators: ['roommate'] },
}

const vote = {
  recordId: 'listing-1:roommate',
  createdBy: 'roommate',
  data: {
    listingId: 'listing-1',
    userId: 'roommate',
    choice: 'Good fit',
    comment: '',
    collaborators: ['creator', 'roommate'],
  },
}

describe('listing collaboration permissions', () => {
  it('keeps listings and votes unreadable to strangers while allowing collaborators to read', () => {
    expect(canRead(listingsSchema, 'member', listing, 'stranger')).toBe(false)
    expect(canRead(listingVotesSchema, 'member', vote, 'stranger')).toBe(false)
    expect(canRead(listingsSchema, 'member', listing, 'roommate')).toBe(true)
    expect(canRead(listingVotesSchema, 'member', vote, 'roommate')).toBe(true)
  })

  it('keeps collaborator writes to listings and votes denied by the server', () => {
    expect(canUpdate(listingsSchema, 'member', listing, 'roommate')).toBe(false)
    expect(canDelete(listingsSchema, 'member', listing, 'roommate')).toBe(false)
    expect(canCreate(listingVotesSchema, 'member')).toBe(false)
    expect(canUpdate(listingVotesSchema, 'member', vote, 'roommate')).toBe(false)
    expect(canDelete(listingVotesSchema, 'member', vote, 'roommate')).toBe(false)
    expect(checkFieldPermissions(listingsSchema, 'member', { collaborators: ['stranger'] })).toBeTruthy()
    expect(canCreate(listingInvitesSchema, 'member')).toBe(false)
    expect(listingVotesSchema.uniqueOn).toEqual(['listingId', 'userId'])
  })

  it('allows votes without a comment', () => {
    const commentColumn = listingVotesSchema.columns.find((column) => column.name === 'comment')
    expect(commentColumn?.required).not.toBe(true)
  })
})
