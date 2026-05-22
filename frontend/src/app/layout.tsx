import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Jewel AI Studio",
  description: "AI jewelry production workflow platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Monkeypatch console.error to ignore hydration warnings caused by bis_skin_checked
                const nativeError = console.error;
                let currentError = nativeError;
                let isFiltering = false;

                Object.defineProperty(console, 'error', {
                  get() {
                    return function(...args) {
                      if (isFiltering) {
                        return nativeError.apply(console, args);
                      }

                      const msg = args.join(' ');
                      if (msg.includes('bis_skin_checked') || msg.includes('hydration') || msg.includes('Hydration')) {
                        // Suppress hydration mismatch completely!
                        return;
                      }

                      isFiltering = true;
                      try {
                        return currentError.apply(console, args);
                      } finally {
                        isFiltering = false;
                      }
                    };
                  },
                  set(newVal) {
                    currentError = newVal;
                  },
                  configurable: true
                });

                // 2. MutationObserver to clean up the DOM attributes to keep it matching the server
                const cleanEl = (el) => { if (el && el.removeAttribute) el.removeAttribute('bis_skin_checked'); };
                document.querySelectorAll('[bis_skin_checked]').forEach(cleanEl);
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                      cleanEl(mutation.target);
                    } else if (mutation.addedNodes) {
                      mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                          if (node.hasAttribute('bis_skin_checked')) cleanEl(node);
                          node.querySelectorAll('[bis_skin_checked]').forEach(cleanEl);
                        }
                      });
                    }
                  });
                });
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster theme="light" position="bottom-right" />
      </body>
    </html>
  );
}
