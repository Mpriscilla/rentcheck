import { getAuthToken } from 'deepspace'

export async function callListingAction<TData extends Record<string, unknown>>(
  action: string,
  params: Record<string, unknown>,
): Promise<TData> {
  const token = await getAuthToken()
  if (!token) throw new Error('Sign in to continue.')

  const response = await fetch(`/api/actions/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })
  if (!response.ok) throw new Error('The request could not be completed. Please try again.')

  const body: unknown = await response.json()
  if (!isRecord(body)) throw new Error('The server returned an invalid response.')
  if (body.success !== true) {
    throw new Error('The request could not be completed. Please try again.')
  }
  if (!isRecord(body.data)) throw new Error('The server returned an invalid response.')
  return body.data as TData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
