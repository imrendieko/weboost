import { compare, hash } from 'bcryptjs';

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$/;

export function isBcryptHash(value: string | null | undefined): value is string {
  return typeof value === 'string' && BCRYPT_REGEX.test(value);
}

export async function hashPasswordIfNeeded(password: string): Promise<string> {
  if (isBcryptHash(password)) {
    return password;
  }

  return hash(password, 12);
}

export async function verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword) {
    return false;
  }

  if (isBcryptHash(storedPassword)) {
    return compare(inputPassword, storedPassword);
  }

  // Backward compatibility for legacy plaintext rows not migrated yet.
  return inputPassword === storedPassword;
}
