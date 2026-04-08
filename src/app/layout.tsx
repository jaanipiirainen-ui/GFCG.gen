import "./globals.css";

export const metadata = {
  title: "GFCG Kuvagen",
  description: "Internal image generator for Gut Feel Consulting Group",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
