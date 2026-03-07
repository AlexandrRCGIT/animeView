import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminRutubeClient } from './AdminRutubeClient';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

export default async function AdminRutubePage() {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) {
    redirect('/');
  }

  return <AdminRutubeClient />;
}
