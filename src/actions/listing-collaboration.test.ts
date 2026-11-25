import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { listingCollaborationActions } from './listing-collaboration'

const listingRecord = {
  recordId: 'listing-1',
  createdBy: 'creator',
  data: { collaborators: ['roommate'] },
}

function makeContext(userId = 'creator') {
  const get = vi.fn().mockImplementation(async (collection: string, recordId: string) => {
    if (collection === 'listings' && recordId === 'listing-1') {
      return { success: true, data: { record: listingRecord } }
    }
    return { success: false, error: 'Record not found' }
  })
  const query = vi.fn().mockResolvedValue({ success: true, data: { records: [], count: 0 } })
  const create = vi.fn().mockResolvedValue({ success: true, data: { recordId: 'vote-1' } })
  const update = vi.fn().mockResolvedValue({ success: true, data: { recordId: 'listing-1' } })
  const remove = vi.fn().mockResolvedValue({ success: true, data: { recordId: 'vote-1' } })
  const tools = {
    create,
    update,
    remove,
    deleteWhere: vi.fn(),
    get,
    query,
    integration: vi.fn(),
    registerUser: vi.fn(),
  } satisfies ActionTools
  const context = {
    userId,
    params: { listingId: 'listing-1' } as Record<string, unknown>,
    tools,
    env: {} as Env,
    callerJwt: 'test-jwt',
  }
  return { context, tools, get, query, create, update, remove }
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

describe('listing collaboration server actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not let a collaborator create or revoke invite links', async () => {
    const { context, create, update } = makeContext('roommate')

    const createResult = await listingCollaborationActions.createListingInvite(context)
    const revokeResult = await listingCollaborationActions.revokeListingInvite(context)

    expect(createResult).toEqual({ success: false, error: 'FORBIDDEN' })
    expect(revokeResult).toEqual({ success: false, error: 'FORBIDDEN' })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('creates a high-entropy invite while storing only its hash', async () => {
    const { context, create } = makeContext()

    const result = await listingCollaborationActions.createListingInvite(context)

    expect(result.success).toBe(true)
    if (!result.success || !isRecord(result.data) || typeof result.data.token !== 'string') {
      throw new Error('Expected invite token')
    }
    const token = result.data.token
    const [collection, inviteData, recordId] = create.mock.calls[0]
    expect(collection).toBe('listing_invites')
    expect(recordId).toBe('listing-1')
    expect(inviteData).toMatchObject({ listingId: 'listing-1', active: true })
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(inviteData.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(inviteData.tokenHash).not.toBe(token)
  })

  it('does not add the creator or add an existing collaborator twice when an invite is opened again', async () => {
    const creator = makeContext('creator')
    const creatorToken = 'b'.repeat(64)
    creator.query.mockResolvedValueOnce({
      success: true,
      data: {
        records: [{
          recordId: 'listing-1',
          data: { listingId: 'listing-1', tokenHash: await hashToken(creatorToken), active: true },
        }],
        count: 1,
      },
    })
    creator.context.params = { token: creatorToken }
    const creatorResult = await listingCollaborationActions.acceptListingInvite(creator.context)
    expect(creatorResult).toEqual({ success: true, data: { listingId: 'listing-1' } })
    expect(creator.update).not.toHaveBeenCalled()

    const roommate = makeContext('roommate')
    const roommateToken = 'd'.repeat(64)
    roommate.query
      .mockResolvedValueOnce({
      success: true,
      data: {
        records: [{
          recordId: 'listing-1',
          data: { listingId: 'listing-1', tokenHash: await hashToken(roommateToken), active: true },
        }],
        count: 1,
      },
    })
      .mockResolvedValueOnce({ success: true, data: { records: [], count: 0 } })
    roommate.context.params = { token: roommateToken }
    const roommateResult = await listingCollaborationActions.acceptListingInvite(roommate.context)
    expect(roommateResult).toEqual({ success: true, data: { listingId: 'listing-1' } })
    expect(roommate.update).not.toHaveBeenCalled()
  })

  it('accepts an invite when DeepSpace returns the stored boolean as an integer', async () => {
    const { context, query, update } = makeContext('stranger')
    const token = 'f'.repeat(64)
    query
      .mockResolvedValueOnce({
        success: true,
        data: {
          records: [{
            recordId: 'listing-1',
            data: { listingId: 'listing-1', tokenHash: await hashToken(token), active: 1 },
          }],
          count: 1,
        },
      })
      .mockResolvedValueOnce({ success: true, data: { records: [], count: 0 } })
    context.params = { token }

    const result = await listingCollaborationActions.acceptListingInvite(context)

    expect(result).toEqual({ success: true, data: { listingId: 'listing-1' } })
    expect(update).toHaveBeenCalledWith('listings', 'listing-1', { collaborators: ['roommate', 'stranger'] })
  })

  it('rejects a revoked invite before looking up or changing a listing', async () => {
    const { context, get, query, update } = makeContext('stranger')
    const token = 'e'.repeat(64)
    query.mockResolvedValue({
      success: true,
      data: {
        records: [{
          recordId: 'listing-1',
          data: { listingId: 'listing-1', tokenHash: await hashToken(token), active: false },
        }],
        count: 1,
      },
    })
    context.params = { token }

    const result = await listingCollaborationActions.acceptListingInvite(context)

    expect(result).toEqual({ success: false, error: 'INVITE_NOT_FOUND' })
    expect(get).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('allows a collaborator to vote and change that vote without creating a second vote', async () => {
    const { context, query, create, update } = makeContext('roommate')
    const existingVote = {
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
    query.mockResolvedValue({
      success: true,
      data: { records: [existingVote], count: 1 },
    })
    context.params = { listingId: 'listing-1', choice: 'Reject', comment: 'Too noisy' }

    const result = await listingCollaborationActions.castListingVote(context)

    expect(result).toEqual({ success: true, data: { choice: 'Reject', comment: 'Too noisy' } })
    expect(update).toHaveBeenCalledWith('listing_votes', existingVote.recordId, {
      listingId: 'listing-1',
      userId: 'roommate',
      choice: 'Reject',
      comment: 'Too noisy',
      collaborators: ['creator', 'roommate'],
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('creates a participant-scoped vote with a stable per-user record id', async () => {
    const { context, query, create } = makeContext('roommate')
    query.mockResolvedValue({ success: true, data: { records: [], count: 0 } })
    context.params = { listingId: 'listing-1', choice: 'Needs questions', comment: 'Ask about parking' }

    const result = await listingCollaborationActions.castListingVote(context)

    expect(result).toEqual({
      success: true,
      data: { choice: 'Needs questions', comment: 'Ask about parking' },
    })
    expect(create).toHaveBeenCalledWith(
      'listing_votes',
      {
        listingId: 'listing-1',
        userId: 'roommate',
        choice: 'Needs questions',
        comment: 'Ask about parking',
        collaborators: ['creator', 'roommate'],
      },
      'listing-1:roommate',
    )
  })

  it('removes a collaborator vote as part of revoking their access', async () => {
    const { context, query, remove, update } = makeContext()
    query.mockResolvedValue({
      success: true,
      data: {
        records: [{
          recordId: 'listing-1:roommate',
          createdBy: 'roommate',
          data: {
            listingId: 'listing-1',
            userId: 'roommate',
            choice: 'Reject',
            comment: '',
            collaborators: ['creator', 'roommate'],
          },
        }],
        count: 1,
      },
    })
    context.params = { listingId: 'listing-1', collaboratorId: 'roommate' }

    const result = await listingCollaborationActions.removeListingCollaborator(context)

    expect(result).toEqual({ success: true, data: { removed: true } })
    expect(remove).toHaveBeenCalledWith('listing_votes', 'listing-1:roommate')
    expect(update).toHaveBeenCalledWith('listings', 'listing-1', { collaborators: [] })
  })

  it('rejects vote attempts from people who are not listing participants', async () => {
    const { context, create, update } = makeContext('stranger')
    context.params = { listingId: 'listing-1', choice: 'Good fit' }

    const result = await listingCollaborationActions.castListingVote(context)

    expect(result).toEqual({ success: false, error: 'FORBIDDEN' })
    expect(create).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('does not let a collaborator delete the listing', async () => {
    const { context, remove } = makeContext('roommate')
    context.params = { listingId: 'listing-1' }

    const result = await listingCollaborationActions.deleteListing(context)

    expect(result).toEqual({ success: false, error: 'FORBIDDEN' })
    expect(remove).not.toHaveBeenCalled()
  })
})
