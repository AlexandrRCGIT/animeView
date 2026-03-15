'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from '@/auth';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { hasUnsafeControlChars, isValidEmail } from '@/lib/security';
import {
  USER_EMAIL_MAX_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_NAME_MIN_LENGTH,
  USER_PASSWORD_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
} from '@/lib/input-limits';

export type RegisterState = {
  error?: 'email_exists' | 'invalid' | 'default';
} | null;

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name     = (formData.get('name')     as string | null)?.trim();
  const email    = (formData.get('email')    as string | null)?.trim().toLowerCase();
  const password =  formData.get('password') as string | null;

  if (!name || !email || !password || password.length < USER_PASSWORD_MIN_LENGTH) {
    return { error: 'invalid' };
  }
  if (name.length < USER_NAME_MIN_LENGTH || name.length > USER_NAME_MAX_LENGTH || hasUnsafeControlChars(name)) {
    return { error: 'invalid' };
  }
  if (email.length > USER_EMAIL_MAX_LENGTH || !isValidEmail(email)) {
    return { error: 'invalid' };
  }
  if (password.length > USER_PASSWORD_MAX_LENGTH) {
    return { error: 'invalid' };
  }

  // Явная проверка email ДО bcrypt — быстро и понятно
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) return { error: 'email_exists' };

  const passwordHash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('users')
    .insert({ name, email, password_hash: passwordHash });

  if (error) return { error: 'default' };

  redirect('/auth/signin?success=registered');
}

export type LoginState = {
  error?: 'no_account' | 'wrong_password' | 'default';
} | null;

export async function loginUser(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email       = (formData.get('email')       as string | null)?.trim().toLowerCase();
  const password    =  formData.get('password')    as string | null;
  const callbackUrl = (formData.get('callbackUrl') as string | null) ?? '/';

  if (!email || !password) return { error: 'default' };
  if (email.length > USER_EMAIL_MAX_LENGTH || !isValidEmail(email) || password.length > USER_PASSWORD_MAX_LENGTH) {
    return { error: 'default' };
  }

  // Проверяем существование email ДО попытки входа
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!existing) return { error: 'no_account' };

  try {
    await signIn('credentials', { email, password, redirectTo: callbackUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === 'CredentialsSignin') return { error: 'wrong_password' };
      return { error: 'default' };
    }
    throw e; // redirect() бросает исключение — пробрасываем дальше
  }

  return null;
}
