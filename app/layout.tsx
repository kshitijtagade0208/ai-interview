import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InterviewAI — Adaptive Technical Interview Platform",
  description: "AI-powered adaptive technical interviewer that conducts real-time voice and video mock interviews dynamically tuned to your target role and job description.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0B1020] text-[#F5F7FF] selection:bg-[#7C5CFF] selection:text-[#F5F7FF]">
        {children}
      </body>
    </html>
  );
}
