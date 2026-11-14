import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const ui = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Craft Cups — учёт",
  description: "Склад, продажи, клиенты и касса",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${ui.variable} antialiased`}>{children}</body>
    </html>
  );
}
