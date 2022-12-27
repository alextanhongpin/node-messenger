// Usage: type USD = Brand<number, 'USD'>
// const usd = 10 as USD
export type Brand<T, V> = T & { __brand: V };
