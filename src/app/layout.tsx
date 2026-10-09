import type { Metadata } from "next";
import "rsuite/dist/rsuite.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Конструктор схем",
  description: "Конструктор схем на базе Next.js, Rsuite и react-icons",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
