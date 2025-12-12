import { useState, useEffect, useMemo } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { ValidatorSelector } from './ValidatorSelector'
import { parseSuiAmount, formatSuiAmount } from './utils'
import { SUI_SYSTEM_STATE_OBJECT_ID, SUI_SYSTEM_MODULE, TX_EXPLORER_BASE_URL } from './consts'
import { type Validator } from './validator'
import { ValidatorDetails } from './ValidatorDetails'

interface StatusState {
  type: 'success' | 'error' | 'loading' | ''
  message: string
  txDigest?: string
  duration?: number
}

function getValidatorFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('validator') || ''
}

function updateValidatorInUrl(address: string) {
  const url = new URL(window.location.href)
  if (address) {
    url.searchParams.set('validator', address)
  } else {
    url.searchParams.delete('validator')
  }
  window.history.replaceState({}, '', url.toString())
}

export function StakingForm() {
  const [validatorAddress, setValidatorAddress] = useState(getValidatorFromUrl)
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<StatusState>({ type: '', message: '' })
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null)
  const [myStake, setMyStake] = useState<bigint | null | undefined>(null)
  const [stakeRefreshKey, setStakeRefreshKey] = useState(0)
  const [balance, setBalance] = useState<bigint | null>(null)

  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  useEffect(() => {
    if (!currentAccount || !selectedValidator) {
      setMyStake(null)
      return
    }

    setMyStake(null)

    suiClient.getStakes({ owner: currentAccount.address })
      .then((stakes) => {
        const validatorStakes = stakes.find(
          (s) => s.validatorAddress === selectedValidator.address
        )
        if (validatorStakes) {
          const total = validatorStakes.stakes.reduce(
            (acc, s) => acc + BigInt(s.principal),
            0n
          )
          setMyStake(total)
        } else {
          setMyStake(0n)
        }
      })
      .catch((e) => {
        console.error('Failed to fetch user stakes:', e)
        setMyStake(undefined)
      })
  }, [currentAccount, selectedValidator, suiClient, stakeRefreshKey])

  useEffect(() => {
    if (!currentAccount) {
      setBalance(null)
      return
    }

    suiClient.getBalance({ owner: currentAccount.address })
      .then((result) => {
        setBalance(BigInt(result.totalBalance))
      })
      .catch((e) => {
        console.error('Failed to fetch balance:', e)
        setBalance(null)
      })
  }, [currentAccount, suiClient, stakeRefreshKey])

  useEffect(() => {
    updateValidatorInUrl(validatorAddress)
  }, [validatorAddress])

  const amountError = useMemo(() => {
    if (!amount) return null
    const parsed = parseFloat(amount)
    if (isNaN(parsed)) return 'Invalid amount'
    if (parsed < 1) return 'Minimum stake is 1 SUI'
    return null
  }, [amount])

  const handleStake = async () => {
    if (!currentAccount) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }

    if (!validatorAddress.trim()) {
      setStatus({ type: 'error', message: 'Please enter a validator address' })
      return
    }

    const stakeAmountMist = parseSuiAmount(amount)

    if (!stakeAmountMist || stakeAmountMist <= 0n) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' })
      return
    }

    setStatus({ type: 'loading', message: 'Creating stake transaction...' })

    try {
      const tx = new Transaction()

      const [stakeCoin] = tx.splitCoins(tx.gas, [stakeAmountMist])

      tx.moveCall({
        target: `${SUI_SYSTEM_MODULE}::request_add_stake`,
        arguments: [
          tx.object(SUI_SYSTEM_STATE_OBJECT_ID),
          stakeCoin,
          tx.pure.address(validatorAddress.trim()),
        ],
      })

      setStatus({ type: 'loading', message: 'Waiting for wallet signature. Please verify the transaction\'s details in the wallet.' })

      const result = await signAndExecuteTransaction({
        transaction: tx,
      })

      const startTime = performance.now()

      setStatus({ type: 'loading', message: 'Waiting for transaction finalization...' })

      await suiClient.waitForTransaction({ digest: result.digest })

      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      setStatus({
        type: 'success',
        message: 'Stake successful!',
        txDigest: result.digest,
        duration,
      })

      setAmount('')
      setStakeRefreshKey((k) => k + 1)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to stake'
      })
    }
  }

  return (
    <div className="stake-form">
      <div className="form-group">
        <label htmlFor="validator">Validator</label>
        <ValidatorSelector
          value={validatorAddress}
          onChange={setValidatorAddress}
          onValidatorSelect={setSelectedValidator}
        />
      </div>

      {selectedValidator && (
        <ValidatorDetails validator={selectedValidator} myStake={myStake} />
      )}

      <div className="form-group">
        <div className="label-row">
          <label htmlFor="amount">Amount (SUI)</label>
          {balance !== null && (
            <span className="balance-hint">Max: {formatSuiAmount(balance, 4)} SUI</span>
          )}
        </div>
        <input
          id="amount"
          type="number"
          placeholder="Min 1 SUI"
          min="1"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={amountError ? 'input-error' : ''}
        />
        {amountError && <span className="field-error">{amountError}</span>}
      </div>

      <button
        className="stake-button"
        onClick={handleStake}
        disabled={!currentAccount || !selectedValidator || status.type === 'loading' || !amount || !!amountError}
      >
        {status.type === 'loading' ? 'Processing...' : 'Stake'}
      </button>

      {!currentAccount && (
        <div className="status error">Please connect your wallet to stake.</div>
      )}

      {status.message && currentAccount && (
        <div className={`status ${status.type}`}>
          {status.message}
          {status.txDigest && (
            <>
              {' '}
              <a
                href={`${TX_EXPLORER_BASE_URL}/${status.txDigest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                {status.txDigest.slice(0, 8)}...{status.txDigest.slice(-6)}
              </a>
            </>
          )}
          {status.duration !== undefined && (
            <span className="tx-duration"> ({(status.duration / 1000).toFixed(2)}s)</span>
          )}
        </div>
      )}
    </div>
  )
}

StakingForm.ConnectButton = ConnectButton
