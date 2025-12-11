import { useState } from 'react'
import { formatSuiAmount } from './utils'
import { type Validator } from './validator'

interface ValidatorDetailsProps {
  validator: Validator
  myStake: bigint | null | undefined
}

export function ValidatorDetails({ validator, myStake }: ValidatorDetailsProps) {
  const [imageError, setImageError] = useState(false)
  const [prevAddress, setPrevAddress] = useState(validator.address)

  // Reset image error when validator changes (state-during-render pattern)
  if (validator.address !== prevAddress) {
    setPrevAddress(validator.address)
    setImageError(false)
  }

  return (
    <div className="validator-details">
      <div className="validator-details-header">
        {validator.imageUrl && !imageError ? (
          <img
            src={validator.imageUrl}
            alt={validator.name}
            className="validator-details-image"
            onError={() => setImageError(true)}
          />
        ) : null}
        <div
          className={`validator-details-placeholder ${validator.imageUrl && !imageError ? 'hidden' : ''} ${imageError ? 'error' : ''}`}
          title={imageError ? 'Image failed to load' : undefined}
        >
          {imageError ? '⚠️' : validator.name.charAt(0).toUpperCase()}
        </div>
        <div className="validator-details-title">
          <span className="validator-details-name">{validator.name}</span>
          {validator.projectUrl ? (
            <a
              href={validator.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="validator-details-link"
            >
              Website
            </a>
          ) : (
            <span className="validator-details-link disabled">
              Website: none
            </span>
          )}
        </div>
        <span className={`validator-status-badge ${validator.isPending ? 'pending' : 'active'}`}>
          {validator.isPending ? 'Pending' : 'Active'}
        </span>
      </div>
      <div className="validator-details-grid">
        <div className="validator-detail-item">
          <span className="validator-detail-label">
            APY
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">APY is approximate and may differ from other sites.</span>
            </span>
          </span>
          <span className="validator-detail-value">
            {validator.apy ? `${validator.apy.toFixed(2)}%` : '--'}
          </span>
        </div>
        <div className="validator-detail-item">
          <span className="validator-detail-label">Commission</span>
          <span className="validator-detail-value">{validator.commissionRate.toFixed(2)}%</span>
        </div>
        <div className="validator-detail-item">
          <span className="validator-detail-label">Total Stake</span>
          <span className="validator-detail-value">{formatSuiAmount(validator.totalStake)} SUI</span>
        </div>
        <div className="validator-detail-item">
          <span className="validator-detail-label">Voting Power</span>
          <span className="validator-detail-value">{validator.votingPower.toFixed(2)}%</span>
        </div>
        <div className="validator-detail-item">
          <span className="validator-detail-label">
            Your Stake
            <span className="tooltip-wrapper">
              <span className="tooltip-icon">?</span>
              <span className="tooltip-text">Unavailable if you have staked to any pending validator.</span>
            </span>
          </span>
          <span className="validator-detail-value">
            {myStake === null ? (
              <span className="spinner" />
            ) : myStake === undefined ? (
              '--'
            ) : (
              `${formatSuiAmount(myStake)} SUI`
            )}
          </span>
        </div>
        <div className="validator-detail-item">
          <span className="validator-detail-label">Gas Price</span>
          <span className="validator-detail-value">{validator.gasPrice.toString()} MIST</span>
        </div>
        <div className="validator-detail-item full-width">
          <span className="validator-detail-label">Sui Address</span>
          <span className="validator-detail-value address" title={validator.address}>
            {validator.address}
          </span>
        </div>
        <div className="validator-detail-item full-width">
          <span className="validator-detail-label">Network Address</span>
          <span className="validator-detail-value address" title={validator.netAddress}>
            {validator.netAddress}
          </span>
        </div>
      </div>
      {validator.description && (
        <p className="validator-details-description">{validator.description}</p>
      )}
    </div>
  )
}
