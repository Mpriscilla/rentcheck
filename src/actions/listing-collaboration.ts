import type { ActionHandler, ActionTools } from 'deepspace/worker'
import { RECORD_NOT_FOUND } from 'deepspace/worker'
import type { Env } from '../../worker.js'

const INVITE_NOT_FOUND = 'INVITE_NOT_FOUND'
const LISTING_NOT_FOUND = 'LISTING_NOT_FOUND'
const FORBIDDEN = 'FORBIDDEN'
const WRITE_FAILED = 'COLLABORATION_WRITE_FAILED'
const MAX_COMMENT_LENGTH = 280
const VOTE_CHOICES = ['Good fit', 'Needs questions', 'Reject'] as const

type VoteChoice = (typeof VOTE_CHOICES)[number]

interface ListingData extends Record<string, unknown> {
  collaborators?: unknown
}

interface InviteData extends Record<string, unknown> {
  listingId?: unknown
  tokenHash?: unknown
  active?: unknown
}

interface VoteData extends Record<string, unknown> {
  listingId?: unknown
  userId?: unknown
  choice?: unknown
  comment?: unknown
  collaborators?: unknown
}

interface ListingRecord {
  recordId: string
  createdBy: string
  data: ListingData
}

type ListingLookup =
  | { kind: 'found'; listing: ListingRecord }
  | { kind: 'missing' }
  | { kind: 'error' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function userIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

function participants(listing: ListingRecord): string[] {
  return [...new Set([listing.createdBy, ...userIds(listing.data.collaborators)])]
}

async function getListing(tools: ActionTools, listingId: string): Promise<ListingLookup> {
  const result = await tools.get<ListingData>('listings', listingId)
  if (!result.success) {
    return result.error === RECORD_NOT_FOUND ? { kind: 'missing' } : { kind: 'error' }
  }

  const record = result.data.record
  if (typeof record.createdBy !== 'string' || !isRecord(record.data)) return { kind: 'error' }
  return {
    kind: 'found',
    listing: {
      recordId: record.recordId,
      createdBy: record.createdBy,
      data: record.data,
    },
  }
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256
}

function isInviteActive(value: unknown): boolean {
  return value === true || value === 1
}

function isVoteChoice(value: unknown): value is VoteChoice {
  return typeof value === 'string' && VOTE_CHOICES.some((choice) => choice === value)
}

function makeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function syncVoteAccess(
  tools: ActionTools,
  listingId: string,
  allowedUsers: string[],
  removeUserId?: string,
): Promise<boolean> {
  const result = await tools.query<VoteData>('listing_votes', {
    where: { listingId },
    limit: 500,
  })
  if (!result.success) return false

  for (const vote of result.data.records) {
    if (removeUserId && vote.data.userId === removeUserId) {
      const removed = await tools.remove('listing_votes', vote.recordId)
      if (!removed.success) return false
      continue
    }

    const current = userIds(vote.data.collaborators)
    if (current.length === allowedUsers.length && current.every((id) => allowedUsers.includes(id))) {
      continue
    }

    const updated = await tools.update('listing_votes', vote.recordId, {
      collaborators: allowedUsers,
    })
    if (!updated.success) return false
  }

  return true
}

const getListingInviteStatus: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  if (!validId(listingId)) return { success: false, error: LISTING_NOT_FOUND }
  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing' || lookup.listing.createdBy !== userId) {
    return { success: false, error: LISTING_NOT_FOUND }
  }

  const invite = await tools.get<InviteData>('listing_invites', listingId)
  if (!invite.success && invite.error !== RECORD_NOT_FOUND) {
    return { success: false, error: WRITE_FAILED }
  }
  const active = invite.success && isInviteActive(invite.data.record.data.active)
  return { success: true, data: { active } }
}

const createListingInvite: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  if (!validId(listingId)) return { success: false, error: LISTING_NOT_FOUND }
  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: LISTING_NOT_FOUND }
  const listing = lookup.listing
  if (listing.createdBy !== userId) return { success: false, error: FORBIDDEN }

  const token = makeToken()
  const tokenHash = await hashToken(token)
  const existing = await tools.get<InviteData>('listing_invites', listingId)
  if (!existing.success && existing.error !== RECORD_NOT_FOUND) {
    return { success: false, error: WRITE_FAILED }
  }
  const data = { listingId, tokenHash, active: true }
  const saved = existing.success
    ? await tools.update('listing_invites', listingId, data)
    : await tools.create('listing_invites', data, listingId)
  if (!saved.success) return { success: false, error: WRITE_FAILED }

  return { success: true, data: { token } }
}

const revokeListingInvite: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  if (!validId(listingId)) return { success: false, error: LISTING_NOT_FOUND }
  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: LISTING_NOT_FOUND }
  const listing = lookup.listing
  if (listing.createdBy !== userId) return { success: false, error: FORBIDDEN }

  const invite = await tools.get<InviteData>('listing_invites', listingId)
  if (!invite.success) {
    if (invite.error === RECORD_NOT_FOUND) return { success: true, data: { active: false } }
    return { success: false, error: WRITE_FAILED }
  }

  const saved = await tools.update('listing_invites', listingId, { active: false, tokenHash: '' })
  if (!saved.success) return { success: false, error: WRITE_FAILED }
  return { success: true, data: { active: false } }
}

const acceptListingInvite: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const token = params.token
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) {
    return { success: false, error: INVITE_NOT_FOUND }
  }

  const tokenHash = await hashToken(token)
  const matches = await tools.query<InviteData>('listing_invites', {
    where: { tokenHash },
    limit: 1,
  })
  if (!matches.success) return { success: false, error: WRITE_FAILED }
  const invite = matches.data.records[0]
  if (
    !invite ||
    invite.data.tokenHash !== tokenHash ||
    !isInviteActive(invite.data.active) ||
    !validId(invite.data.listingId)
  ) {
    return { success: false, error: INVITE_NOT_FOUND }
  }

  const lookup = await getListing(tools, invite.data.listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: INVITE_NOT_FOUND }
  const listing = lookup.listing
  if (listing.createdBy === userId) {
    return { success: true, data: { listingId: listing.recordId } }
  }

  const collaborators = userIds(listing.data.collaborators)
  const nextCollaborators = collaborators.includes(userId)
    ? collaborators
    : [...collaborators, userId]

  if (nextCollaborators.length !== collaborators.length) {
    const updated = await tools.update('listings', listing.recordId, {
      collaborators: nextCollaborators,
    })
    if (!updated.success) return { success: false, error: WRITE_FAILED }
  }

  if (!(await syncVoteAccess(tools, listing.recordId, [listing.createdBy, ...nextCollaborators]))) {
    return { success: false, error: WRITE_FAILED }
  }

  return { success: true, data: { listingId: listing.recordId } }
}

const removeListingCollaborator: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  const collaboratorId = params.collaboratorId
  if (!validId(listingId) || !validId(collaboratorId)) {
    return { success: false, error: LISTING_NOT_FOUND }
  }

  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: LISTING_NOT_FOUND }
  const listing = lookup.listing
  if (listing.createdBy !== userId) return { success: false, error: FORBIDDEN }
  const collaborators = userIds(listing.data.collaborators)
  if (collaboratorId === listing.createdBy || !collaborators.includes(collaboratorId)) {
    return { success: true, data: { removed: false } }
  }

  const nextCollaborators = collaborators.filter((id) => id !== collaboratorId)
  const nextParticipants = [listing.createdBy, ...nextCollaborators]
  if (!(await syncVoteAccess(tools, listing.recordId, nextParticipants, collaboratorId))) {
    return { success: false, error: WRITE_FAILED }
  }

  const updated = await tools.update('listings', listing.recordId, {
    collaborators: nextCollaborators,
  })
  if (!updated.success) return { success: false, error: WRITE_FAILED }
  return { success: true, data: { removed: true } }
}

const deleteListing: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  if (!validId(listingId)) return { success: false, error: LISTING_NOT_FOUND }
  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: LISTING_NOT_FOUND }
  const listing = lookup.listing
  if (listing.createdBy !== userId) return { success: false, error: FORBIDDEN }

  while (true) {
    const removedVotes = await tools.deleteWhere('listing_votes', { listingId }, 500)
    if (!removedVotes.success) return { success: false, error: WRITE_FAILED }
    if (removedVotes.data.deleted < 500) break
  }

  const invite = await tools.get<InviteData>('listing_invites', listingId)
  if (invite.success) {
    const removedInvite = await tools.remove('listing_invites', listingId)
    if (!removedInvite.success) return { success: false, error: WRITE_FAILED }
  } else if (invite.error !== RECORD_NOT_FOUND) {
    return { success: false, error: WRITE_FAILED }
  }

  const removedListing = await tools.remove('listings', listingId)
  if (!removedListing.success) return { success: false, error: WRITE_FAILED }
  return { success: true, data: { deleted: true } }
}

const castListingVote: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const listingId = params.listingId
  const choice = params.choice
  const rawComment = params.comment
  if (!validId(listingId)) return { success: false, error: LISTING_NOT_FOUND }
  if (!isVoteChoice(choice)) return { success: false, error: 'INVALID_VOTE' }
  if (rawComment !== undefined && rawComment !== null && typeof rawComment !== 'string') {
    return { success: false, error: 'INVALID_COMMENT' }
  }
  const comment = typeof rawComment === 'string' ? rawComment.trim() : ''
  if (comment.length > MAX_COMMENT_LENGTH) {
    return { success: false, error: 'COMMENT_TOO_LONG' }
  }

  const lookup = await getListing(tools, listingId)
  if (lookup.kind === 'error') return { success: false, error: WRITE_FAILED }
  if (lookup.kind === 'missing') return { success: false, error: LISTING_NOT_FOUND }
  const listing = lookup.listing
  const allowedUsers = participants(listing)
  if (!allowedUsers.includes(userId)) return { success: false, error: FORBIDDEN }

  const existing = await tools.query<VoteData>('listing_votes', {
    where: { listingId, userId },
    limit: 2,
  })
  if (!existing.success) return { success: false, error: WRITE_FAILED }
  if (existing.data.records.length > 1) return { success: false, error: WRITE_FAILED }

  const voteData = {
    listingId,
    userId,
    choice,
    comment,
    collaborators: allowedUsers,
  }
  const currentVote = existing.data.records[0]
  const saved = currentVote
    ? await tools.update('listing_votes', currentVote.recordId, voteData)
    : await tools.create(
        'listing_votes',
        voteData,
        `${encodeURIComponent(listingId)}:${encodeURIComponent(userId)}`,
      )
  if (!saved.success) return { success: false, error: WRITE_FAILED }
  return { success: true, data: { choice, comment } }
}

export const listingCollaborationActions: Record<string, ActionHandler<Env>> = {
  getListingInviteStatus,
  createListingInvite,
  revokeListingInvite,
  acceptListingInvite,
  removeListingCollaborator,
  deleteListing,
  castListingVote,
}
