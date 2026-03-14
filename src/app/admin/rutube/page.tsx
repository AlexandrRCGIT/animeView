import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminRutubeClient } from './AdminRutubeClient';
import { isAdminUserId } from '@/lib/admin';

export default async function AdminRutubePage() {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) {
    redirect('/');
  }

  return <AdminRutubeClient />;
}
