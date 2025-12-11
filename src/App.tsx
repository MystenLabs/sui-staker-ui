import { useState, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import '@mysten/dapp-kit/dist/index.css'
import { NetworkSelector } from './NetworkSelector'
import { getStoredNetwork, getStoredCustomUrl, type NetworkType } from './utils'
import { StakingForm } from './StakingForm'
import './App.css'

const queryClient = new QueryClient()

function App() {
  const [network, setNetwork] = useState<NetworkType>(getStoredNetwork)
  const [customUrl, setCustomUrl] = useState(getStoredCustomUrl)

  const networks = useMemo(() => {
    const config: Record<string, { url: string }> = {
      mainnet: { url: getFullnodeUrl('mainnet') },
      testnet: { url: getFullnodeUrl('testnet') },
    }

    if (network === 'custom' && customUrl) {
      config.custom = { url: customUrl }
    }

    return config
  }, [network, customUrl])

  const defaultNetwork = network === 'custom' && customUrl ? 'custom' : network === 'custom' ? 'mainnet' : network

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={defaultNetwork}>
        <WalletProvider autoConnect>
          <div className="page">
            <header className="header">
              <NetworkSelector
                network={network}
                customUrl={customUrl}
                onNetworkChange={setNetwork}
                onCustomUrlChange={setCustomUrl}
              />
              <div className="connect-button-wrapper">
                <StakingForm.ConnectButton />
              </div>
            </header>

            <div className="container">
              <h1>Sui Staker</h1>
              <StakingForm />
            </div>
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

export default App
