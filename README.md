# Blockchain Microloan Platform

A decentralized platform for microloans powered by Ethereum smart contracts. This platform connects borrowers with lenders in a transparent and secure environment.

## Features

- Connect borrowers and lenders directly without intermediaries
- All loans tracked on the blockchain for complete transparency
- MetaMask integration for secure wallet management
- Support for both collateralized and uncollateralized loans
- Real-time transaction monitoring and loan status tracking

## Setup and Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MetaMask](https://metamask.io/) browser extension

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/blockchain-microloan-platform.git
   cd blockchain-microloan-platform
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your credentials:
   ```
   cp .env.example .env
   ```

### Running the Local Environment

For development and testing, you can use our automated setup script:

```
npm start
```

This will:
1. Start a local Hardhat node
2. Deploy the smart contract to the local network
3. Update the frontend configuration
4. Optionally start a web server

Alternatively, you can run each step manually:

1. Start a local Hardhat node:
   ```
   npx hardhat node
   ```

2. Deploy the contract to the local network:
   ```
   npm run deploy-local
   ```

3. Start the web server:
   ```
   npx http-server .
   ```

### Connecting MetaMask to Local Hardhat Network

1. Open MetaMask
2. Click on the network dropdown (usually says "Ethereum Mainnet")
3. Click "Add Network" or "Custom RPC"
4. Enter the following details:
   - Network Name: `Hardhat Local`
   - New RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
   - Block Explorer URL: *(leave blank)*
5. Import a test account using one of the private keys displayed when you start the Hardhat node

## Using the Platform

### As a Borrower

1. Connect your MetaMask wallet
2. Navigate to the Borrower Dashboard
3. Fill out the loan application form
4. Submit your application to the blockchain
5. Wait for a lender to fund your loan
6. Repay the loan before the due date

### As a Lender

1. Connect your MetaMask wallet
2. Navigate to the Lender Dashboard
3. Browse available loan applications
4. Fund a loan of your choice
5. Monitor your active investments
6. Collect repayments automatically via smart contract

## Troubleshooting

### Common Issues

1. **Transactions not showing in the table**
   - Make sure you're connected to the correct network in MetaMask
   - Try switching accounts and reconnecting
   - Check the browser console for any errors

2. **MetaMask transaction failing**
   - Ensure you have enough ETH in your account for gas fees
   - Check that the contract is deployed to the network you're connected to
   - Verify that you're using the right account for the operation

3. **Contract interaction errors**
   - Make sure the contract address in `js/contract.js` matches your deployed contract
   - Verify that the ABI in `js/contract.js` matches your compiled contract

## Development and Deployment

### Testing

Run the test suite:
```
npm test
```

### Deployment to Testnet

To deploy to the Sepolia testnet:

1. Ensure your `.env` file has SEPOLIA_RPC_URL and PRIVATE_KEY filled correctly
2. Run:
   ```
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3. Update the CONTRACT_ADDRESS in `js/contract.js` with the deployed address

## License

MIT

## Acknowledgements

- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.io/)
- [MetaMask](https://metamask.io/)
