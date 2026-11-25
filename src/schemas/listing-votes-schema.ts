import type { CollectionSchema } from 'deepspace/schema'

export const listingVotesSchema: CollectionSchema = {
  name: 'listing_votes',
  columns: [
    { name: 'listingId', storage: 'text', interpretation: 'plain', required: true, immutable: true },
    { name: 'userId', storage: 'text', interpretation: 'plain', required: true, userBound: true, immutable: true },
    {
      name: 'choice',
      storage: 'text',
      interpretation: { kind: 'select', options: ['Good fit', 'Needs questions', 'Reject'] },
      required: true,
    },
    { name: 'comment', storage: 'text', interpretation: 'plain', required: true },
    { name: 'collaborators', storage: 'text', interpretation: { kind: 'json' }, required: true },
  ],
  uniqueOn: ['listingId', 'userId'],
  collaboratorsField: 'collaborators',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: { read: 'shared', create: false, update: false, delete: false },
    admin: { read: 'shared', create: false, update: false, delete: false },
  },
}
