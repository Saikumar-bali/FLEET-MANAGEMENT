const durationPattern = /^(\d+)([smhd])$/;

export function durationToMilliseconds(value: string): number {
  const trimmedValue = value.trim().toLowerCase();
  const match = durationPattern.exec(trimmedValue);

  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit];
}

export function futureDateFromDuration(value: string): Date {
  return new Date(Date.now() + durationToMilliseconds(value));
}
