import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ถามเอกสาร · Docs Agent Workshop",
  description: "ถามคำถามจากเอกสาร PDF พร้อมเปิดหน้าที่อ้างอิง",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
