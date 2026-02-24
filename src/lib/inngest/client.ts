import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'ariel-mint',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
