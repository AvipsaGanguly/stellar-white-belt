import "./App.css";
import { checkWallet } from "./components/Freighter";
import { signTransaction } from "@stellar/freighter-api";
import { useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";

function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const [txStatus, setTxStatus] = useState("");
  const [txHash, setTxHash] = useState("");

  const server = new StellarSdk.Horizon.Server(
    "https://horizon-testnet.stellar.org"
  );

  const connectWallet = async () => {
    const walletAddress = await checkWallet();

    if (walletAddress) {
      setAddress(walletAddress);

      try {
        const account = await server.loadAccount(walletAddress);

        const xlmBalance = account.balances.find(
          (b) => b.asset_type === "native"
        );

        setBalance(xlmBalance.balance);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const sendXLM = async () => {
    try {
      if (!recipient || !amount) {
        setTxStatus("Please enter recipient and amount");
        return;
      }

      setTxStatus("Sending transaction...");

      const sourceAccount = await server.loadAccount(address);

      const transaction = new StellarSdk.TransactionBuilder(
        sourceAccount,
        {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        }
      )
        .addOperation(
          StellarSdk.Operation.payment({
            destination: recipient,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      const signed = await signTransaction(
        transaction.toXDR(),
        {
          networkPassphrase: StellarSdk.Networks.TESTNET,
        }
      );

      const signedTx =
        StellarSdk.TransactionBuilder.fromXDR(
          signed.signedTxXdr,
          StellarSdk.Networks.TESTNET
        );

      const result =
        await server.submitTransaction(signedTx);

      setTxStatus("Transaction Successful");
      setTxHash(result.hash);

      const updatedAccount =
        await server.loadAccount(address);

      const updatedBalance =
        updatedAccount.balances.find(
          (b) => b.asset_type === "native"
        );

      setBalance(updatedBalance.balance);

    } catch (error) {
      console.error(error);
      setTxStatus("Transaction Failed");
    }
  };

  return (
    <div className="app">
      <div className="navbar">
        <h2>Stellar dApp</h2>

        {!address ? (
          <button
            className="connect-btn"
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <div className="card">
              {address.slice(0, 6)}...
              {address.slice(-6)}
            </div>

            <div className="card">
              Balance: {balance} XLM
            </div>

            <button
              className="connected-btn"
              onClick={() => {
                setAddress("");
                setBalance("");
                setTxHash("");
                setTxStatus("");
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: "40px" }}>
        <h3>Send Testnet XLM</h3>

        <input
          type="text"
          placeholder="Recipient Address"
          value={recipient}
          onChange={(e) =>
            setRecipient(e.target.value)
          }
        />

        <br />
        <br />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />

        <br />
        <br />

        <button onClick={sendXLM}>
          Send XLM
        </button>

        <br />
        <br />

        <p>{txStatus}</p>

        {txHash && (
          <p>
            Transaction Hash:
            <br />
            {txHash}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;