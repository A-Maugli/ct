/* eslint-disable no-console */
import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing';
import * as algokit from '@algorandfoundation/algokit-utils';
import algosdk, { Transaction } from 'algosdk';
import { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account';
import { CtcClient } from '../contracts/clients/CTCClient';

const fixture = algorandFixture();
algokit.Config.configure({ populateAppCallResources: true });

let appClient: CtcClient;

describe('BizKor', () => {
  const log = false; // skip console.log() calls
  const paramAppVersion = 'v1.0'; // app version
  const paramAssetPrice = 1_000_000; // microAlgos
  const paramAssetAmountInitial = 10; // pieces
  const paramSellPeriodLength = 1000; // sec
  const paramAssetValidityPeriod = 100; // sec

  let acc1: algosdk.Account;
  let signer1: TransactionSignerAccount;
  let acc2: algosdk.Account;

  beforeEach(fixture.beforeEach);

  beforeAll(async () => {
    await fixture.beforeEach();
    const { algod, kmd } = fixture.context;

    acc1 = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'Buyer of CT token',
        fundWith: algokit.algos(100),
      },
      algod,
      kmd
    );
    if (log) console.log('acc1.addr (token buyer):', acc1.addr);
    // signer1 = algosdk.makeBasicAccountTransactionSigner(sender1);
    signer1 = {
      addr: acc1.addr,
      // eslint-disable-next-line no-unused-vars
      signer: async (txnGroup: Transaction[], indexesToSign: number[]) => {
        return txnGroup.map((tx) => tx.signTxn(acc1.sk));
      },
    };

    acc2 = await algokit.getOrCreateKmdWalletAccount(
      {
        name: 'App creator',
        fundWith: algokit.algos(100),
      },
      algod,
      kmd
    );
    if (log) console.log('acc2.addr (app creator):', acc2.addr);

    appClient = new CtcClient(
      {
        sender: acc2,
        resolveBy: 'id',
        id: 0,
      },
      algod
    );

    await appClient.create.createApplication({});
  });

  test('bootstrap', async () => {
    await appClient.appClient.fundAppAccount(algokit.microAlgos(600_000));
    const assetPrice = paramAssetPrice;
    const assetAmount = paramAssetAmountInitial;
    const sellPeriodLength = paramSellPeriodLength;
    const assetValidityPeriod = paramAssetValidityPeriod;
    // fee must be 2000 /uAlgos, due to the inner transaction
    await appClient.bootstrap(
      { assetPrice, assetAmount, sellPeriodLength, assetValidityPeriod },
      { sendParams: { fee: algokit.microAlgos(2_000) } }
    );
    const globalState = await appClient.getGlobalState();
    expect(globalState.asa_total?.asNumber()).toBe(assetAmount);
    expect(globalState.asa_amt?.asNumber()).toBe(assetAmount);
    expect(globalState.asa_price?.asNumber()).toBe(assetPrice);
  });

  test('getAppVersion', async () => {
    const version = await appClient.getAppVersion({});
    expect(version.return).toBe(paramAppVersion);
  });

  test('getAppCreatorAddress', async () => {
    const appCreatorAddress = await appClient.getAppCreatorAddress({});
    expect(appCreatorAddress.return).toBe(acc2.addr);
  });

  test('getAssetAmountInitial', async () => {
    const assetAmountInitial = await appClient.getAssetAmountInitial({});
    expect(assetAmountInitial.return).toBe(BigInt(paramAssetAmountInitial));
  });

  test('getAssetAmount', async () => {
    const assetAmountInitial = await appClient.getAssetAmount({});
    expect(assetAmountInitial.return).toBe(BigInt(paramAssetAmountInitial));
  });

  test('getAssetPrice', async () => {
    const assetPrice = await appClient.getAssetPrice({});
    expect(assetPrice.return).toBe(BigInt(paramAssetPrice));
  });

  test('getAssetId', async () => {
    const assetId = await appClient.getAssetId({});
    expect(assetId.return).toBeGreaterThan(BigInt(1_000));
  });

  test('getSellPeriodEnd', async () => {
    const sellPeriodEnd = await appClient.getSellPeriodEnd({});
    // get date/time
    const now = new Date();
    // get msec since 1970
    const millisecondsSinceEpoch = now.getTime();
    // get sec from msec
    const secondsSinceEpoch = Math.floor(millisecondsSinceEpoch / 1000);
    // check sellPeriodEnd
    if (log) console.log('sellPeriodEnd: ', sellPeriodEnd.return);
    expect(sellPeriodEnd.return).toBeGreaterThan(BigInt(secondsSinceEpoch)); // "algokit localnet reset" may be required
    expect(sellPeriodEnd.return).toBeLessThan(BigInt(secondsSinceEpoch + paramSellPeriodLength));
  });

  test('getGlobalState', async () => {
    const globalState = await appClient.getGlobalState();
    const apv = globalState.apv!.asByteArray();
    const apca = globalState.apca?.asByteArray();
    const asaTotal = globalState.asa_total?.asNumber();
    const asaAmt = globalState.asa_amt?.asNumber();
    const asaPrice = globalState.asa_price?.asNumber();
    const asaId = globalState.asa_id?.asNumber();
    const end = globalState.end?.asNumber();
    const asaV = globalState.asa_v?.asNumber();
    // console.log('globalState:', globalState);

    // get apvGood, i.e. without the length (first 2 bytes)
    const apvGood = Buffer.from(apv).slice(2).toString('utf-8'); // get rid of length
    if (log) console.log('apvGood: ', apvGood);
    expect(apvGood).toBe(paramAppVersion);
    // get apcaGood. i.e. encode 32 byte Algorand address as string
    const bufferApca = Buffer.from(apca!);
    if (log) console.log('bufferApca: ', bufferApca);
    if (log) console.log('bufferApca.length: ', bufferApca.length);
    const apcaGood = algosdk.encodeAddress(bufferApca); // encode as Algorand address
    if (log) console.log('apcaGood: ', apcaGood);
    expect(apcaGood).toBe(acc2.addr);

    if (log) console.log('getGlobalState apv (appVersion):', apv);
    if (log) console.log('getGlobalState apca (appCreatorAddress):', apca);
    if (log) console.log('getGlobalState asa_total (assetAmountInitial):', asaTotal);
    expect(asaTotal).toBe(paramAssetAmountInitial);
    if (log) console.log('getGlobalState asa_amt (assetAmount):', asaAmt);
    expect(asaAmt).toBe(paramAssetAmountInitial);
    if (log) console.log('getGlobalState asa_price (assetPrice):', asaPrice);
    expect(asaPrice).toBe(paramAssetPrice);
    console.log('getGlobalState asa_id (asset):', asaId);
    if (log) console.log('getGlobalState end (sellPeriodEnd):', end);
    if (log) console.log('getGlobalState asa_v (assetValidityPeriod):', asaV);
    expect(asaV).toBe(paramAssetValidityPeriod);
  });

  test('opt in to asset', async () => {
    const { algod } = fixture.context;
    const params = await algod.getTransactionParams().do();
    const globalState = await appClient.getGlobalState();
    const asset = globalState.asa_id!.asNumber();
    if (log) console.log('Try to opt in to asset: ', asset, acc1.addr);
    const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: acc1.addr,
      to: acc1.addr,
      amount: 0,
      assetIndex: asset,
      suggestedParams: params,
    });
    const stxn1 = txn1.signTxn(acc1.sk);
    const txn2 = await algod.sendRawTransaction(stxn1).do();
    await algosdk.waitForConfirmation(algod, txn2.txId, 4);
  });

  test('buyAsset', async () => {
    const { algod, testAccount } = fixture.context;
    const params = await algod.getTransactionParams().do();
    // Make a payment tx, to buy asset
    const appRef = await appClient.appClient.getAppReference();
    // const appAddres = await algosdk.getApplicationAddress(appRef.appId);
    if (log) console.log('buyAsset: testAccount.addr ', testAccount.addr);
    if (log) console.log('buyAsset: appRef.appAddress ', appRef.appAddress);
    if (log) console.log('buyAsset: appCreatorAddr ', acc2.addr);
    const tx1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: acc1.addr,
      to: appRef.appAddress,
      amount: paramAssetPrice,
      suggestedParams: params,
    });

    // Buy asset
    const globalState = await appClient.getGlobalState();
    const asset = globalState.asa_id!.asNumber();
    const compose = appClient.compose().buyAsset(
      {
        payment: tx1,
      },
      {
        sender: signer1,
        sendParams: {
          fee: algokit.microAlgos(5000),
        },
        assets: [Number(asset)],
      }
    );
    // atc, build group, sign, send
    const atc = await compose.atc();
    const txs = atc.buildGroup().map((tx) => tx.txn);
    const signed = await signer1.signer(
      txs,
      Array.from(Array(txs.length), (_, i) => i)
    );
    const txg = await algod.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(algod, txg.txId, 4);
  });

  test('buyAsset 2nd time', async () => {
    const { algod, testAccount } = fixture.context;
    const params = await algod.getTransactionParams().do();

    // Make a payment tx, to buy asset
    const appRef = await appClient.appClient.getAppReference();
    // const appAddres = await algosdk.getApplicationAddress(appRef.appId);
    if (log) console.log('buyAsset: testAccount.addr ', testAccount.addr);
    if (log) console.log('buyAsset: appRef.appAddress ', appRef.appAddress);
    if (log) console.log('buyAsset: appCreatorAddr ', acc2.addr);
    const tx1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: acc1.addr,
      to: appRef.appAddress,
      amount: paramAssetPrice,
      suggestedParams: params,
    });

    // Buy asset
    const globalState = await appClient.getGlobalState();
    const asset = globalState.asa_id!.asNumber();
    const compose = appClient.compose().buyAsset(
      {
        payment: tx1,
      },
      {
        sender: signer1,
        sendParams: {
          fee: algokit.microAlgos(5000),
        },
        assets: [Number(asset)],
      }
    );

    const atc = await compose.atc();
    const txs = atc.buildGroup().map((tx) => tx.txn);
    const signed = await signer1.signer(
      txs,
      Array.from(Array(txs.length), (_, i) => i)
    );
    try {
      await algod.sendRawTransaction(signed).do();
    } catch (err) {
      console.log('this test should fail, as the buyer already has a coin', err); // err.response.body.data.pc);
    }
  });

  test('sendAlgosToCreator', async () => {
    await appClient.sendAlgosToCreator({}, { sendParams: { fee: algokit.microAlgos(2_000) } });
  });

  test('clawback', async () => {
    await appClient.clawback({ addr: acc1.addr }, { sendParams: { fee: algokit.microAlgos(2_000) } });
  });

  test('buyAsset after clawback', async () => {
    const { algod, testAccount } = fixture.context;
    const params = await algod.getTransactionParams().do();
    // Make a payment tx, to buy asset
    const appRef = await appClient.appClient.getAppReference();
    // const appAddres = await algosdk.getApplicationAddress(appRef.appId);
    if (log) console.log('buyAsset: testAccount.addr ', testAccount.addr);
    if (log) console.log('buyAsset: appRef.appAddress ', appRef.appAddress);
    if (log) console.log('buyAsset: appCreatorAddr ', acc2.addr);
    const tx1 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: acc1.addr,
      to: appRef.appAddress,
      amount: paramAssetPrice,
      suggestedParams: params,
    });

    // Buy asset
    const globalState = await appClient.getGlobalState();
    const asset = globalState.asa_id!.asNumber();
    const compose = appClient.compose().buyAsset(
      {
        payment: tx1,
      },
      {
        sender: signer1,
        sendParams: {
          fee: algokit.microAlgos(5000),
        },
        assets: [Number(asset)],
      }
    );
    // atc, build group, sign, send
    const atc = await compose.atc();
    const txs = atc.buildGroup().map((tx) => tx.txn);
    const signed = await signer1.signer(
      txs,
      Array.from(Array(txs.length), (_, i) => i)
    );
    const txg = await algod.sendRawTransaction(signed).do();
    await algosdk.waitForConfirmation(algod, txg.txId, 4);
  });

  test('clawback again', async () => {
    await appClient.clawback({ addr: acc1.addr }, { sendParams: { fee: algokit.microAlgos(2_000) } });
  });

  test('opt out buyer from asset', async () => {
    const { algod } = fixture.context;
    const params = await algod.getTransactionParams().do();
    const globalState = await appClient.getGlobalState();
    const asset = globalState.asa_id!.asNumber();
    const appRef = await appClient.appClient.getAppReference();
    if (log) console.log('Try to opt out from asset: ', acc1.addr);
    const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: acc1.addr,
      to: appRef.appAddress,
      closeRemainderTo: appRef.appAddress,
      amount: 0,
      assetIndex: asset,
      suggestedParams: params,
    });
    const stxn1 = txn1.signTxn(acc1.sk);
    const txn2 = await algod.sendRawTransaction(stxn1).do();
    await algosdk.waitForConfirmation(algod, txn2.txId, 4);
  });

  test('deleteAsset', async () => {
    await appClient.deleteAsset({}, { sendParams: { fee: algokit.microAlgos(2_000) } });
  });

  test('deleteApplication', async () => {
    await appClient.delete.deleteApplication({}, { sendParams: { fee: algokit.microAlgos(2_000) } });
  });
});
