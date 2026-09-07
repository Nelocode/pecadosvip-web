export function isIpAllowedForAdmin(ipAddress: string, allowedIps: string[] = []): boolean {
  if (!allowedIps || allowedIps.length === 0) {
    return true; // If no whitelist configured, allow loopback / normal access
  }

  const cleanIp = ipAddress.replace(/^::ffff:/, '').trim();

  // Always allow loopback for local admin development
  if (cleanIp === '127.0.0.1' || cleanIp === '::1') return true;

  return allowedIps.includes(cleanIp);
}
