# Circle of Trust

Used techologies: (1) algokit, (2) TealScript for contract writing, (3) Jest for contract testing, (4) React frontend.

`projects/ct-contracts/contracts/CTC.algo.ts` contains an Algorand smart contract for selling the partial ownership in a society called "Circle of Trust".

`projects/ct-contracts/__test__/CTC.test.ts` contains the Jest tests for `Ctc` Algorand smart contract. Ctc stands for 'Circle of Trust Coin`.

`projects/ct-frontend` contains the React files for the `Circle of Trust DAO`.

Client building and testing:
```
# go to client dir
cd projects/ct-contracts
# start Algorand localnet
algokit localnet start --no-dev
# Bootstrap project (npm install)
algokit project bootstrap all
# Compile contracts/CTC.algo.ts
npm run build
# Run __test__/CTC.test.ts
npm run test
```

Front end building and testing
```
# go to front end dir
cd projects/ct-frontend
# start Algorand localnet
algokit localnet start --no-dev
# Bootstrap project (npm install)
algokit project bootstrap all
# Run server
npm run dev
# CTRL + click on the link http://localhost:5173/ to start the front end in browser
```

In the browser:

Press `Connect to Wallet`, use `LocalNet Wallet` and `Close`.
Press `Create DAO`, then `Call bootstap`.

Edit `.env`, copy app id from web browser to `VITE_LOCALNET_APP_ID=number`.
Edit `.env`, set user mode as `VITE_ADMIN_MODE="false"`.
Press `Connect to Wallet`, then `Buy CT Token`. Note the successful txn.
Press `Buy CT Token` again. Note the failed txn, because one account can own only one CT Token.

Edit `.env`, set user mode as `VITE_ADMIN_MODE="true"`.
Press `Call sendAlgosToCreator`, if you want to send back Algos to the app creator.
Press `Call clawback` to clawback those CT coins, which have already expired.

Achievements: (1) Using an Algorand smart contract to selll optional buing rights,
(2) using clawback to return expired coins to the issuer,
(3) finding that the frontend has `8 high severity vulnerabilities` at 31-Oct-2024, 
because `@walletconnect/client` depends on vulnerable versions of `@walletconnect/core`
