import type { CollectionSchema } from 'deepspace/schema'

export const listingsSchema: CollectionSchema = {
  name: 'listings',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain', required: true },
    { name: 'listingText', storage: 'text', interpretation: 'plain', required: true },
    { name: 'rentAmount', storage: 'number', interpretation: { kind: 'currency', symbol: '$', decimals: 2 } },
    { name: 'address', storage: 'text', interpretation: 'plain' },
    { name: 'collaborators', storage: 'text', interpretation: { kind: 'json' }, required: true, default: [] },
    { name: 'aiSummary', storage: 'text', interpretation: { kind: 'json' } },
  ],
  collaboratorsField: 'collaborators',
  permissions: {
    '*': { read: false, create: false, update: false, delete: false },
    viewer: { read: false, create: false, update: false, delete: false },
    member: {
      read: 'shared',
      create: true,
      update: 'own',
      delete: false,
      writableFields: ['title', 'listingText', 'rentAmount', 'address', 'aiSummary'],
    },
    admin: {
      read: 'shared',
      create: true,
      update: 'own',
      delete: false,
      writableFields: ['title', 'listingText', 'rentAmount', 'address', 'aiSummary'],
    },
  },
}
