import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewAI — Ace Your Next Interview",
  description: "AI-powered mock interview platform with real-time feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise">
        {/* Apply saved theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('app_theme');
                  if (t && t !== 'dark') {
                    document.documentElement.classList.add('theme-' + t);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
