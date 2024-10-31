/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import { ReactNode, useState } from 'react'
import { Ctc, CtcClient } from '../contracts/CTC'

/* Example usage
<CtcClawbackNoInc
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call clawback"
  typedClient={typedClient}
  addr={addr}
/>
*/
type CtcClawbackNoIncArgs = Ctc['methods']['clawback(address)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: CtcClient
  addr: CtcClawbackNoIncArgs['addr']
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const CtcClawbackNoInc = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }

  const callMethod = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true)
    console.log(`Calling clawback`)
    console.log('Clawback addr: ', props.addr)
    // get asset
    const globalState1 = await props.typedClient.getGlobalState()
    const asset = globalState1.asaId!.asNumber()
    console.log('Clawback asset: ', asset)

    // call clawback
    await props.typedClient.clawback(
      {
        addr: props.addr,
      },
      { sender, sendParams: { fee: algokit.microAlgos(2_000) }, assets: [asset] },
    )
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

export default CtcClawbackNoInc
