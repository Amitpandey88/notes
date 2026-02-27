import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SketchNotes",
  description: "A collaborative whiteboard and sketch-note app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
