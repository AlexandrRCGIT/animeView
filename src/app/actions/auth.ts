'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function registerUser(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim();
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  const password = formData.get('password') as string | null;

  if (!name || !email || !password || password.length < 8) {
    redirect('/auth/register?error=invalid');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('users')
    .insert({ name, email, password_hash: passwordHash });

  if (error) {
    if (error.code === '23505') redirect('/auth/register?error=email_exists');
    redirect('/auth/register?error=default');
  }

  redirect('/auth/signin?success=registered');
}
