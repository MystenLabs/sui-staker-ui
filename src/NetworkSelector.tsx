import { useState, useEffect, useRef } from 'react'

export type NetworkType = 'mainnet' | 'testnet' | 'custom'

const STORAGE_KEY_NETWORK = 'sui-stake-network'
const STORAGE_KEY_CUSTOM_URL = 'sui-stake-custom-url'

interface NetworkSelectorProps {
  network: NetworkType
  customUrl: string
  onNetworkChange: (network: NetworkType) => void
  onCustomUrlChange: (url: string) => void
}

export function getStoredNetwork(): NetworkType {
  const stored = localStorage.getItem(STORAGE_KEY_NETWORK)
  if (stored === 'mainnet' || stored === 'testnet' || stored === 'custom') {
    return stored
  }
  return 'mainnet'
}

export function getStoredCustomUrl(): string {
  return localStorage.getItem(STORAGE_KEY_CUSTOM_URL) || ''
}

const networkLabels: Record<NetworkType, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  custom: 'Custom',
}

export function NetworkSelector({
  network,
  customUrl,
  onNetworkChange,
  onCustomUrlChange,
}: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempCustomUrl, setTempCustomUrl] = useState(customUrl)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTempCustomUrl(customUrl)
  }, [customUrl])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNetworkSelect = (value: NetworkType) => {
    localStorage.setItem(STORAGE_KEY_NETWORK, value)
    onNetworkChange(value)
    if (value !== 'custom') {
      setIsOpen(false)
    }
  }

  const handleCustomUrlSave = () => {
    if (tempCustomUrl.trim()) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_URL, tempCustomUrl.trim())
      onCustomUrlChange(tempCustomUrl.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomUrlSave()
      setIsOpen(false)
    }
  }

  const displayLabel = network === 'custom' && customUrl
    ? 'Custom RPC'
    : networkLabels[network]

  return (
    <div className="network-selector" ref={dropdownRef}>
      <button
        className="network-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {displayLabel}
        <svg
          className={`network-selector-chevron ${isOpen ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="network-selector-dropdown">
          {(['mainnet', 'testnet', 'custom'] as NetworkType[]).map((option) => (
            <label key={option} className="network-selector-option">
              <input
                type="radio"
                name="network"
                value={option}
                checked={network === option}
                onChange={() => handleNetworkSelect(option)}
              />
              <span className="network-selector-radio" />
              <span className="network-selector-label">{networkLabels[option]}</span>
            </label>
          ))}

          {network === 'custom' && (
            <div className="network-selector-custom-url">
              <input
                type="text"
                placeholder="https://your-fullnode-url..."
                value={tempCustomUrl}
                onChange={(e) => setTempCustomUrl(e.target.value)}
                onBlur={handleCustomUrlSave}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
