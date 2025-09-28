import { currentUser } from '@clerk/nextjs/server'
import DashboardHome from '@/components/dashboard/DashboardHome'

export default async function DashboardPage() {
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
    createdAt: new Date(user.createdAt),
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
    imageUrl: user.imageUrl
  } : null

  return <DashboardHome user={userData} />
}
