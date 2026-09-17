import dns from 'dns';

/**
 * Perform reverse DNS PTR lookup with timeout
 */
export async function resolveDnsHostname(ip: string, timeoutMs = 800): Promise<string | undefined> {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(undefined);
      }
    }, timeoutMs);

    dns.promises
      .reverse(ip)
      .then((hostnames) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          if (hostnames && hostnames.length > 0) {
            const raw = hostnames[0].replace(/\.$/, '').trim();
            resolve(raw.length > 0 ? raw : undefined);
          } else {
            resolve(undefined);
          }
        }
      })
      .catch(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(undefined);
        }
      });
  });
}
