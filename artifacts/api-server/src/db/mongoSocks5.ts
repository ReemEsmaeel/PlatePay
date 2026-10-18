export type MongoSocks5Options = {
  proxyHost?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
};

export function getMongoSocks5Options(
  env: NodeJS.ProcessEnv = process.env,
): MongoSocks5Options {
  const host = env.MONGODB_SOCKS5_HOST?.trim();
  const portValue = env.MONGODB_SOCKS5_PORT?.trim();
  const username = env.MONGODB_SOCKS5_USERNAME;
  const password = env.MONGODB_SOCKS5_PASSWORD;

  if (!host) {
    if (portValue || username || password) {
      throw new Error("SOCKS5 proxy settings require MONGODB_SOCKS5_HOST.");
    }
    return {};
  }

  if (/[\s/]/.test(host) || host.includes("://")) {
    throw new Error("MONGODB_SOCKS5_HOST must be a hostname or IP address.");
  }

  const port = portValue ? Number(portValue) : 1080;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MONGODB_SOCKS5_PORT must be an integer from 1 to 65535.");
  }
  if (Boolean(username) !== Boolean(password)) {
    throw new Error("SOCKS5 proxy username and password must both be set or both be empty.");
  }

  return {
    proxyHost: host,
    proxyPort: port,
    ...(username && password
      ? { proxyUsername: username, proxyPassword: password }
      : {}),
  };
}
