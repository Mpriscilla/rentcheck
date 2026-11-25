/**
 * Collection Schemas
 *
 * All collections with columns and RBAC permissions.
 * Single source of truth — imported by both worker and frontend.
 *
 * Add schemas by creating a file in src/schemas/ and importing it here.
 */

import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { listingsSchema } from './schemas/listings-schema'
import { listingInvitesSchema } from './schemas/listing-invites-schema'
import { listingVotesSchema } from './schemas/listing-votes-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  listingsSchema,
  listingInvitesSchema,
  listingVotesSchema,
]
