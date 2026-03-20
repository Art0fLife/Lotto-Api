function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getJwtSecret(): string {
  return getRequiredEnv('JWT_SECRET');
}

export function getJwtRefreshSecret(): string {
  return getRequiredEnv('JWT_REFRESH_SECRET');
}

export function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '1d';
}

export function getJwtRefreshExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

export function getJwtSessionMaxAgeSeconds(): number {
  return Number(process.env.JWT_SESSION_MAX_AGE_SECONDS || '86400');
}