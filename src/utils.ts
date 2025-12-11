import { MIST_PER_SUI, SUI_DECIMALS } from './consts'

export type NetworkType = 'mainnet' | 'testnet' | 'custom'

const STORAGE_KEY_NETWORK = 'sui-stake-network'
const STORAGE_KEY_CUSTOM_URL = 'sui-stake-custom-url'

export function getStoredNetwork(): NetworkType {
  const stored = localStorage.getItem(STORAGE_KEY_NETWORK)
  if (stored === 'mainnet' || stored === 'testnet' || stored === 'custom') {
    return stored
  }
  return 'mainnet'
}

export function saveStoredNetwork(network: NetworkType) {
  localStorage.setItem(STORAGE_KEY_NETWORK, network)
}

export function getStoredCustomUrl(): string {
  return localStorage.getItem(STORAGE_KEY_CUSTOM_URL) || ''
}

export function saveStoredCustomUrl(url: string) {
  localStorage.setItem(STORAGE_KEY_CUSTOM_URL, url)
}

/**
 * Parses a string amount of SUI into MIST (BigInt).
 * Safely handles decimals without floating point errors.
 *
 * @param amount - The amount string (e.g. "1.5", "0.0001")
 * @returns The amount in MIST as a BigInt, or null if invalid
 */
export function parseSuiAmount(amount: string): bigint | null {
  if (!amount) return null

  // Remove whitespace and ensure only one decimal point
  const cleanAmount = amount.trim()
  if (!/^\d+(\.\d+)?$/.test(cleanAmount)) {
    return null
  }

  const [integerPart, fractionalPart = ''] = cleanAmount.split('.')

  // If fractional part is longer than decimals, truncate or fail?
  // Usually failure or truncation is preferred. We'll fail to be safe/strict.
  if (fractionalPart.length > SUI_DECIMALS) {
    return null
  }

  // Pad the fractional part with zeros to the right
  const paddedFraction = fractionalPart.padEnd(SUI_DECIMALS, '0')

  return BigInt(integerPart + paddedFraction)
}

/**
 * Validates a Sui address format (0x followed by 64 hex characters)
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

/**
 * Formats MIST amount to human-readable SUI string
 * @param mist - Amount in MIST (bigint)
 * @param decimals - Number of decimal places to show (default: 2)
 */
export function formatSuiAmount(mist: bigint, decimals: number = 2): string {
  const sui = Number(mist) / Number(MIST_PER_SUI)

  if (mist >= 1_000_000_000n * MIST_PER_SUI) {
    return (sui / 1_000_000_000).toFixed(decimals) + 'B'
  }
  if (mist >= 1_000_000n * MIST_PER_SUI) {
    return (sui / 1_000_000).toFixed(decimals) + 'M'
  }
  if (mist >= 1_000n * MIST_PER_SUI) {
    return (sui / 1_000).toFixed(decimals) + 'K'
  }
  return sui.toFixed(decimals)
}
