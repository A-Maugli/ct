/* eslint-disable no-console */
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import * as algosdk from 'algosdk'
import { useSnackbar } from 'notistack'
import { ReactNode, useState } from 'react'
import { Ctc, CtcClient } from '../contracts/CTC'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

/* Example usage
<CtcBuyAsset
  buttonClass="btn m-2"
  buttonLoadingNode={<span className="loading loading-spinner" />}
  buttonNode="Call buyAsset"
  typedClient={typedClient}
  payment={payment}
/>
*/
type CtcBuyAssetArgs = Ctc['methods']['buyAsset(pay)void']['argsObj']

type Props = {
  buttonClass: string
  buttonLoadingNode?: ReactNode
  buttonNode: ReactNode
  typedClient: CtcClient
  //payment: CtcBuyAssetArgs['payment']
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const CtcBuyAsset = (props: Props) => {
  const [loading, setLoading] = useState<boolean>(false)
  const { activeAddress, signer, sendTransactions } = useWallet()
  const sender = { signer, addr: activeAddress! }
  const { enqueueSnackbar } = useSnackbar()

  const callMethod = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true)

    const algodConfig = getAlgodConfigFromViteEnvironment()
    const algod = algokit.getAlgoClient({
      server: algodConfig.server,
      port: algodConfig.port,
      token: algodConfig.token,
    })

    console.log(`Opt in to asset`)
    const params = await algod.getTransactionParams().do()
    const globalState = await props.typedClient.getGlobalState()
    const asset = globalState.asaId!.asNumber()
    const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: activeAddress!,
      to: activeAddress!,
      amount: 0,
      assetIndex: asset,
      suggestedParams: params,
    })
    algokit.sendTransaction({ transaction: txn1, from: sender }, algod)

    console.log(`Calling buyAsset`)
    const appRef = await props.typedClient.appClient.getAppReference()
    const appAddr = appRef.appAddress
    const price = globalState.asaPrice!.asNumber()

    const tx1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: activeAddress!,
      to: appAddr!,
      amount: price,
      suggestedParams: params,
    })

    const compose = props.typedClient.compose().buyAsset(
      {
        payment: tx1,
      },
      {
        sender: sender,
        sendParams: {
          fee: algokit.microAlgos(5000),
        },
        assets: [Number(asset)],
      },
    )

    const atc = await compose.atc()
    const txs = atc.buildGroup().map((tx) => tx.txn)
    const signed = await signer(
      txs,
      Array.from(Array(txs.length), (_, i) => i),
    )
    //const { txId } = await algod.sendRawTransaction(signed).do();
    //console.log('buyAsset txId:', txId);

    try {
      enqueueSnackbar('Sending transaction to buy asset...', { variant: 'info' })
      const waitRoundsToConfirm = 4
      const { id } = await sendTransactions(signed, waitRoundsToConfirm)
      enqueueSnackbar(`Transaction sent: ${id}`, { variant: 'success' })
    } catch (e: any) {
      const msg = 'Transaction sending has failed'
      if (e.response.body.data.pc === 464) {
        enqueueSnackbar(`${msg}, because the tranaction type is not payment txn`, { variant: 'error' })
      } else if (e.response.body.data.pc === 479) {
        enqueueSnackbar(`${msg}, because selling period has ended`, { variant: 'error' })
      } else if (e.response.body.data.pc === 489) {
        enqueueSnackbar(`${msg}, because the buyer already owns such a coin`, { variant: 'error' })
      } else if (e.response.body.data.pc === 497) {
        enqueueSnackbar(`${msg}, because the sender of the payment txn is different from the sender of the app call txn`, {
          variant: 'error',
        })
      } else if (e.response.body.data.pc === 505) {
        enqueueSnackbar(`${msg}, because the payment sent not to the app address`, { variant: 'error' })
      } else if (e.response.body.data.pc === 514) {
        enqueueSnackbar(`${msg}, because the payment amount is less than the price of the token`, { variant: 'error' })
      } else if (e.response.body.data.pc === 523) {
        enqueueSnackbar(`${msg}, because the payment amount is greater then the price of the token`, { variant: 'error' })
      } else if (e.response.body.data.pc === 528) {
        enqueueSnackbar(`${msg}, because there are no more sellable tokens`, { variant: 'error' })
      } else {
        enqueueSnackbar(`${msg}, error: ${e}`, { variant: 'error' })
      }
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

export default CtcBuyAsset
