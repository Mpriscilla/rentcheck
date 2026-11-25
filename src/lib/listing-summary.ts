import { z } from 'zod'

export const listingSummarySchema = z.object({
  costs: z.object({
    rent: z.string().max(240),
    deposit: z.string().max(240),
    fees: z.string().max(240),
  }).strict(),
  requirements: z.object({
    income: z.string().max(240),
    leaseLength: z.string().max(240),
    pets: z.string().max(240),
    other: z.string().max(240),
  }).strict(),
  warningSigns: z.array(z.string().max(140)).max(5),
  questionsToAskLandlord: z.array(z.string().max(140)).max(5),
}).strict()

export type ListingSummary = z.infer<typeof listingSummarySchema>
