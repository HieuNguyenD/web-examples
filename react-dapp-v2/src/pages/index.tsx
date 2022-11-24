import type { NextPage } from "next";
import React, { useEffect, useState } from "react";

import Blockchain from "../components/Blockchain";
import Column from "../components/Column";
import Header from "../components/Header";
import Modal from "../components/Modal";
import {
  DEFAULT_EIP155_METHODS,
  DEFAULT_MAIN_CHAINS,
} from "../constants";
import { AccountAction } from "../helpers";
import RequestModal from "../modals/RequestModal";
import PairingModal from "../modals/PairingModal";
import PingModal from "../modals/PingModal";
import {
  SAccounts,
  SAccountsContainer,
  SButtonContainer,
  SConnectButton,
  SContent,
  SLanding,
  SLayout,
} from "../components/app";
import { useWalletConnectClient } from "../contexts/ClientContext";
import { useJsonRpc } from "../contexts/JsonRpcContext";
import { useChainData } from "../contexts/ChainDataContext";

const Home: NextPage = () => {
  const [modal, setModal] = useState("");

  const closeModal = () => setModal("");
  const openPingModal = () => setModal("ping");
  const openRequestModal = () => setModal("request");

  // Initialize the WalletConnect client.
  const {
    client,
    pairings,
    session,
    connect,
    disconnect,
    accounts,
    balances,
    isFetchingBalances,
    isInitializing,
  } = useWalletConnectClient();

  // Use `JsonRpcContext` to provide us with relevant RPC methods and states.
  const {
    ping,
    ethereumRpc,
    isRpcRequestPending,
    rpcResult,
  } = useJsonRpc();

  const { chainData } = useChainData();

  // Close the pairing modal after a session is established.
  useEffect(() => {
    if (session && modal === "pairing") {
      closeModal();
    }
  }, [session, modal]);

  const onConnect = () => {
    if (typeof client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    connect();
  };

  const onPing = async () => {
    openPingModal();
    await ping();
  };

  const getEthereumActions = (): AccountAction[] => {
    const onSendTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSendTransaction(chainId, address);
    };
    const onSignTransaction = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignTransaction(chainId, address);
    };
    const onSignPersonalMessage = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignPersonalMessage(chainId, address);
    };
    const onEthSign = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testEthSign(chainId, address);
    };
    const onSignTypedData = async (chainId: string, address: string) => {
      openRequestModal();
      await ethereumRpc.testSignTypedData(chainId, address);
    };

    return [
      {
        method: DEFAULT_EIP155_METHODS.ETH_SEND_TRANSACTION,
        callback: onSendTransaction,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN_TRANSACTION,
        callback: onSignTransaction,
      },
      {
        method: DEFAULT_EIP155_METHODS.PERSONAL_SIGN,
        callback: onSignPersonalMessage,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN + " (standard)",
        callback: onEthSign,
      },
      {
        method: DEFAULT_EIP155_METHODS.ETH_SIGN_TYPED_DATA,
        callback: onSignTypedData,
      },
    ];
  };

  const getBlockchainActions = (chainId: string) => {
    const [namespace] = chainId.split(":");
    switch (namespace) {
      case "eip155":
        return getEthereumActions();
      default:
        break;
    }
  };

  // Toggle between displaying testnet or mainnet chains as selection options.
  // const toggleTestnets = () => {
  //   const nextIsTestnetState = !isTestnet;
  //   setIsTestnet(nextIsTestnetState);
  //   setLocaleStorageTestnetFlag(nextIsTestnetState);
  // };

  // const handleChainSelectionClick = (chainId: string) => {
  //   if (chains.includes(chainId)) {
  //     setChains(chains.filter((chain) => chain !== chainId));
  //   } else {
  //     setChains([...chains, chainId]);
  //   }
  // };

  // Renders the appropriate model for the given request that is currently in-flight.
  const renderModal = () => {
    switch (modal) {
      case "pairing":
        if (typeof client === "undefined") {
          throw new Error("WalletConnect is not initialized");
        }
        return <PairingModal pairings={pairings} connect={connect} />;
      case "request":
        return (
          <RequestModal pending={isRpcRequestPending} result={rpcResult} />
        );
      case "ping":
        return <PingModal pending={isRpcRequestPending} result={rpcResult} />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    const chainOptions = DEFAULT_MAIN_CHAINS;
    return !accounts.length && !Object.keys(balances).length ? (
      <SLanding center>
        <SButtonContainer>
          {chainOptions.map((chainId) => (
            <Blockchain
              key={chainId}
              chainId={chainId}
              chainData={chainData}
              //onClick={handleChainSelectionClick}
              active
            />
          ))}
          <SConnectButton left onClick={onConnect}>
            {"Connect"}
          </SConnectButton>
        </SButtonContainer>
      </SLanding>
    ) : (
      <SAccountsContainer>
        <h3>Accounts</h3>
        <SAccounts>
          {accounts.map((account) => {
            const [namespace, reference, address] = account.split(":");
            const chainId = `${namespace}:${reference}`;
            return (
              <Blockchain
                key={account}
                active={true}
                chainData={chainData}
                fetching={isFetchingBalances}
                address={address}
                chainId={chainId}
                balances={balances}
                actions={getBlockchainActions(chainId)}
              />
            );
          })}
        </SAccounts>
      </SAccountsContainer>
    );
  };

  return (
    <SLayout>
      <Column maxWidth={1000} spanHeight>
        <Header ping={onPing} disconnect={disconnect} session={session} />
        <SContent>{isInitializing ? "Loading..." : renderContent()}</SContent>
      </Column>
      <Modal show={!!modal} closeModal={closeModal}>
        {renderModal()}
      </Modal>
    </SLayout>
  );
};

export default Home;
