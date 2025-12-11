import { useState } from 'react'
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import './App.css'

const MIST_PER_SUI = 1_000_000_000

function App() {
  const [validatorAddress, setValidatorAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | ''; message: string }>({ type: '', message: '' })

  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  const handleStake = async () => {
    if (!currentAccount) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' })
      return
    }

    if (!validatorAddress.trim()) {
      setStatus({ type: 'error', message: 'Please enter a validator address' })
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatus({ type: 'error', message: 'Please enter a valid amount' })
      return
    }

    const stakeAmountMist = BigInt(Math.floor(parseFloat(amount) * MIST_PER_SUI))

    setStatus({ type: 'loading', message: 'Creating stake transaction...' })

    try {
      const tx = new Transaction()

      const [stakeCoin] = tx.splitCoins(tx.gas, [stakeAmountMist])

      tx.moveCall({
        target: '0x3::sui_system::request_add_stake',
        arguments: [
          tx.object('0x5'),
          stakeCoin,
          tx.pure.address(validatorAddress.trim()),
        ],
      })

      setStatus({ type: 'loading', message: 'Waiting for wallet signature...' })

      const result = await signAndExecuteTransaction({
        transaction: tx,
      })

      await suiClient.waitForTransaction({ digest: result.digest })

      setStatus({
        type: 'success',
        message: `Stake successful! Transaction: ${result.digest}`
      })

      setValidatorAddress('')
      setAmount('')
    } catch (error) {
      console.error('Stake error:', error)
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to stake'
      })
    }
  }

  return (
    <div className="page">
      <header className="header">
        <ConnectButton />
      </header>

      <div className="container">
        <h1>Sui Staking</h1>

        <div className="stake-form">
        <div className="form-group">
          <label htmlFor="validator">Validator Address</label>
          <input
            id="validator"
            type="text"
            placeholder="0x..."
            value={validatorAddress}
            onChange={(e) => setValidatorAddress(e.target.value)}
            disabled={!currentAccount}
          />
        </div>

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
          />
        </div>

        <button
          className="stake-button"
          onClick={handleStake}
          disabled={!currentAccount || status.type === 'loading'}
        >
          {status.type === 'loading' ? 'Processing...' : 'Stake'}
        </button>

        {status.message && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default App
