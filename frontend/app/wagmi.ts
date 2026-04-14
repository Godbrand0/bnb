import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = 'PLACEHOLDER_PROJECT_ID'; // user will replace later

export const config = createConfig({
  chains: [bscTestnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [bscTestnet.id]: http(),
  },
});
