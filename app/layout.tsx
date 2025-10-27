import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Singles Search - AI-Powered Matchmaking',
  description: 'Conversational natural language search for singles profiles with hybrid search technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
