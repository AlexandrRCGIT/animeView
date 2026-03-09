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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Identity {
  name: string;
  email: string | null;
  image: string | null;
}

async function resolveIdentity(userId: string): Promise<Identity> {
  let name: string | null = null;
  let email: string | null = null;
  let image: string | null = null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.display_name) name = profile.display_name;
  if (profile?.avatar_url) image = profile.avatar_url;

  const credentialsId = userId.startsWith('credentials:')
    ? userId.slice('credentials:'.length)
    : (UUID_RE.test(userId) ? userId : null);

  if (credentialsId) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', credentialsId)
      .maybeSingle();
    if (dbUser?.name) name = name ?? dbUser.name;
    if (dbUser?.email) email = dbUser.email;
  } else if (userId.startsWith('telegram:')) {
    const { data: tg } = await supabase
      .from('telegram_accounts')
      .select('username, first_name, last_name, photo_url')
      .eq('user_id', userId)
      .maybeSingle();

    const tgName = [tg?.first_name, tg?.last_name]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .join(' ');

    if (!name) {
      name = tgName || (tg?.username ? `@${tg.username}` : null);
    }
    if (!image && typeof tg?.photo_url === 'string') {
      image = tg.photo_url;
    }
  }

  return {
    name: name || 'Пользователь',
    email,
    image,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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

        await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              // Не затираем имя, которое пользователь мог поменять сам
              display_name: existingProfile?.display_name ?? displayName,
              // Аватар всегда обновляем из Telegram (может смениться)
              avatar_url: photoUrl || null,
            },
            { onConflict: 'user_id' }
          );

        return {
          id: userId,
          name: displayName,
          email: null,
          image: photoUrl || null,
        };
      },
    }),
    Credentials({
      id: 'tv-device',
      name: 'TV Device',
      credentials: {
        device_id: { label: 'device_id', type: 'text' },
      },
      async authorize(credentials) {
        const deviceId = (credentials?.device_id as string | undefined)?.trim();
        if (!deviceId || !UUID_RE.test(deviceId)) return null;

        const nowIso = new Date().toISOString();
        const { data: consumedRow, error } = await supabase
          .from('tv_login_sessions')
          .update({
            status: 'consumed',
            consumed_at: nowIso,
          })
          .eq('id', deviceId)
          .eq('status', 'approved')
          .is('consumed_at', null)
          .gt('expires_at', nowIso)
          .select('user_id, client_device_id, client_device_name, created_via')
          .maybeSingle();

        if (error || !consumedRow?.user_id) return null;

        const userId = consumedRow.user_id as string;
        const clientDeviceId =
          typeof consumedRow.client_device_id === 'string' ? consumedRow.client_device_id.trim() : '';
        const clientDeviceName =
          typeof consumedRow.client_device_name === 'string' ? consumedRow.client_device_name.trim() : '';
        const createdVia =
          consumedRow.created_via === 'web' || consumedRow.created_via === 'tv'
            ? consumedRow.created_via
            : null;

        if (clientDeviceId) {
          await supabase
            .from('user_devices')
            .upsert(
              {
                user_id: userId,
                client_device_id: clientDeviceId.slice(0, 128),
                device_name: (clientDeviceName || 'Устройство').slice(0, 160),
                created_via: createdVia,
                last_seen_at: nowIso,
                revoked_at: null,
              },
              { onConflict: 'user_id,client_device_id' },
            );
        }

        const identity = await resolveIdentity(userId);

        return {
          id: userId,
          name: identity.name,
          email: identity.email,
          image: identity.image,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === 'telegram' || account?.provider === 'tv-device') {
        token.sub = user?.id ?? token.sub;
        return token;
      }

      if (account?.provider === 'credentials' && user?.id) {
        token.sub = user.id.startsWith('credentials:') ? user.id : `credentials:${user.id}`;
        return token;
      }

      if (account?.providerAccountId) {
        token.sub = `${account.provider}:${account.providerAccountId}`;

        // Discord: сохраняем имя и аватар в user_profiles при каждом логине
        if (account.provider === 'discord') {
          const discordUserId = token.sub;
          const { data: existing } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', discordUserId)
            .maybeSingle();

          void supabase.from('user_profiles').upsert(
            {
              user_id: discordUserId,
              display_name: existing?.display_name ?? (token.name as string | null) ?? null,
              avatar_url: (token.picture as string | null) ?? null,
            },
            { onConflict: 'user_id' }
          );
        }
      } else if (user?.id && !token.sub) {
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
