import "./globals.css";

export const metadata = {
  title: "株っくす",
  description: "日本株投資家向けのXライクなWeb SNS",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
