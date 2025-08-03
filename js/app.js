// Configuración inicial
let web3;
let contract;
let userAddress = null;
const contractAddress = "0x..."; // Reemplaza con tu dirección de contrato

// Elementos del DOM
const connectWalletBtn = document.getElementById('connectWallet');
const walletInfoDiv = document.getElementById('walletInfo');
const walletAddressSpan = document.getElementById('walletAddress');
const walletBalanceSpan = document.getElementById('walletBalance');
const actionToggles = document.querySelectorAll('.action-toggle');
const transactionStatusDiv = document.getElementById('transactionStatus');
const statusMessage = document.getElementById('statusMessage');
const progressFill = document.querySelector('.progress-fill');

// ABI del contrato (simplificado - reemplaza con tu ABI real)
const contractABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "buyCarbonCredits",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "projectId", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "investInProject",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCreditPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Event Listeners
connectWalletBtn.addEventListener('click', connectWallet);
actionToggles.forEach(toggle => {
  toggle.addEventListener('click', () => toggleForm(toggle));
});

document.getElementById('bonoAmount').addEventListener('input', updateBuyEstimate);
document.getElementById('submitBuy').addEventListener('click', submitBuy);
document.getElementById('submitInvest').addEventListener('click', submitInvest);

// Conectar wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      userAddress = accounts[0];
      
      // Mostrar información de la wallet
      walletAddressSpan.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
      walletInfoDiv.classList.remove('hidden');
      connectWalletBtn.innerHTML = '<i class="ri-wallet-3-fill"></i> Wallet Conectada';
      connectWalletBtn.style.backgroundColor = '#1b5e20';
      
      // Inicializar Web3
      web3 = new Web3(window.ethereum);
      
      // Inicializar contrato
      contract = new web3.eth.Contract(contractABI, contractAddress);
      
      // Obtener balance
      const balance = await web3.eth.getBalance(userAddress);
      const ethBalance = web3.utils.fromWei(balance, 'ether');
      walletBalanceSpan.textContent = parseFloat(ethBalance).toFixed(4);
      
    } catch (error) {
      console.error('Error al conectar con MetaMask:', error);
      showTransactionStatus('Error al conectar con MetaMask: ' + error.message, 5000);
    }
  } else {
    showTransactionStatus('Por favor instala MetaMask para usar esta aplicación', 5000);
  }
}

// Alternar formularios
function toggleForm(toggleButton) {
  const targetId = toggleButton.getAttribute('data-target');
  const form = document.getElementById(targetId);
  
  // Cerrar todos los formularios primero
  document.querySelectorAll('.action-form').forEach(f => {
    if (f.id !== targetId) {
      f.classList.add('hidden');
      f.previousElementSibling.classList.remove('active');
    }
  });
  
  // Alternar el formulario clickeado
  form.classList.toggle('hidden');
  toggleButton.classList.toggle('active');
}

// Actualizar estimación de compra
async function updateBuyEstimate() {
  if (!contract) return;
  
  try {
    const amount = document.getElementById('bonoAmount').value;
    const pricePerBono = await contract.methods.getCreditPrice().call();
    const priceInEth = web3.utils.fromWei(pricePerBono, 'ether');
    const estimate = amount * priceInEth;
    document.getElementById('buyPriceEstimate').textContent = estimate.toFixed(6);
  } catch (error) {
    console.error('Error al obtener precio:', error);
  }
}

// Enviar compra
async function submitBuy(e) {
  e.preventDefault();
  if (!userAddress || !contract) {
    showTransactionStatus('Conecta tu wallet primero', 3000);
    return;
  }
  
  const amount = document.getElementById('bonoAmount').value;
  const paymentWallet = document.getElementById('paymentWallet').value || userAddress;
  
  if (!amount || amount <= 0) {
    showTransactionStatus('Ingresa una cantidad válida', 3000);
    return;
  }
  
  try {
    showTransactionStatus('Enviando transacción...');
    
    const pricePerBono = await contract.methods.getCreditPrice().call();
    const totalWei = pricePerBono * amount;
    
    const result = await contract.methods.buyCarbonCredits(amount)
      .send({ 
        from: paymentWallet,
        value: totalWei
      });
    
    showTransactionStatus('Compra exitosa!', 5000);
    console.log('Transacción:', result);
    
  } catch (error) {
    console.error('Error en la compra:', error);
    showTransactionStatus('Error en la compra: ' + error.message, 5000);
  }
}

// Enviar inversión
async function submitInvest(e) {
  e.preventDefault();
  if (!userAddress || !contract) {
    showTransactionStatus('Conecta tu wallet primero', 3000);
    return;
  }
  
  const projectId = document.getElementById('projectSelect').value;
  const amount = document.getElementById('investmentAmount').value;
  const investmentWallet = document.getElementById('investmentWallet').value || userAddress;
  
  if (!projectId) {
    showTransactionStatus('Selecciona un proyecto', 3000);
    return;
  }
  
  if (!amount || amount <= 0) {
    showTransactionStatus('Ingresa un monto válido', 3000);
    return;
  }
  
  try {
    showTransactionStatus('Enviando transacción...');
    
    const amountWei = web3.utils.toWei(amount.toString(), 'ether');
    
    const result = await contract.methods.investInProject(projectId, amountWei)
      .send({ 
        from: investmentWallet,
        value: amountWei
      });
    
    showTransactionStatus('Inversión exitosa!', 5000);
    console.log('Transacción:', result);
    
  } catch (error) {
    console.error('Error en la inversión:', error);
    showTransactionStatus('Error en la inversión: ' + error.message, 5000);
  }
}

// Mostrar estado de transacción
function showTransactionStatus(message, duration = 3000) {
  statusMessage.textContent = message;
  transactionStatusDiv.classList.remove('hidden');
  progressFill.style.width = '100%';
  
  if (duration) {
    setTimeout(() => {
      progressFill.style.width = '0%';
      setTimeout(() => {
        transactionStatusDiv.classList.add('hidden');
      }, 500);
    }, duration);
  }
}