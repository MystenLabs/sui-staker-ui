import { useState, useEffect, useRef } from 'react'
import {
  type NetworkType,
  saveStoredNetwork,
  saveStoredCustomUrl
} from './utils'
import { useClickOutside } from './hooks'

interface NetworkSelectorProps {
  network: NetworkType
  customUrl: string
  onNetworkChange: (network: NetworkType) => void
  onCustomUrlChange: (url: string) => void
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

  useClickOutside(dropdownRef, () => {
    setIsOpen(false)
  })

  const handleNetworkSelect = (value: NetworkType) => {
    saveStoredNetwork(value)
    onNetworkChange(value)
    if (value !== 'custom') {
      setIsOpen(false)
    }
  }

  const handleCustomUrlSave = () => {
    if (tempCustomUrl.trim()) {
      saveStoredCustomUrl(tempCustomUrl.trim())
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
