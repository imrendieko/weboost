import { createHash, createHmac, randomBytes } from 'crypto';

export type ResetUserType = 'admin' | 'guru' | 'siswa';

interface ChallengeTokenPayload {
  kind: 'challenge';
  email: string;
  userType: ResetUserType;
  userId: number;
  otpHash: string;
  salt: string;
  exp: number;
}

interface ResetTokenPayload {
  kind: 'reset';
  email: string;
  userType: ResetUserType;
  userId: number;
  exp: number;
}

type ParsedTokenPayload = ChallengeTokenPayload | ResetTokenPayload;

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;

const resolvedSecret = process.env.FORGOT_PASSWORD_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'weboost-dev-forgot-password-secret';

function sign(payloadBase64: string): string {
  return createHmac('sha256', resolvedSecret).update(payloadBase64).digest('base64url');
}

function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(`${otp}:${salt}`).digest('hex');
}

function encodePayload(payload: ParsedTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(payloadBase64: string): ParsedTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as ParsedTokenPayload;
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed) || !('exp' in parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function parseAndVerifyToken(token: string): ParsedTokenPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadBase64);
  if (signature !== expectedSignature) {
    return null;
  }

  const payload = decodePayload(payloadBase64);
  if (!payload) {
    return null;
  }

  if (Date.now() > payload.exp) {
    return null;
  }

  return payload;
}

export function createOtpChallenge(params: { email: string; userType: ResetUserType; userId: number }) {
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const salt = randomBytes(16).toString('hex');
  const exp = Date.now() + OTP_TTL_MS;

  const payload: ChallengeTokenPayload = {
    kind: 'challenge',
    email: params.email,
    userType: params.userType,
    userId: params.userId,
    otpHash: hashOtp(otp, salt),
    salt,
    exp,
  };

  const payloadBase64 = encodePayload(payload);
  const challengeToken = `${payloadBase64}.${sign(payloadBase64)}`;

  return {
    otp,
    challengeToken,
    expiresAt: exp,
  };
}

export function verifyOtpChallenge(
  challengeToken: string,
  otp: string,
): {
  ok: boolean;
  error?: string;
  context?: { email: string; userType: ResetUserType; userId: number };
} {
  const parsed = parseAndVerifyToken(challengeToken);
  if (!parsed || parsed.kind !== 'challenge') {
    return { ok: false, error: 'Kode OTP tidak valid atau sudah kedaluwarsa.' };
  }

  const inputHash = hashOtp(otp, parsed.salt);
  if (inputHash !== parsed.otpHash) {
    return { ok: false, error: 'Kode OTP salah. Silakan cek kembali email Anda.' };
  }

  return {
    ok: true,
    context: {
      email: parsed.email,
      userType: parsed.userType,
      userId: parsed.userId,
    },
  };
}

export function createResetToken(context: { email: string; userType: ResetUserType; userId: number }): string {
  const payload: ResetTokenPayload = {
    kind: 'reset',
    email: context.email,
    userType: context.userType,
    userId: context.userId,
    exp: Date.now() + RESET_TTL_MS,
  };

  const payloadBase64 = encodePayload(payload);
  return `${payloadBase64}.${sign(payloadBase64)}`;
}

export function verifyResetToken(token: string): {
  ok: boolean;
  error?: string;
  context?: { email: string; userType: ResetUserType; userId: number };
} {
  const parsed = parseAndVerifyToken(token);
  if (!parsed || parsed.kind !== 'reset') {
    return { ok: false, error: 'Sesi reset password tidak valid atau sudah kedaluwarsa.' };
  }

  return {
    ok: true,
    context: {
      email: parsed.email,
      userType: parsed.userType,
      userId: parsed.userId,
    },
  };
}
