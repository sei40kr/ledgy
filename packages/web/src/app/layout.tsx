import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Provider } from "@/components/ui/provider";
import { AuthProvider } from "@/hooks/useAuth";

// Inter for Latin/figures, Noto Sans JP for Japanese — the pairing the design uses.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "帳簿管理",
  description: "個人事業主・小規模法人向け複式簿記アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJp.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Provider>
          <AuthProvider>{children}</AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
