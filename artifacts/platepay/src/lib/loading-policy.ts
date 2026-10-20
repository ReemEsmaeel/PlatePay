type Role = 'driver' | 'merchant' | 'admin';

// Keep reads scoped to the rendered page. Role checks still belong to the API.
export function getPortalDataNeeds(role: Role, section: string) {
  const driver = role === 'driver';
  const merchant = role === 'merchant';
  const admin = role === 'admin';
  return {
    vehicles: driver && ['overview', 'vehicles'].includes(section),
    wallet: driver && ['overview', 'wallet'].includes(section),
    requests: (driver && ['overview', 'requests'].includes(section))
      || (merchant && section === 'history'),
    limits: driver && ['overview', 'limits'].includes(section),
    transactions: (driver && ['overview', 'transactions'].includes(section))
      || (merchant && section === 'transactions'),
    merchantProfile: merchant && ['overview', 'profile'].includes(section),
    merchantDashboard: merchant && section === 'overview',
    services: merchant && section === 'profile',
    adminOverview: admin && section === 'overview',
    accounts: admin && section === 'accounts',
    merchants: admin && section === 'merchants',
    adminTransactions: admin && section === 'admin-transactions',
    audit: admin && section === 'audit',
  };
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  // Expected refusals and database outages should show immediately, not wait
  // through another identical request. Transient failures get one retry.
  return failureCount < 1
    && !(status !== undefined && (status < 500 || status === 503));
}
