import type { CollectionSchema } from 'deepspace/schema'

export const listingInvitesSchema: CollectionSchema = {
  name: 'listing_invites',
  columns: [
    { name: 'listingId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'tokenHash', storage: 'text', interpretation: 'plain', required: true },
    { name: 'active', storage: 'number', interpretation: { kind: 'boolean' }, required: true },
  ],
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: false, create: false, update: false, delete: false },
    admin: { read: false, create: false, update: false, delete: false },
  },
}
