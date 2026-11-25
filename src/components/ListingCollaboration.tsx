import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth, useQuery, useUserLookup } from 'deepspace'
import { Button, Textarea } from '@/components/ui'
import { callListingAction } from '@/lib/listing-actions'

const VOTE_CHOICES = ['Good fit', 'Needs questions', 'Reject'] as const

type VoteChoice = (typeof VOTE_CHOICES)[number]

function isVoteChoice(value: string): value is VoteChoice {
  return VOTE_CHOICES.some((choice) => choice === value)
}

interface ListingVote {
  listingId: string
  userId: string
  choice: VoteChoice
  comment?: string
  collaborators: string[]
}

interface ListingCollaborationProps {
  listingId: string
  creatorId: string
  collaborators: string[]
}

export default function ListingCollaboration({
  listingId,
  creatorId,
  collaborators,
}: ListingCollaborationProps) {
  const { userId } = useAuth()
  const { getName } = useUserLookup()
  const { records: votes, status } = useQuery<ListingVote>('listing_votes', {
    where: { listingId },
  })
  const [choice, setChoice] = useState<VoteChoice>('Good fit')
  const [comment, setComment] = useState('')
  const [savingVote, setSavingVote] = useState(false)
  const [voteError, setVoteError] = useState('')
  const [inviteActive, setInviteActive] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [removingId, setRemovingId] = useState('')
  const [collaboratorError, setCollaboratorError] = useState('')
  const copyResetTimeout = useRef<number | null>(null)
  const isCreator = userId === creatorId
  const participants = useMemo(
    () => [...new Set([creatorId, ...collaborators])],
    [creatorId, collaborators],
  )
  const currentVote = votes.find((vote) => vote.data.userId === userId)

  useEffect(() => {
    if (!isCreator) return
    let active = true
    callListingAction<{ active: boolean }>('getListingInviteStatus', { listingId })
      .then((result) => {
        if (active) setInviteActive(result.active)
      })
      .catch(() => {
        if (active) setInviteError('Invite status is unavailable. Try again.')
      })

    return () => {
      active = false
    }
  }, [isCreator, listingId])

  useEffect(() => {
    if (!currentVote) return
    setChoice(currentVote.data.choice)
    setComment(currentVote.data.comment ?? '')
  }, [currentVote?.data.choice, currentVote?.data.comment])

  useEffect(() => () => {
    if (copyResetTimeout.current !== null) window.clearTimeout(copyResetTimeout.current)
  }, [])

  const decision = votes.some((vote) => vote.data.choice === 'Reject')
    ? 'Pass'
    : participants.length > 0 &&
        participants.every((participantId) =>
          votes.some((vote) => vote.data.userId === participantId && vote.data.choice === 'Good fit'),
        )
      ? 'Go for it'
      : 'Ask the landlord first'

  async function submitVote() {
    setSavingVote(true)
    setVoteError('')
    try {
      await callListingAction('castListingVote', { listingId, choice, comment })
    } catch {
      setVoteError("Couldn't save your vote. Try again.")
    } finally {
      setSavingVote(false)
    }
  }

  async function createInvite() {
    setInviteLoading(true)
    setInviteError('')
    try {
      const { token } = await callListingAction<{ token: string }>('createListingInvite', { listingId })
      setInviteUrl(`${window.location.origin}/listings/invite/${token}`)
      setInviteCopied(false)
      setInviteActive(true)
    } catch {
      setInviteError('The invite link could not be created. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function revokeInvite() {
    setInviteLoading(true)
    setInviteError('')
    try {
      await callListingAction('revokeListingInvite', { listingId })
      setInviteActive(false)
      setInviteUrl('')
      setInviteCopied(false)
    } catch {
      setInviteError('The invite link could not be turned off. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setRemovingId(collaboratorId)
    setCollaboratorError('')
    try {
      await callListingAction('removeListingCollaborator', { listingId, collaboratorId })
    } catch {
      setCollaboratorError('The collaborator could not be removed. Please try again.')
    } finally {
      setRemovingId('')
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteError('')
      setInviteCopied(true)
      if (copyResetTimeout.current !== null) window.clearTimeout(copyResetTimeout.current)
      copyResetTimeout.current = window.setTimeout(() => {
        setInviteCopied(false)
        copyResetTimeout.current = null
      }, 2000)
    } catch {
      setInviteError('Copy was unavailable. Select and copy the invite link.')
    }
  }

  return (
    <section
      data-testid="listing-collaboration"
      className="mt-6 space-y-6 rounded-xl border border-border bg-card p-6 sm:p-8"
    >
      <div>
        <h2 className="text-lg font-medium">Roommates</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {participants.map((participantId) => (
            <li key={participantId} className="flex items-center justify-between gap-3">
              <span>
                {getName(participantId) ?? 'Roommate'}
                {participantId === creatorId ? ' (creator)' : ''}
              </span>
              {isCreator && participantId !== creatorId && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={removingId === participantId}
                  loading={removingId === participantId}
                  onClick={() => removeCollaborator(participantId)}
                  aria-label={`Remove ${getName(participantId) ?? 'collaborator'}`}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        {collaboratorError && <p role="alert" className="mt-3 text-sm text-destructive">{collaboratorError}</p>}
      </div>

      {isCreator && (
        <div className="border-t border-border pt-5">
          <h3 className="font-medium">Invite roommates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Anyone with the link must sign in to join. Creating a new link replaces the previous one.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={inviteLoading} loading={inviteLoading} onClick={createInvite}>
              {inviteActive ? 'Create a new invite link' : 'Create invite link'}
            </Button>
            {inviteActive && (
              <Button variant="outline" disabled={inviteLoading} onClick={revokeInvite}>
                Turn off link
              </Button>
            )}
          </div>
          {inviteUrl && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                aria-label="Invite link"
                data-testid="invite-url"
                readOnly
                value={inviteUrl}
                className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <Button variant="outline" onClick={copyInvite}>{inviteCopied ? 'Copied!' : 'Copy'}</Button>
            </div>
          )}
          {inviteError && <p role="alert" className="mt-3 text-sm text-destructive">{inviteError}</p>}
        </div>
      )}

      <div className="border-t border-border pt-5">
        <h3 className="font-medium">Roommate votes</h3>
        {status === 'loading' ? (
          <p data-testid="listing-decision" aria-busy="true" className="mt-2 text-sm text-muted-foreground">
            Loading votes…
          </p>
        ) : status === 'error' ? (
          <p data-testid="listing-decision" role="alert" className="mt-2 text-sm text-destructive">
            Vote results are unavailable. Check your connection and try again.
          </p>
        ) : (
          <>
            <p data-testid="listing-decision" className="mt-2 text-lg font-semibold">{decision}</p>
          <ul className="mt-3 space-y-3">
            {participants.map((participantId) => {
              const vote = votes.find((entry) => entry.data.userId === participantId)
              return (
                <li key={participantId} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{getName(participantId) ?? 'Roommate'}</p>
                  <p className="mt-1 text-muted-foreground">{vote?.data.choice ?? 'Not voted yet'}</p>
                  {vote?.data.comment && (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{vote.data.comment}</p>
                  )}
                </li>
              )
            })}
          </ul>
          </>
        )}
        {status === 'ready' && userId && participants.includes(userId) && (
          <div data-testid="voting-form" className="mt-5 space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Your vote</span>
              <select
                data-testid="vote-choice"
                value={choice}
                onChange={(event) => {
                  if (isVoteChoice(event.target.value)) setChoice(event.target.value)
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3"
              >
                {VOTE_CHOICES.map((voteChoice) => (
                  <option key={voteChoice} value={voteChoice}>{voteChoice}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>Comment (optional, up to 280 characters)</span>
              <Textarea
                data-testid="vote-comment"
                maxLength={280}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a short note for your roommates"
              />
            </label>
            <Button disabled={savingVote || status !== 'ready'} loading={savingVote} onClick={submitVote}>
              {currentVote ? 'Update my vote' : 'Save my vote'}
            </Button>
            {voteError && <p role="alert" className="text-sm text-destructive">{voteError}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
