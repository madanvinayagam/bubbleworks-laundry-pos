import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bubbleworks Laundry",
  description: "Multi-branch laundry management and billing system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
