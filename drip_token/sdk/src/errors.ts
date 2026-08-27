/**
 * Maps known DripToken program errors to human-readable messages.
 */

const ERROR_MAP: Record<string, string> = {
  FaucetPaused: "Faucet is currently paused. Claims are temporarily disabled.",
  CooldownNotElapsed:
    "Cooldown period has not elapsed. Please wait before claiming again.",
  DailyLimitExceeded:
    "Daily claim limit exceeded. Try again after the 24-hour window resets.",
  ArithmeticOverflow: "Arithmetic overflow detected.",
  InvalidMode: "Invalid faucet mode. Mode must be 0 (Mint) or 1 (Transfer).",
  InsufficientVaultBalance: "Vault has insufficient balance for this claim.",
  InvalidMint: "Provided mint does not match the configured faucet mint.",
  InvalidVault: "Vault does not match Config or has the wrong authority.",
  Unauthorized: "Only the admin can perform this action.",
  AlreadyInitialized: "Config has already been initialized.",
  CannotCloseWithClaimedToday:
    "Cannot close UserState while claimed_today > 0.",
  CannotCloseDuringCooldown:
    "Cannot close UserState while still in cooldown.",
};

export function mapProgramError(err: unknown): string {
  if (err == null) return "Unknown error";

  const raw =
    (err as any)?.error?.errorMessage ??
    (err as any)?.message ??
    (err as any)?.toString?.() ??
    String(err);

  const text = String(raw);

  for (const [key, human] of Object.entries(ERROR_MAP)) {
    if (text.includes(key) || text.includes(human.split(".")[0])) {
      return human;
    }
  }

  // Fallback phrase matching
  if (/paused/i.test(text)) return ERROR_MAP.FaucetPaused;
  if (/cooldown/i.test(text)) return ERROR_MAP.CooldownNotElapsed;
  if (/daily.*limit|limit exceeded/i.test(text))
    return ERROR_MAP.DailyLimitExceeded;
  if (/insufficient.*vault|vault.*balance/i.test(text))
    return ERROR_MAP.InsufficientVaultBalance;
  if (/unauthorized|only the admin/i.test(text)) return ERROR_MAP.Unauthorized;
  if (/already.*initialized/i.test(text)) return ERROR_MAP.AlreadyInitialized;
  if (/cannot close.*claimed/i.test(text))
    return ERROR_MAP.CannotCloseWithClaimedToday;
  if (/cannot close.*cooldown/i.test(text))
    return ERROR_MAP.CannotCloseDuringCooldown;

  return text;
}

export function throwMapped(err: unknown): never {
  throw new Error(mapProgramError(err));
}