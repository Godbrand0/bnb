import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { config } from "./wagmi";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "Brgent | Agentic Lending Protocol",
  description: "Next-generation agentic lending protocol on BNB Chain.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));

  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ minHeight: '100%', display: 'flex', background: '#0B0E11' }}>
        <Providers initialState={initialState}>
          <Nav />
          <div style={{ marginLeft: 220, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
