import dotenv from 'dotenv';
dotenv.config();
import { Wallet, ContractFactory, Provider, Contract } from 'fuels';
import readlineSync from 'readline-sync';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import colors from 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const providerUrl = 'https://testnet.fuel.network/v1/graphql';
const provider = await Provider.create(providerUrl, { timeout: 30000 });

const wallets = JSON.parse(fs.readFileSync('wallets.json', 'utf8'));


const compileContract = (contractPath) => {
    try {
        execSync(`forc build --path ${contractPath}`, { stdio: 'inherit' });
        console.log(chalk.green('Contract compiled successfully.'));
    } catch (error) {
        console.error(chalk.red('Failed to compile contract:'), error.message);
        throw error;
    }
};

const printHeader = () => {
    console.log(colors.cyan.bold(`   ___       _      _                       `));
    console.log(colors.cyan.bold(`  / _ \\     | |    (_)                      `));
    console.log(colors.cyan.bold(` | | | |_  _| |     _ _ __ ___   ___  _ __  `));
    console.log(colors.cyan.bold(` | | | \\ \\/ / |    | | '_ ' _ \\ / _ \\| '_ \\ `));
    console.log(colors.cyan.bold(` | |_| |>  <| |____| | | | | | | (_) | | | |`));
    console.log(colors.cyan.bold(`  \\___//_/\\_\\______|_|_| |_| |_|\\___/|_| |_|`));
    console.log(colors.cyan.bold(`                                            `));
    console.log(colors.cyan.bold(`                                            `));
    console.log(colors.cyan("  https://github.com/0xlimon"));
    console.log(colors.cyan("******************************************************"));
};


const saveDeployedContractInfo = (wallet, contractAddress) => {
    const filename = 'deployed_contracts.json';
    let deployedContracts = {};

    if (fs.existsSync(filename)) {
        deployedContracts = JSON.parse(fs.readFileSync(filename));
    }

    deployedContracts[wallet.address] = {
        privateKey: wallet.privateKey,
        contractAddress: contractAddress,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(filename, JSON.stringify(deployedContracts, null, 4));
};

const loadDeployedContractInfo = () => {
    const filename = 'deployed_contracts.json';
    if (fs.existsSync(filename)) {
        return JSON.parse(fs.readFileSync(filename));
    }
    return {};
};

const deployContract = async (contractPath, contractName, wallet) => {
    compileContract(contractPath);

    const spinner = ora(`Deploying contract ${contractName} with wallet ${wallet.address.slice(0, 6)}...`).start();
    try {
        const abiPath = path.join(contractPath, 'out/debug', `${contractName}-abi.json`);
        const binPath = path.join(contractPath, 'out/debug', `${contractName}.bin`);
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        const bytecode = fs.readFileSync(binPath);

        const walletInstance = Wallet.fromPrivateKey(wallet.privateKey, provider);
        const factory = new ContractFactory(bytecode, abi, walletInstance);
        const contract = await factory.deployContract();
        const contractId = contract.id;
        spinner.succeed('Contract deployed.');
        return contractId;
    } catch (error) {
        spinner.fail(`Failed to deploy contract: ${error.message}`);
        throw error;
    }
};

const sendTransaction = async () => {
    const toAddress = readlineSync.question('Enter the recipient address: ');
    const [minAmount, maxAmount] = readlineSync.question('Enter the token amount range (min,max): ').split(',').map(Number);
    const [minDelay, maxDelay] = readlineSync.question('Enter the delay range between transactions in seconds (min,max): ').split(',').map(Number);

    while (true) {
        const amount = (Math.random() * (maxAmount - minAmount) + minAmount).toFixed(4);
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        const tx = {
            to: toAddress,
            value: amount,
            gasLimit: 21000,
        };

        const response = await wallet.sendTransaction(tx);
        console.log(chalk.blue(`Transaction sent with hash: ${response.transactionHash} - Amount: ${amount} FUEL - Delay: ${delay}s`));

        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
};

const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const deployContractsRandomly = async (contractPath, contractName) => {
    const deployedContracts = loadDeployedContractInfo();

    for (const wallet of wallets) {
        if (!deployedContracts[wallet.address]) {
            const delay = randomDelay(5000, 10000); 
            console.log(chalk.blue(`Waiting for ${delay / 1000} seconds before deploying contract for wallet ${wallet.address.slice(0, 6)}...`));
            await new Promise(resolve => setTimeout(resolve, delay));
            const contractAddress = await deployContract(contractPath, contractName, wallet);
            saveDeployedContractInfo(wallet, contractAddress);
        } else {
            console.log(chalk.yellow(`Contract already deployed for wallet ${wallet.address.slice(0, 6)}...`));
        }
    }
};

const generateBiasedRandomNumber = () => {
    const random = Math.random();
    if (random < 0.33) {
        return 3 * (Math.floor(Math.random() * 33) + 1); 
    } else if (random < 0.66) {
        return 5 * (Math.floor(Math.random() * 20) + 1);
    } else {
        return 15 * (Math.floor(Math.random() * 7) + 1); 
    }
};

// تابع برای تعامل با کانترکت
const interactWithContract = async () => {
    const deployedContracts = loadDeployedContractInfo();
    const walletAddresses = Object.keys(deployedContracts);

    if (walletAddresses.length === 0) {
        console.log(chalk.red('No contracts found. Please deploy a contract first.'));
        return;
    }

    const [minTransactions, maxTransactions] = readlineSync.question('Enter the daily transaction range (min,max): ').split(',').map(Number);

    const walletTransactions = walletAddresses.map(address => {
        return {
            address,
            dailyTransactions: randomDelay(minTransactions, maxTransactions)
        };
    });

    console.log(chalk.yellow('Daily transactions assigned for each wallet:'));
    walletTransactions.forEach(({ address, dailyTransactions }) => {
        console.log(chalk.yellow(`Wallet: ${address.slice(0, 6)}... | Daily Transactions: ${dailyTransactions}`));
    });

    const interact = async (walletAddress, dailyTransactions) => {
        const walletInfo = deployedContracts[walletAddress];
        const walletInstance = Wallet.fromPrivateKey(walletInfo.privateKey, provider);
        const contractAddress = walletInfo.contractAddress;
        const abiPath = path.join(__dirname, 'FizzBuzzContract', 'out/debug', `FizzBuzz-abi.json`);
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        const contract = new Contract(contractAddress, abi, walletInstance);

        const totalMillisecondsInDay = 24 * 60 * 60 * 1000;
        const delays = Array.from({ length: dailyTransactions - 1 }, () => randomDelay(1, totalMillisecondsInDay));
        delays.sort((a, b) => a - b);

        for (let i = 0; i < dailyTransactions; i++) {
            try {
                const input = generateBiasedRandomNumber();
                const response = await contract.functions.fizzbuzz(input).txParams({ gasLimit: 100000 }).call();
                const result = response.value;

                // نمایش نتیجه FizzBuzz
                let resultText = '';
                switch (result) {
                    case 'Fizz':
                        resultText = 'Fizz';
                        break;
                    case 'Buzz':
                        resultText = 'Buzz';
                        break;
                    case 'FizzBuzz':
                        resultText = 'FizzBuzz';
                        break;
                    default:
                        if (result && typeof result === 'object' && 'Other' in result) {
                            resultText = `Other: ${result.Other}`;
                        } else {
                            resultText = 'Unknown result';
                        }
                        break;
                }

                if (i < dailyTransactions - 1) {
                    const delay = delays[i] - (delays[i - 1] || 0); 
                    console.log(chalk.green(`Wallet: ${walletAddress.slice(0, 6)}... | Contract: ${contractAddress.slice(0, 6)}... | Transaction Hash: ${response.transactionId} | Result: ${resultText} | Next interaction: ${delay / 1000} seconds`));
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.log(chalk.green(`Wallet: ${walletAddress.slice(0, 6)}... | Contract: ${contractAddress.slice(0, 6)}... | Transaction Hash: ${response.transactionId} | Result: ${resultText} | All interactions completed for today`));
                }
            } catch (error) {
                console.error(chalk.red(`Failed to interact with contract: ${error.message}`));
                console.error(chalk.red(`Error details: ${JSON.stringify(error.metadata, null, 2)}`));
            }
        }
    };

    const interactionPromises = walletTransactions.map(({ address, dailyTransactions }) => interact(address, dailyTransactions));
    await Promise.all(interactionPromises);
};

const main = async () => {
    printHeader();
    console.log(chalk.green(`Number of wallets: ${wallets.length}`));
    while (true) {
        console.log(chalk.cyan('\nMenu:'));
        console.log(chalk.cyan('1. Deploy Contract'));
        console.log(chalk.cyan('2. Send Transaction'));
        console.log(chalk.cyan('3. Interact with Contract'));
        console.log(chalk.cyan('4. Exit'));

        const choice = readlineSync.questionInt('Enter your choice: ');

        switch (choice) {
            case 1:
                const contractPath = path.join(__dirname, 'FizzBuzzContract');
                const contractName = 'FizzBuzz';
                await deployContractsRandomly(contractPath, contractName);
                break;
            case 2:
                await sendTransaction();
                break;
            case 3:
                await interactWithContract();
                break;
            case 4:
                console.log(chalk.cyan('Exiting...'));
                return;
            default:
                console.log(chalk.red('Invalid choice. Please try again.'));
        }
    }
};

main().catch(console.error);
