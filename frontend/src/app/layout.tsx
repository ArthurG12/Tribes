import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tribes",
  description:
    "A rede social feita para conectar pessoas pelos mesmos hobbies e organizar encontros reais, presenciais ou online, sem bagunça no chat.",
  icons: {
    icon: "/tribes-emblem.png",
    shortcut: "/tribes-emblem.png",
    apple: "/tribes-emblem.png",
  },
  openGraph: {
    title: "Tribes",
    description:
      "Descubra comunidades perto de você, entre sem timidez e organize encontros com lista real de presença.",
    images: [{ url: "/tribes-logo.png", width: 1536, height: 1024, alt: "Tribes — Comunidade e Natureza" }],
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${inter.variable} ${jetbrainsMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/15 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
