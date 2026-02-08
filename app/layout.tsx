export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import "@/index.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "OmniSoin - Plateforme Medicale IA",
  description: "Assistant medical intelligent pour les professionnels de sante",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
