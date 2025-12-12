import { useState, useEffect, useRef } from 'react'
import { useSuiClient } from '@mysten/dapp-kit'
import { isValidSuiAddress } from './utils'
import { getPendingValidator, useValidators, type Validator } from './validator'
import { useClickOutside } from './hooks'

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

interface ValidatorSelectorProps {
  value: string
  onChange: (address: string) => void
  onValidatorSelect?: (validator: Validator | null) => void
  disabled?: boolean
}

export function ValidatorSelector({ value, onChange, onValidatorSelect, disabled }: ValidatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { validators, loading } = useValidators()
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState(value)
  const [customValidator, setCustomValidator] = useState<Validator | null>(null)
  const [isLookingUpPending, setIsLookingUpPending] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const suiClient = useSuiClient()

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useClickOutside(dropdownRef, () => {
    setIsOpen(false)
  })

  const filteredValidators = validators.filter((v) => {
    const searchLower = search.toLowerCase()
    return (
      v.name.toLowerCase().includes(searchLower) ||
      v.address.toLowerCase().includes(searchLower)
    )
  })

  const selectedValidator = validators.find((v) => v.address === value)

  // Notify parent when selected validator changes (e.g., validators loaded, value changed)
  useEffect(() => {
    if (loading) return

    const active = validators.find((v) => v.address === value)
    
    if (active) {
      setCustomValidator(null)
      onValidatorSelect?.(active)
      setIsLookingUpPending(false)
    } else if (value && isValidSuiAddress(value)) {
      setIsLookingUpPending(true)
      let cancelled = false
      getPendingValidator(suiClient, value).then((pending) => {
        if (cancelled) return
        setCustomValidator(pending)
        onValidatorSelect?.(pending)
        if (pending) {
          setIsOpen(false)
        }
      }).finally(() => {
        if (!cancelled) setIsLookingUpPending(false)
      })
      return () => {
        cancelled = true
        setIsLookingUpPending(false)
      }
    } else {
      setCustomValidator(null)
      onValidatorSelect?.(null)
      setIsLookingUpPending(false)
    }
  }, [value, validators, loading, onValidatorSelect, suiClient])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSearch(newValue)
    onChange(newValue)
    if (!isOpen) setIsOpen(true)
  }

  const handleSelect = (validator: Validator) => {
    onChange(validator.address)
    setInputValue(validator.address)
    setSearch('')
    setIsOpen(false)
    onValidatorSelect?.(validator)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsOpen(false)
      if (inputValue) {
        onChange(inputValue)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const displayValue = selectedValidator
    ? `${selectedValidator.name} (${formatAddress(selectedValidator.address)})`
    : customValidator
    ? `${customValidator.name} (${formatAddress(customValidator.address)})`
    : inputValue

  return (
    <div className="validator-selector" ref={dropdownRef}>
      <input
        type="text"
        placeholder={loading ? 'Loading validators...' : 'Select active or enter custom validator address...'}
        value={isOpen ? (search || inputValue) : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="validator-input"
      />

      {isOpen && !disabled && (
        <div className="validator-dropdown">
          {loading ? (
            <div className="validator-loading">
              <span className="spinner" />
              Loading validators...
            </div>
          ) : filteredValidators.length > 0 ? (
            <div className="validator-list">
              {filteredValidators.map((validator) => (
                <div
                  key={validator.address}
                  className={`validator-option ${value === validator.address ? 'selected' : ''}`}
                  onClick={() => handleSelect(validator)}
                >
                  <span className="validator-name">{validator.name}</span>
                  <span className="validator-address">{formatAddress(validator.address)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="validator-empty">
              {isLookingUpPending ? (
                <>
                  <span className="spinner" />
                  Looking up pending validator...
                </>
              ) : search && search.startsWith('0x') && !isValidSuiAddress(search) ? (
                <span className="validator-warning">
                  Invalid Sui address. Must be 0x followed by 64 hex characters.
                </span>
              ) : search ? (
                'No active or pending validators found.'
              ) : (
                'No validators available'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
