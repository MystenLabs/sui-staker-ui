/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { SuiClient } from '@mysten/sui/client'
import { useSuiClient } from '@mysten/dapp-kit'
import { SUI_SYSTEM_STATE_OBJECT_ID } from './consts'

export interface Validator {
  name: string
  commissionRate: number  // Percentage (0-100)
  apy?: number            // Estimated APY percentage
  totalStake: bigint      // Total stake in MIST
  votingPower: number     // Voting power percentage
  gasPrice: bigint        // Gas price in MIST
  address: string         // Sui address
  netAddress: string      // Network address
  imageUrl?: string
  description?: string
  projectUrl?: string
  isPending?: boolean     // True if validator is pending (not yet active)
}

function decodeString(str: unknown): string {
  if (typeof str === 'string') return str
  
  if (str && typeof str === 'object' && 'fields' in str) {
    const fields = (str as { fields: { bytes?: number[] } }).fields
    if (fields?.bytes) {
      return new TextDecoder().decode(new Uint8Array(fields.bytes))
    }
  }
  
  if (str && typeof str === 'object' && 'bytes' in str) {
    const bytes = (str as { bytes: number[] }).bytes
    if (bytes) {
      return new TextDecoder().decode(new Uint8Array(bytes))
    }
  }
  return ''
}

export async function getPendingValidator(client: SuiClient, address: string): Promise<Validator | null> {
  try {
    const systemState = await client.getObject({
      id: SUI_SYSTEM_STATE_OBJECT_ID,
      options: { showContent: true }
    })

    if (!systemState.data?.content || systemState.data.content.dataType !== 'moveObject') {
      return null
    }

    const fields = systemState.data.content.fields as Record<string, unknown>
    const version = fields.version as string
    
    // 0x5 is a wrapper. The actual state is in a dynamic field with key=version.
    const innerState = await client.getDynamicFieldObject({
      parentId: SUI_SYSTEM_STATE_OBJECT_ID,
      name: {
        type: 'u64',
        value: version
      }
    })
    
    if (!innerState.data?.content || innerState.data.content.dataType !== 'moveObject') {
      return null
    }

    const innerFields = innerState.data.content.fields as Record<string, unknown>
    const value = innerFields.value as { fields?: Record<string, any>; validators?: any }
    const systemStateV = value.fields ? value.fields : value
    const validators = systemStateV.validators.fields as { validator_candidates?: { fields?: { id?: { id?: string } } } }
    
    const candidatesTableId = validators.validator_candidates?.fields?.id?.id

    if (!candidatesTableId) {
      return null
    }

    const pendingValidatorField = await client.getDynamicFieldObject({
      parentId: candidatesTableId,
      name: {
        type: 'address',
        value: address
      }
    })

    if (pendingValidatorField.error || !pendingValidatorField.data) {
      return null
    }

    const content = pendingValidatorField.data.content as { fields: Record<string, unknown>, dataType: string }
    if (content.dataType !== 'moveObject') return null

    // Check if it's a wrapper
    let validatorData = content.fields.value as any
    
    // Handle ValidatorWrapper
    if (validatorData?.type?.includes('::validator_wrapper::ValidatorWrapper') || validatorData?.fields?.inner) {
      // It's a wrapper. Inner is a Versioned object.
      const inner = validatorData.fields?.inner?.fields ? validatorData.fields.inner.fields : validatorData.fields.inner
      const versionedId = inner.id.id
      const versionedVersion = inner.version

      // Fetch the actual Validator object from the Versioned object dynamic field
      const validatorObject = await client.getDynamicFieldObject({
        parentId: versionedId,
        name: {
          type: 'u64',
          value: versionedVersion
        }
      })

      if (validatorObject.error || !validatorObject.data?.content || validatorObject.data.content.dataType !== 'moveObject') {
        return null
      }

      // The value of this dynamic field is the Validator
      const valContent = validatorObject.data.content.fields as Record<string, unknown>
      validatorData = valContent.value
    }

    if (validatorData?.fields) {
      validatorData = validatorData.fields
    }
    
    // Validator struct has metadata field which contains the details
    let metadata = validatorData
    if (validatorData.metadata) {
      metadata = validatorData.metadata.fields ? validatorData.metadata.fields : validatorData.metadata
    }

    if (!metadata.sui_address) {
      return null
    }

    return {
      name: decodeString(metadata.name) || 'Unknown Validator',
      commissionRate: Number(validatorData.commission_rate) / 100,
      apy: undefined,
      totalStake: BigInt(validatorData.next_epoch_stake || 0),
      votingPower: 0,
      gasPrice: BigInt(validatorData.gas_price),
      address: metadata.sui_address,
      netAddress: decodeString(metadata.net_address),
      imageUrl: decodeString(metadata.image_url),
      description: decodeString(metadata.description),
      projectUrl: decodeString(metadata.project_url),
      isPending: true,
    }
  } catch (e) {
    console.error("Error fetching pending validator", e)
    return null
  }
}

export function useValidators() {
  const [validators, setValidators] = useState<Validator[]>([])
  const [loading, setLoading] = useState(false)
  const suiClient = useSuiClient()

  useEffect(() => {
    const fetchValidators = async () => {
      setLoading(true)
      try {
        const [state, validatorsApy] = await Promise.all([
          suiClient.getLatestSuiSystemState(),
          suiClient.getValidatorsApy().catch(() => null)
        ])

        const apyMap = new Map<string, number>()
        if (validatorsApy) {
          validatorsApy.apys.forEach((a) => {
            apyMap.set(a.address, a.apy * 100)
          })
        }

        const totalVotingPower = state.activeValidators.reduce(
          (sum, v) => sum + BigInt(v.votingPower),
          0n
        )

        const validatorList: Validator[] = state.activeValidators.map((v) => {
          const votingPowerBigInt = BigInt(v.votingPower)
          const votingPowerPercent = totalVotingPower > 0n
            ? Number((votingPowerBigInt * 10000n) / totalVotingPower) / 100
            : 0

          return {
            name: v.name || 'Unknown Validator',
            commissionRate: Number(v.commissionRate) / 100,
            apy: apyMap.get(v.suiAddress),
            totalStake: BigInt(v.stakingPoolSuiBalance),
            votingPower: votingPowerPercent,
            gasPrice: BigInt(v.gasPrice),
            address: v.suiAddress,
            netAddress: v.netAddress,
            imageUrl: v.imageUrl || undefined,
            description: v.description || undefined,
            projectUrl: v.projectUrl || undefined,
          }
        })

        validatorList.sort((a, b) => a.name.localeCompare(b.name))
        setValidators(validatorList)
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchValidators()
  }, [suiClient])

  return { validators, loading }
}
