interface Bucket { n: number; reset: number }

const buckets = new Map<string, Bucket>();

/**
 * Basit sabit pencereli rate limiter (bellek içi). Çok sunuculu kurulumda Redis ile değiştirilebilir:
 * aynı `isLimited` imzasını koruyan bir adaptör yeterlidir.
 */
export function isLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n++;
  return b.n > max;
}
