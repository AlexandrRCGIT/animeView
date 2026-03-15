import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminUserId } from '@/lib/admin';
import { AdminOnlineClient } from './AdminOnlineClient';

export const metadata = { title: 'Онлайн пользователи — Admin' };

export default async function AdminOnlinePage() {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) redirect('/');
  return <AdminOnlineClient />;
}
