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

const main = async () => {
    printHeader();
    console.log(chalk.green(`Number of wallets: ${wallets.length}`));
    while (true) {
        console.log(chalk.cyan('\nMenu:'));
        console.log(chalk.cyan('1. Deploy Contract'));
        console.log(chalk.cyan('2. Exit'));

        const choice = readlineSync.questionInt('Enter your choice: ');

        switch (choice) {
            case 1:
                const contractPath = path.join(__dirname, 'FizzBuzzContract');
                const contractName = 'FizzBuzz';
                await deployContractsRandomly(contractPath, contractName);
                break;
            case 2:
                console.log(chalk.cyan('Exiting...'));
                return;
            default:
                console.log(chalk.red('Invalid choice. Please try again.'));
        }
    }
};

main().catch(console.error);
