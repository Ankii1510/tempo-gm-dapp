// Quick script to test contract reads
import { createPublicClient, http } from 'viem'

const tempoTestnet = {
    id: 42431,
    name: 'Tempo Testnet',
    rpcUrls: {
        default: { http: ['https://rpc.moderato.tempo.xyz'] }
    }
}

const GM_CONTRACT_ADDRESS = '0x86154b384d007aAd259Ea52D2eC40eeaA242590C'
const YOUR_ADDRESS = '0x0009A...976c' // Replace with your actual address from screenshot

const GM_ABI = [
    { name: 'totalGMs', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'getUserStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'count', type: 'uint256' }, { name: 'streak', type: 'uint256' }, { name: 'lastTime', type: 'uint256' }] }
]

const client = createPublicClient({ chain: tempoTestnet, transport: http() })

async function checkContract() {
    try {
        const totalGMs = await client.readContract({
            address: GM_CONTRACT_ADDRESS,
            abi: GM_ABI,
            functionName: 'totalGMs'
        })
        console.log('Total GMs:', totalGMs.toString())

        const stats = await client.readContract({
            address: GM_CONTRACT_ADDRESS,
            abi: GM_ABI,
            functionName: 'getUserStats',
            args: [YOUR_ADDRESS]
        })
        console.log('User Stats:', {
            count: stats[0].toString(),
            streak: stats[1].toString(),
            lastTime: stats[2].toString()
        })
    } catch (err) {
        console.error('Error:', err.message)
    }
}

checkContract()
