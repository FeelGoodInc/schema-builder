import type { Metadata }          from "next";
import { Inter }                  from 'next/font/google';
import                                 "rsuite/dist/rsuite.min.css";
import                                 "./globals.css";
import                                 '@/styles/all.scss';

const InterFont = Inter({ subsets: [ 'latin', 'cyrillic' ] });

export const metadata: Metadata = {
  title: "Конструктор схем",
  description: "Конструктор схем на базе Next.js, Rsuite и react-icons",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body className={InterFont.className}>
        {children}
      </body>
    </html>
  );
}
