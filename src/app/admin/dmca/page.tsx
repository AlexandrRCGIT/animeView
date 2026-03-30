import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminDmcaClient } from './AdminDmcaClient';
import { isAdminUserId } from '@/lib/admin';

export const metadata = { title: 'DMCA / Удаление — Admin' };

export default async function AdminDmcaPage() {
  const session = await auth();
  if (!isAdminUserId(session?.user?.id)) redirect('/');
  return <AdminDmcaClient />;
}
