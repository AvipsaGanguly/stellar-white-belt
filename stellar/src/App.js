import "./App.css";
import { checkWallet } from "./components/Freighter";
import { signTransaction } from "@stellar/freighter-api";
import { useState, useEffect } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";

function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [payments, setPayments] = useState([]);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [txStatus, setTxStatus] = useState(""); // "", "sending", "success", "error"
  const [txStatusMsg, setTxStatusMsg] = useState("");
  const [txHash, setTxHash] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const server = new StellarSdk.Horizon.Server(
    "https://horizon-testnet.stellar.org"
  );

  // Fetch recent payments for account
  const fetchRecentPayments = async (walletAddress) => {
    try {
      const paymentsResult = await server
        .payments()
        .forAccount(walletAddress)
        .order("desc")
        .limit(5)
        .call();
      setPayments(paymentsResult.records || []);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  };

  // Automatically fetch payments if address changes
  useEffect(() => {
    if (address) {
      fetchRecentPayments(address);
      
      // Set up a polling interval every 20 seconds to refresh balance & history
      const interval = setInterval(async () => {
        try {
          const account = await server.loadAccount(address);
          const xlmBalance = account.balances.find(
            (b) => b.asset_type === "native"
          );
          if (xlmBalance) setBalance(xlmBalance.balance);
          fetchRecentPayments(address);
        } catch (e) {
          console.error("Auto-refresh failed:", e);
        }
      }, 20000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setTxStatusMsg("");
    try {
      const walletAddress = await checkWallet();

      if (walletAddress) {
        setAddress(walletAddress);
        setIsModalOpen(false);

        const account = await server.loadAccount(walletAddress);
        const xlmBalance = account.balances.find(
          (b) => b.asset_type === "native"
        );

        if (xlmBalance) {
          setBalance(xlmBalance.balance);
        }
      } else {
        setTxStatusMsg("Could not connect to Freighter. Please unlock your wallet extension.");
      }
    } catch (error) {
      console.error(error);
      setTxStatusMsg("Connection error. Make sure Freighter is installed and unlocked.");
    } finally {
      setIsConnecting(false);
    }
  };

  const copyToClipboard = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopyFeedback(true);
    setTimeout(() => {
      setCopyFeedback(false);
    }, 2000);
  };

  const sendXLM = async () => {
    try {
      if (!recipient || !amount) {
        setTxStatus("error");
        setTxStatusMsg("Please enter recipient and amount");
        return;
      }

      setTxStatus("sending");
      setTxStatusMsg("Initiating Stellar network transaction...");
      setTxHash("");

      const sourceAccount = await server.loadAccount(address);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: recipient,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      const signed = await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signed.signedTxXdr,
        StellarSdk.Networks.TESTNET
      );

      const result = await server.submitTransaction(signedTx);

      setTxStatus("success");
      setTxStatusMsg("Transaction Successful!");
      setTxHash(result.hash);

      // Reset transaction inputs
      setRecipient("");
      setAmount("");

      // Update balance and payment log immediately
      const updatedAccount = await server.loadAccount(address);
      const updatedBalance = updatedAccount.balances.find(
        (b) => b.asset_type === "native"
      );

      if (updatedBalance) {
        setBalance(updatedBalance.balance);
      }
      fetchRecentPayments(address);

    } catch (error) {
      console.error(error);
      setTxStatus("error");
      setTxStatusMsg("Transaction Failed. Check input fields or wallet balance.");
    }
  };

  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <div className="navbar">
        <div className="logo-container">
          <div className="logo-icon">Æ</div>
          <h2>Aether Stellar</h2>
        </div>

        {address && (
          <div className="wallet-info">
            <div className="network-badge">Testnet</div>
            
            <div 
              className="card address-card" 
              onClick={copyToClipboard}
              title="Click to copy address"
            >
              <span>{truncateAddress(address)}</span>
              {copyFeedback ? (
                <span style={{ color: "var(--success)", fontSize: "0.75rem" }}>copied!</span>
              ) : (
                <svg className="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </div>

            <div className="card">
              Balance: {Number(balance).toFixed(4)} XLM
            </div>

            <button
              className="connected-btn"
              onClick={() => {
                setAddress("");
                setBalance("");
                setTxHash("");
                setTxStatus("");
                setTxStatusMsg("");
                setPayments([]);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* BODY CONTENT */}
      {!address ? (
        <div className="intro-panel">
          <div className="intro-badge">STELLAR BLOCKCHAIN CONNECT</div>
          <h1>Decentralized Assets,<br />Beautifully Simple.</h1>
          <p>
            Experience lightning fast Stellar payments with a premium glassmorphic dashboard interface. Connect your wallet to get started.
          </p>
          <button 
            className="connect-btn" 
            onClick={() => setIsModalOpen(true)}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* SEND PANEL */}
          <div className="panel">
            <div>
              <h3>Send Testnet XLM</h3>
              <p className="panel-description">Transfer native Lumens to any address on the Stellar Testnet.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Recipient Address</label>
              <input
                type="text"
                placeholder="G..."
                className="form-input"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (XLM)</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  placeholder="0.0"
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <button 
              className="action-btn" 
              onClick={sendXLM}
              disabled={txStatus === "sending"}
            >
              {txStatus === "sending" ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span className="spinner"></span> Sending XLM...
                </span>
              ) : "Send XLM"}
            </button>

            {/* Status alerts */}
            {txStatusMsg && (
              <div className={`alert ${txStatus === "sending" ? "info" : txStatus}`}>
                <div>
                  <strong>
                    {txStatus === "sending" && "Processing"}
                    {txStatus === "success" && "Success!"}
                    {txStatus === "error" && "Error"}
                  </strong>
                  <p style={{ marginTop: "4px", fontSize: "0.8rem" }}>{txStatusMsg}</p>
                  
                  {txStatus === "success" && txHash && (
                    <div style={{ marginTop: "8px" }}>
                      <a 
                        className="tx-hash-link" 
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        View Receipt on Stellar.expert &rarr;
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVITY PANEL */}
          <div className="panel">
            <div>
              <h3>Recent Account Activity</h3>
              <p className="panel-description">The latest incoming and outgoing payments for this address.</p>
            </div>

            <div className="ledger-container">
              {payments.length === 0 ? (
                <div className="empty-state">
                  No recent payment history found for this account.
                </div>
              ) : (
                payments.map((p, idx) => {
                  const isIncoming = p.to === address;
                  const party = isIncoming ? p.from : p.to;
                  return (
                    <div className="ledger-item" key={p.id || idx}>
                      <div className="ledger-left">
                        <span className={`ledger-type ${isIncoming ? 'incoming' : 'outgoing'}`}>
                          {isIncoming ? 'Received' : 'Sent'}
                        </span>
                        <span className="ledger-party">
                          {isIncoming ? 'From: ' : 'To: '}{truncateAddress(party)}
                        </span>
                      </div>
                      <div className="ledger-right">
                        <span className="ledger-amount">
                          {isIncoming ? '+' : '-'}{Number(p.amount).toFixed(2)} XLM
                        </span>
                        <a 
                          className="ledger-link" 
                          href={`https://stellar.expert/explorer/testnet/tx/${p.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Details &rarr;
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* WALLET CONNECTION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            <div className="modal-header">
              <h3>Connect a Wallet</h3>
              <p>Select a wallet extension from the options below to connect to Stellar Testnet.</p>
            </div>

            {txStatusMsg && !address && (
              <div className="alert error" style={{ marginBottom: "16px" }}>
                {txStatusMsg}
              </div>
            )}

            <div className="wallet-options">
              <button 
                className="wallet-option-btn" 
                onClick={connectWallet}
                disabled={isConnecting}
              >
                <div className="wallet-option-left">
                  <div className="wallet-option-logo">
                    {/* SVG logo for Freighter wallet (styled stellar-like rocket) */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#00f2fe" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <div className="wallet-option-info">
                    <span className="wallet-option-name">
                      {isConnecting ? "Connecting Freighter..." : "Freighter Wallet"}
                    </span>
                    <span className="wallet-option-desc">Official browser extension</span>
                  </div>
                </div>
                {isConnecting ? (
                  <span className="spinner"></span>
                ) : (
                  <span className="arrow-icon">&rarr;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;