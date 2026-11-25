import { useAuthProfileReady } from 'deepspace'
import RentCheckIntro from '../../components/RentCheckIntro'

export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })

  return (
    <div className="min-h-full bg-background text-foreground">
      <RentCheckIntro />
      {isSignedIn && user && (
        <p className="mx-auto max-w-5xl px-6 pb-8 text-sm text-muted-foreground">
          Signed in as {user.name ?? user.email}
        </p>
      )}
    </div>
  )
}
