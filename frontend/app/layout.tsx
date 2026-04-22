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
    <html lang="en" className="h-full">
      <body className="min-h-full flex bg-bg font-inter text-text">
        <Providers initialState={initialState}>
          <Nav />
          <div className="ml-[220px] flex-1 min-h-screen flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
