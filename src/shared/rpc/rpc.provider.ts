import { Web3 } from 'web3';
import { ZKsyncPlugin } from 'web3-plugin-zksync';
import { RPC_CONFIG } from './rpc.config';

// Step 1: Create Web3 instance (can use dummy or L1 RPC)
const web3L2 = new Web3(RPC_CONFIG.L1); // or dummy like "http://localhost:8545"

// Step 2: Register ZKsync plugin with your L2 endpoint
web3L2.registerPlugin(new ZKsyncPlugin(RPC_CONFIG.L2));

// Step 3: L1 instance (optional, for deposits etc.)
const web3L1 = new Web3(RPC_CONFIG.L1);

// Step 4: Export
export { web3L1, web3L2 };
