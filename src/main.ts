import '../style.css'
import { createPublicClient, createWalletClient, custom, http, formatUnits, defineChain, formatGwei } from 'viem'

const tempoTestnet = defineChain({
    id: 42431,
    name: 'Tempo Testnet',
    network: 'tempo-testnet',
    nativeCurrency: { decimals: 18, name: 'USD', symbol: 'USD' },
    rpcUrls: {
        default: { http: ['https://rpc.moderato.tempo.xyz'] },
        public: { http: ['https://rpc.moderato.tempo.xyz'] },
    },
    blockExplorers: { default: { name: 'Explore Tempo', url: 'https://explore.tempo.xyz' } },
})

const PATH_USD_ADDRESS = '0x20c0000000000000000000000000000000000000'
const ALPHA_USD_ADDRESS = '0x20c0000000000000000000000000000000000001'
const GM_CONTRACT_ADDRESS = '0xfBE3F1551e7E0aDC754d7Dd532F2c647EBf350D2' // Deployed on Moderato

const TIP20_ABI = [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }]

const GM_ABI = [
    { name: 'sendGM', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'message', type: 'string' }], outputs: [] },
    { name: 'totalGMs', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { name: 'getUserStats', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'count', type: 'uint256' }, { name: 'streak', type: 'uint256' }, { name: 'lastTime', type: 'uint256' }] },
    { name: 'getRecentMessages', type: 'function', stateMutability: 'view', inputs: [{ name: 'count', type: 'uint256' }], outputs: [{ name: 'senders', type: 'address[]' }, { name: 'messageTexts', type: 'string[]' }, { name: 'timestamps', type: 'uint256[]' }, { name: 'counts', type: 'uint256[]' }] },
    { name: 'getMessageCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
]

let account: `0x${string}` | null = null
let userTransactions: Array<{ hash: string, timestamp: number, status: 'success' | 'pending' | 'failed' }> = []

// DOM Elements
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement
const walletInfo = document.getElementById('wallet-info')!
const accountDisplay = document.getElementById('account-display')!
const balanceDisplay = document.getElementById('balance-display')!
const alphaBalanceDisplay = document.getElementById('alpha-balance-display')!
const contractAddressDisplay = document.getElementById('contract-address')!
const statsSection = document.getElementById('stats-section')!
const actionSection = document.getElementById('action-section')!
const gasPriceDisplay = document.getElementById('gas-price')!
const totalMessagesDisplay = document.getElementById('total-messages')!
const userMessagesDisplay = document.getElementById('user-messages')!
const streakDisplay = document.getElementById('streak-display')!
const sendGmBtn = document.getElementById('send-gm-btn') as HTMLButtonElement
const statusMsg = document.getElementById('status-msg')!
const txLinkContainer = document.getElementById('tx-link-container')!
const messageHistorySection = document.getElementById('message-history-section')!
const messageHistoryBody = document.getElementById('message-history-body')!
const transactionHistorySection = document.getElementById('transaction-history-section')!
const transactionHistoryBody = document.getElementById('transaction-history-body')!

const publicClient = createPublicClient({ chain: tempoTestnet, transport: http() })

function updateStatus(message: string, type: 'loading' | 'success' | 'error' = 'loading') {
    statusMsg.textContent = message
    statusMsg.className = `status-msg ${type}`
    console.log(`[Status] ${type.toUpperCase()}: ${message}`)
}

async function switchNetwork(ethereum: any) {
    const chainIdHex = `0x${tempoTestnet.id.toString(16)}`
    try {
        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
    } catch (err: any) {
        if (err.code === 4902) {
            await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{ chainId: chainIdHex, chainName: tempoTestnet.name, rpcUrls: [tempoTestnet.rpcUrls.default.http[0]], nativeCurrency: tempoTestnet.nativeCurrency, blockExplorerUrls: [tempoTestnet.blockExplorers.default.url] }]
            })
        }
    }
}

async function fetchGasPrice() {
    try {
        const gasPrice = await publicClient.getGasPrice()
        gasPriceDisplay.textContent = `${formatGwei(gasPrice)} Gwei`
    } catch (err) {
        gasPriceDisplay.textContent = 'N/A'
    }
}

async function fetchMessageHistory() {
    try {
        const result = await publicClient.readContract({
            address: GM_CONTRACT_ADDRESS as `0x${string}`,
            abi: GM_ABI,
            functionName: 'getRecentMessages',
            args: [BigInt(10)] // Get last 10 messages
        }) as [string[], string[], bigint[], bigint[]]

        const [senders, messages, timestamps, counts] = result

        if (senders.length === 0) {
            messageHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-state">No messages yet</td></tr>'
            return
        }

        messageHistoryBody.innerHTML = senders.map((sender, i) => `
            <tr>
                <td>${counts[i].toString()}</td>
                <td>${sender.slice(0, 6)}...${sender.slice(-4)}</td>
                <td>${messages[i]}</td>
                <td>${new Date(Number(timestamps[i]) * 1000).toLocaleString()}</td>
            </tr>
        `).reverse().join('')
    } catch (err) {
        console.error('Failed to fetch message history:', err)
        messageHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load messages</td></tr>'
    }
}

function displayTransactionHistory() {
    if (userTransactions.length === 0) {
        transactionHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-state">No transactions yet</td></tr>'
        return
    }

    transactionHistoryBody.innerHTML = userTransactions.map(tx => `
        <tr>
            <td><span class="status-badge status-${tx.status}">${tx.status}</span></td>
            <td><a href="https://explore.tempo.xyz/tx/${tx.hash}" target="_blank">${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}</a></td>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td><a href="https://explore.tempo.xyz/tx/${tx.hash}" target="_blank">View</a></td>
        </tr>
    `).reverse().join('')
}

async function refreshData() {
    if (!account) return

    try {
        // Fetch balances
        const balance = await publicClient.readContract({ address: PATH_USD_ADDRESS, abi: TIP20_ABI, functionName: 'balanceOf', args: [account] }).catch(() => BigInt(0)) as bigint
        balanceDisplay.textContent = `${parseFloat(formatUnits(balance, 18)).toFixed(2)}`

        const alphaBalance = await publicClient.readContract({ address: ALPHA_USD_ADDRESS, abi: TIP20_ABI, functionName: 'balanceOf', args: [account] }).catch(() => BigInt(0)) as bigint
        alphaBalanceDisplay.textContent = `${parseFloat(formatUnits(alphaBalance, 18)).toFixed(2)}`

        // Fetch contract stats
        const totalMessages = await publicClient.readContract({ address: GM_CONTRACT_ADDRESS as `0x${string}`, abi: GM_ABI, functionName: 'getMessageCount' }).catch(() => BigInt(0)) as bigint
        totalMessagesDisplay.textContent = totalMessages.toString()

        const stats = await publicClient.readContract({ address: GM_CONTRACT_ADDRESS as `0x${string}`, abi: GM_ABI, functionName: 'getUserStats', args: [account] }).catch(() => [BigInt(0), BigInt(0), BigInt(0)]) as [bigint, bigint, bigint]
        console.log('User Stats:', { count: stats[0].toString(), streak: stats[1].toString(), lastTime: stats[2].toString() })

        userMessagesDisplay.textContent = stats[0].toString()
        streakDisplay.textContent = stats[1].toString()

        // Fetch message history
        await fetchMessageHistory()

        // Update gas price
        await fetchGasPrice()

        updateStatus('Sync Complete.', 'success')
    } catch (err: any) {
        console.error('Data fetch failed:', err)
        updateStatus(`Sync Failed: ${err.message}`, 'error')
    }
}

async function connectWallet() {
    const ethereum = (window as any).ethereum
    if (!ethereum) return updateStatus('No Wallet Found.', 'error')

    try {
        await switchNetwork(ethereum)
        const walletClient = createWalletClient({ chain: tempoTestnet, transport: custom(ethereum) })
        const [address] = await walletClient.requestAddresses()
        account = address

        connectBtn.classList.add('hidden')
        walletInfo.classList.remove('hidden')
        statsSection.classList.remove('hidden')
        actionSection.classList.remove('hidden')
        messageHistorySection.classList.remove('hidden')
        transactionHistorySection.classList.remove('hidden')

        accountDisplay.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`
        contractAddressDisplay.textContent = GM_CONTRACT_ADDRESS

        updateStatus('Wallet Online.', 'success')
        await refreshData()
    } catch (err: any) {
        updateStatus('Connect Failed.', 'error')
    }
}

async function sendGM() {
    const ethereum = (window as any).ethereum
    console.log('Send GM Clicked. Account:', account, 'Ethereum:', !!ethereum)

    if (!account || !ethereum) {
        updateStatus('Wallet not connected.', 'error')
        return
    }

    updateStatus('Broadcasting Vibe...', 'loading')
    try {
        console.log('Initiating transaction with wallet client...')
        const walletClient = createWalletClient({ account, chain: tempoTestnet, transport: custom(ethereum) })
        const hash = await walletClient.writeContract({ address: GM_CONTRACT_ADDRESS as `0x${string}`, abi: GM_ABI, functionName: 'sendGM', args: ["GM! from Web App"] })

        // Add to transaction history
        userTransactions.push({ hash, timestamp: Date.now(), status: 'pending' })
        displayTransactionHistory()

        updateStatus('Finalizing...', 'loading')
        await publicClient.waitForTransactionReceipt({ hash })

        // Update transaction status
        const txIndex = userTransactions.findIndex(tx => tx.hash === hash)
        if (txIndex !== -1) userTransactions[txIndex].status = 'success'
        displayTransactionHistory()

        updateStatus('Vibe Sent! 🚀', 'success')
        txLinkContainer.innerHTML = `<a href="https://explore.tempo.xyz/tx/${hash}" target="_blank">View on Explorer</a>`

        // Poll for updates
        let attempts = 0
        const pollInterval = setInterval(async () => {
            attempts++
            console.log(`Polling attempt ${attempts}/5`)
            await refreshData()
            if (attempts >= 5) {
                clearInterval(pollInterval)
                console.log('Polling complete')
            }
        }, 1500)
    } catch (err: any) {
        updateStatus('Tx Failed.', 'error')
        console.error(err)
    }
}

connectBtn.addEventListener('click', connectWallet)
sendGmBtn.addEventListener('click', sendGM)

// Auto-refresh gas price every 15 seconds
setInterval(fetchGasPrice, 15000)
