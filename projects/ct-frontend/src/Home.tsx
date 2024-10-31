/* eslint-disable no-console */
// src/components/Home.tsx
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet'
import React, { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import CtcBootstrap from './components/CtcBootstrap'
import CtcBuyAsset from './components/CtcBuyAsset'
import CtcClawback from './components/CtcClawback'
import CtcCreateApplication from './components/CtcCreateApplication'
import CtcSendAlgosToCreator from './components/CtcSendAlgosToCreator'
import { CtcClient } from './contracts/CTC'
import { getAlgodConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [appID, setAppID] = useState<number>(0)
  const [amount, setAmount] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()
  const [clawbackAddr, setClawbackAddr] = useState<string>('IVFPPA66JN4LTTNNNK3SDJGI4XIKMOT74IMWAF4ATTHPZ7YOSCDAN2UB7E')

  const adminMode = import.meta.env.VITE_ADMIN_MODE === 'true'
  const viteLocalnetAppId = import.meta.env.VITE_LOCALNET_APP_ID
  const viteTestnetAppId = import.meta.env.VITE_LOCALNET_APP_ID
  const viteMainnetAppId = import.meta.env.VITE_LOCALNET_APP_ID

  let paramAppId: number

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algodClient = algokit.getAlgoClient(algodConfig)

  if (algodConfig.network === '') {
    paramAppId = Number(viteLocalnetAppId)
  } else if (algodConfig.network === 'testnet') {
    paramAppId = Number(viteTestnetAppId)
  } else if (algodConfig.network === 'mainnet') {
    paramAppId = Number(viteMainnetAppId)
  } else {
    throw 'Invalid network in .env '
  }

  /*
  if (!adminMode) {
    setAppID(paramAppId)  // Too many re-renders
  }
*/
  useEffect(() => {
    //if (!adminMode) {
    {
      setAppID(paramAppId)
    }
  }, [adminMode, paramAppId]) // dependencies

  // Get the available amount of tokens
  const getAmount = async () => {
    console.log('getAmount() is called')
    try {
      const state = await typedClient.getGlobalState()
      setAmount(state.asaAmt!.asNumber())
    } catch (e: any) {
      if (e.message !== "Couldn't find global state") {
        console.warn(e)
      }
      setAmount(0)
    }
  }

  // Get the price of tokens
  const getPrice = async () => {
    try {
      const state = await typedClient.getGlobalState()
      setPrice(state.asaPrice!.asNumber())
    } catch (e: any) {
      if (e.message !== "Couldn't find global state") {
        console.warn(e)
      }
      setPrice(0)
    }
  }

  const handleBuyButtonClick = async () => {
    console.log('handleBuyButtonClick is called')
    await getAmount()
  }

  const handleClawbackButtonClick = async () => {
    console.log('handleCalwbackButtonClick is called')
    await getAmount()
  }

  const handleBootstrapButtonClick = async () => {
    console.log('handleCalwbackButtonClick is called')
    await getAmount()
    await getPrice()
  }

  // (When the appID changes,) call getAmount
  useEffect(() => {
    getAmount()
  }, [appID])

  // (When the appID changes,) call getPrice
  useEffect(() => {
    getPrice()
  }, [appID])

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const typedClient = new CtcClient(
    {
      resolveBy: 'id',
      id: appID,
    },
    algodClient,
  )

  return (
    <div className="hero min-h-screen bg-teal-400">
      <div className="hero-content text-center rounded-lg p-6 max-w-md bg-white mx-auto">
        <div className="max-w-md">
          <h1 className="text-4xl">
            Welcome in the DAO
            <br />
            of the <div className="font-bold">Circle of Trust</div>
          </h1>
          <p className="py-2">Selling of optional buying rights for the Circle of Trust</p>
          <p className="py-2">One token enables the purchase of 0.1% ownership share</p>

          <div className="grid">
            <div className="divider" />

            {adminMode && (
              <div>
                <button data-test-id="connect-wallet" className="btn m-2" onClick={toggleWalletModal}>
                  Connect to Wallet
                </button>
              </div>
            )}

            {adminMode && <p>Admin mode</p>}

            {adminMode && activeAddress && appID === 0 && (
              <div>
                <CtcCreateApplication
                  buttonClass="btn"
                  buttonLoadingNode={<span className="loading loading-spinner" />}
                  buttonNode="Create DAO" // CtcCreateApplication, only once!
                  typedClient={typedClient}
                  setAppID={setAppID}
                />
              </div>
            )}

            {adminMode && activeAddress && appID !== 0 && price == 0 && (
              <CtcBootstrap
                buttonClass="btn m-2"
                buttonLoadingNode={<span className="loading loading-spinner" />}
                buttonNode="Call bootstrap"
                typedClient={typedClient}
                assetPrice={BigInt(10_000)} // in /uAlgos
                assetAmount={10} // pieces
                sellPeriodLength={BigInt(1000)} // in sec
                assetValidityPeriod={BigInt(100)} // in sec
                onClick={handleBootstrapButtonClick}
              />
            )}

            {adminMode && activeAddress && appID !== 0 && (
              <div>
                <h2 className="font-bold m-2">DAO app id</h2>
                <input
                  type="number"
                  className="input input-bordered"
                  value={appID}
                  onChange={(ev) => setAppID(ev.currentTarget.valueAsNumber || 0)}
                ></input>
              </div>
            )}

            {adminMode && activeAddress && appID !== 0 && (
              <CtcSendAlgosToCreator
                buttonClass="btn m-2"
                buttonLoadingNode={<span className="loading loading-spinner" />}
                buttonNode="Call sendAlgosToCreator"
                typedClient={typedClient}
              />
            )}

            {adminMode && activeAddress && appID !== 0 && (
              <CtcClawback
                buttonClass="btn m-2"
                buttonLoadingNode={<span className="loading loading-spinner" />}
                buttonNode="Call clawback"
                typedClient={typedClient}
                addr={clawbackAddr}
                onClick={handleClawbackButtonClick}
              />
            )}

            {activeAddress && appID !== 0 && (
              <div>
                <h2 className="font-bold m-2">App id: {appID}</h2>
                <h2 className="font-bold m-2">Price of 1 token: {price / 1_000_000} Algo</h2>
                <h2 className="font-bold m-2">Number of tokens: {amount}</h2>
              </div>
            )}

            {!adminMode && (
              <div>
                <button data-test-id="connect-wallet" className="btn m-2" onClick={toggleWalletModal}>
                  Connect to Wallet
                </button>
              </div>
            )}

            {!adminMode && activeAddress && appID !== 0 && (
              <CtcBuyAsset
                buttonClass="btn m-2"
                buttonLoadingNode={<span className="loading loading-spinner" />}
                buttonNode="Buy CT Token"
                typedClient={typedClient}
                //payment={payment}
                onClick={handleBuyButtonClick}
              />
            )}
          </div>

          <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        </div>
      </div>
    </div>
  )
}

export default Home
