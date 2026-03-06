import NextAuth, { type DefaultSession } from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { supabase } from '@/lib/supabase';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord,
    Credentials({
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { data: user } = await supabase
          .from('users')
          .select('id, email, name, password_hash')
          .eq('email', email)
          .maybeSingle();

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password_hash as string);
        if (!valid) return null;

        return {
          id: user.id as string,
          email: user.email as string,
          name: user.name as string,
        };
      },
    }),
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { label: 'id', type: 'text' },
        first_name: { label: 'first_name', type: 'text' },
        last_name: { label: 'last_name', type: 'text' },
        username: { label: 'username', type: 'text' },
        photo_url: { label: 'photo_url', type: 'text' },
        auth_date: { label: 'auth_date', type: 'text' },
        hash: { label: 'hash', type: 'text' },
      },
      async authorize(credentials) {
        const botToken = process.env.AUTH_TELEGRAM_BOT_TOKEN;
        if (!botToken) return null;

        const tgId = (credentials?.id as string | undefined)?.trim();
        const firstName = (credentials?.first_name as string | undefined)?.trim() ?? '';
        const lastName = (credentials?.last_name as string | undefined)?.trim() ?? '';
        const username = (credentials?.username as string | undefined)?.trim() ?? '';
        const photoUrl = (credentials?.photo_url as string | undefined)?.trim() ?? '';
        const authDateStr = (credentials?.auth_date as string | undefined)?.trim();
        const hash = (credentials?.hash as string | undefined)?.trim().toLowerCase();

        if (!tgId || !authDateStr || !hash) return null;
        if (!/^\d+$/.test(tgId) || !/^\d+$/.test(authDateStr)) return null;
        if (!/^[a-f0-9]{64}$/.test(hash)) return null;

        const authDate = Number(authDateStr);
        const now = Math.floor(Date.now() / 1000);
        if (!Number.isFinite(authDate) || now - authDate > 300 || authDate > now + 30) return null;

        const payload = {
          auth_date: authDateStr,
          first_name: firstName,
          id: tgId,
          last_name: lastName,
          photo_url: photoUrl,
          username,
        };

        const dataCheckString = Object.entries(payload)
          .filter(([, value]) => value !== '')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');

        const secret = createHash('sha256').update(botToken).digest();
        const computedHash = createHmac('sha256', secret).update(dataCheckString).digest('hex');

        const hashBuffer = Buffer.from(hash, 'hex');
        const computedBuffer = Buffer.from(computedHash, 'hex');
        if (hashBuffer.length !== computedBuffer.length) return null;
        if (!timingSafeEqual(hashBuffer, computedBuffer)) return null;

        const userId = `telegram:${tgId}`;
        const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || username || `Telegram ${tgId}`;

        await supabase
          .from('telegram_accounts')
          .upsert(
            {
              telegram_id: Number(tgId),
              user_id: userId,
              username: username || null,
              first_name: firstName || null,
              last_name: lastName || null,
              photo_url: photoUrl || null,
              auth_date: authDate,
              last_login_at: new Date().toISOString(),
              raw_payload: payload,
            },
            { onConflict: 'telegram_id' },
          );

        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingProfile?.display_name) {
          await supabase
            .from('user_profiles')
            .upsert({ user_id: userId, display_name: displayName }, { onConflict: 'user_id' });
        }

        return {
          id: userId,
          name: displayName,
          email: null,
          image: photoUrl || null,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    jwt({ token, user, account }) {
      // OAuth (Discord): стабильный ID = "discord:123456789"
      if (account?.providerAccountId) {
        token.sub = `${account.provider}:${account.providerAccountId}`;
      } else if (user?.id && !token.sub) {
        // Credentials: UUID из нашей таблицы users
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
