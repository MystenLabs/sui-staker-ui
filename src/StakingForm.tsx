import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { ValidatorSelector } from './ValidatorSelector'
import { parseSuiAmount } from './utils'
import { SUI_SYSTEM_STATE_OBJECT_ID, SUI_SYSTEM_MODULE, TX_EXPLORER_BASE_URL } from './consts'
import { type Validator } from './validator'
import { ValidatorDetails } from './ValidatorDetails'

interface StatusState {
  type: 'success' | 'error' | 'loading' | ''
  message: string
  txDigest?: string
  duration?: number
}

export function StakingForm() {
  const [validatorAddress, setValidatorAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<StatusState>({ type: '', message: '' })
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null)
  const [myStake, setMyStake] = useState<bigint | null | undefined>(null)
  const [stakeRefreshKey, setStakeRefreshKey] = useState(0)

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

  const handleValidatorSelect = useCallback((validator: Validator | null) => {
    setSelectedValidator(validator)
  }, [])

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
        message: `Stake successful!`,
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
          onValidatorSelect={handleValidatorSelect}
          disabled={!currentAccount}
        />
      </div>

      {selectedValidator && (
        <ValidatorDetails validator={selectedValidator} myStake={myStake} />
      )}

      <div className="form-group">
        <label htmlFor="amount">Amount (SUI)</label>
        <input
          id="amount"
          type="number"
          placeholder="1.0"
          min="1"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!currentAccount}
          className={amountError ? 'input-error' : ''}
        />
        {amountError && <span className="field-error">{amountError}</span>}
      </div>

      <button
        className="stake-button"
        onClick={handleStake}
        disabled={!currentAccount || !selectedValidator || status.type === 'loading' || !!amountError}
      >
        {status.type === 'loading' ? 'Processing...' : 'Stake'}
      </button>

      {status.message && (
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
