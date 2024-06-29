
# FizzBuzz Smart Contract Bot

This project is a bot that deploys FizzBuzz smart contracts on the Fuel blockchain. The bot supports multiple wallets and randomizes processes.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Node.js**: Install Node.js from [nodejs.org](https://nodejs.org/).
- **Forc**: Install Forc (Fuel Orchestrator) by following the [installation instructions](https://fuellabs.github.io/sway/latest/forc/).
- **Fuel Network**: Connect to the Fuel testnet or mainnet.

## Installation

1. **Clone the Repository**

   ```sh
   git clone https://github.com/0xlimon/Fuel-Contract-Deployment.git
   cd Fuel-Contract-Deployment
   ```

2. **Install Dependencies**

   ```sh
   npm install
   ```


3. **Prepare Wallets**

   Create a `wallets.json` file in the root directory with the following format:

   ```json
   [
     {
       "address": "your_address_1",
       "privateKey": "your_private_key_1",
     },
     {
       "address": "your_address_2",
       "privateKey": "your_private_key_2",
     }
     // Add more wallets as needed
   ]
   ```

## Usage

1. **Run the Bot**

   ```sh
   node index.js
   ```

2. **Follow the On-Screen Instructions**

   - Deploy contracts for each wallet.

## Features

- **Randomized Deployment**: Deploy contracts for multiple wallets randomly.
- **Scheduled Interactions**: Interact with the contracts at random intervals.
- **Result Logging**: Log results for each wallet and contract.

## License

This project is licensed under the MIT License.
