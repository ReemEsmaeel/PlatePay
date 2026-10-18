type VerifiedEmail = {
  emailAddress: string;
  verification?: { status: string } | null;
};

/** Only an owner-configured, verified primary email can receive initial access. */
export function isTrustedAdminEmail(
  email: VerifiedEmail | undefined,
  configuredEmail = process.env.PLATEPAY_ADMIN_EMAIL,
): boolean {
  const trusted = configuredEmail?.trim().toLowerCase();
  return Boolean(
    trusted &&
    email?.verification?.status === "verified" &&
    email.emailAddress.trim().toLowerCase() === trusted,
  );
}
