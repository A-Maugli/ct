/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import { ReactNode, useState } from 'react'
import { Ctc, CtcClient } from '../contracts/CTC'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

/* Example usage
<CtcClawback
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call clawback"
  typedClient={typedClient}
  addr={addr}
/>
*/
type CtcClawbackArgs = Ctc['methods']['clawback(address)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: CtcClient
  addr: CtcClawbackArgs['addr']
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const CtcClawback = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true)
    // get algodConfig and algodClient
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const algodClient = algokit.getAlgoClient(algodConfig)
    // get params
    const params = await algodClient.getTransactionParams().do()
    console.log('params: ', params)
    // get indexerConfig and indexerClient
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const indexerClient = algokit.getAlgoIndexerClient(indexerConfig)
    // get asset id
    const globalState = await props.typedClient.getGlobalState()
    const assetId = globalState.asaId!.asNumber()
    const asaV = globalState.asaV!.asNumber()
    console.log('Clawback asset id: ', assetId)
    console.log('ASA validity period:  ', asaV)
    // get app address
    const appRef = await props.typedClient.appClient.getAppReference()
    const appAddr = appRef.appAddress
    console.log('App address: ', appAddr)
    // find accounts with the given assetId
    const result = await indexerClient.searchAccounts().assetID(assetId).do()
    console.log('Accounts holding asset id: ', result)

    // get accounts eligible for clawback
    // the solution is an approximate solution, as the round times can vary
    // the correct solution would be to use a local key-value pair, to store the date of the coin purchase
    // and compare purchase_date + asa_v to current time
    for (let i = 0; i < result.accounts.length; i++) {
      for (let j = 0; j < result.accounts[i].assets.length; j++) {
        if (result.accounts[i].assets[j]['asset-id'] == assetId) {
          const delta_rounds = params.firstRound - result.accounts[i].assets[j]['opted-in-at-round']
          if (delta_rounds * 3 > 0) {
            //asaV) {
            if (result.accounts[i].address !== appAddr) {
              if (result.accounts[i].assets[j].amount === 1) {
                console.log('Try to clawback asset from account address ', result.accounts[i].address, ' delta_rounds: ', delta_rounds)
                // clawback aset, if asset-id == assetId  and  delta_rounds > 0  and  address !== appAddress  and  amount == 1
                await props.typedClient.clawback(
                  {
                    addr: result.accounts[i].address,
                  },
                  { sender, sendParams: { fee: algokit.microAlgos(2_000) }, assets: [assetId] },
                )
              }
            }
          }
        }
      }
    }

    /*--
    console.log(`Calling clawback`)
    console.log('Clawback addr: ', props.addr);
    // get asset
    const globalState1 = await props.typedClient.getGlobalState();
    const asset = globalState1.asa_id!.asNumber();
    console.log('Clawback asset: ', asset);

    // call clawback
    await props.typedClient.clawback(
      {
        addr: props.addr,
      },
      { sender, sendParams: { fee: algokit.microAlgos(2_000) }, assets: [asset]},
    )
--*/
    setLoading(false)
    if (props.onClick) {
      props.onClick(event)
    }
  }

  return (
    <button className={props.buttonClass} onClick={callMethod}>
      {loading ? props.buttonLoadingNode || props.buttonNode : props.buttonNode}
    </button>
  )
}

export default CtcClawback
