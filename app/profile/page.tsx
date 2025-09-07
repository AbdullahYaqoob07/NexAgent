import { currentUser } from '@clerk/nextjs/server'
import ProfilePage from '@/components/dashboard/ProfilePage'

export default async function Profile() {
  const user = await currentUser()
  
  // Serialize user data to avoid passing class instances to client components
  const userData = user ? {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddresses: user.emailAddresses.map(email => ({
      emailAddress: email.emailAddress,
      verification: {
        status: email.verification?.status
      }
    })),
    phoneNumbers: user.phoneNumbers.map(phone => ({
      phoneNumber: phone.phoneNumber
    })),
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    imageUrl: user.imageUrl
  } : null

  return <ProfilePage user={userData} />
}
