import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminKodikClient } from './AdminKodikClient';

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

export const metadata = { title: 'Импорт из Kodik — Admin' };

export default async function AdminKodikPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) redirect('/');
  return <AdminKodikClient />;
}
