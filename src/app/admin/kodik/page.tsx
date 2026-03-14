import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminKodikClient } from './AdminKodikClient';
import { isAdminUserId } from '@/lib/admin';

export const metadata = { title: 'Импорт из Kodik — Admin' };

export default async function AdminKodikPage() {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) redirect('/');
  return <AdminKodikClient />;
}
