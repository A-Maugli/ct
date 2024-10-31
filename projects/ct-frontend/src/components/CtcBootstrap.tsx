/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import { useSnackbar } from 'notistack'
import { ReactNode, useState } from 'react'
import { Ctc, CtcClient } from '../contracts/CTC'

/* Example usage
<CtcBootstrap
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call bootstrap"
  typedClient={typedClient}
  assetPrice={assetPrice}
  assetAmount={assetAmount}
  sellPeriodLength={sellPeriodLength}
  assetValidityPeriod={assetValidityPeriod}
/>
*/
type CtcBootstrapArgs = Ctc['methods']['bootstrap(uint64,uint64,uint64,uint64)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: CtcClient
  assetPrice: CtcBootstrapArgs['assetPrice']
  assetAmount: CtcBootstrapArgs['assetAmount']
  sellPeriodLength: CtcBootstrapArgs['sellPeriodLength']
  assetValidityPeriod: CtcBootstrapArgs['assetValidityPeriod']
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const CtcBootstrap = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer } = useWallet()
  const sender = { signer, addr: activeAddress! }
  const { enqueueSnackbar } = useSnackbar()

  const callMethod = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true)
    console.log(`Calling bootstrap`)
    try {
      enqueueSnackbar('Sending bootstap txn...', { variant: 'info' })
      const result = await props.typedClient.bootstrap(
        {
          assetPrice: props.assetPrice,
          assetAmount: props.assetAmount,
          sellPeriodLength: props.sellPeriodLength,
          assetValidityPeriod: props.assetValidityPeriod,
        },
        {
          sender: sender,
          sendParams: { fee: algokit.microAlgos(2_000) },
        },
      )
      //console.log('bootstrap result: ', result)
      enqueueSnackbar(`Transaction sent`, { variant: 'success' })
    } catch (e: any) {
      const msg = 'Transaction sending has failed'
      enqueueSnackbar(`${msg}, error: ${e}`, { variant: 'error' })
    }
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

export default CtcBootstrap
