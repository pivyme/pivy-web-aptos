import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import MainButton from "../common/MainButton";

interface LandingLayoutProps {
  children: ReactNode;
}

export default function LandingLayout({ children }: LandingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b border-black/10 bg-background-50/80 supports-[backdrop-filter]:backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logo/horizontal-1024.png"
              alt="PIVY"
              width={120}
              height={42}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-2 md:gap-3">
            <Link href="/login" className="hidden sm:block">
              <MainButton className="bg-gray-100 hover:bg-gray-200">
                Launch App
              </MainButton>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="w-full border-t border-black/10 bg-background-50">
        <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/assets/logo/horizontal-1024.png"
                alt="PIVY"
                width={120}
                height={42}
                className="h-7 w-auto"
              />
            </div>
            <p className="mt-4 text-sm text-foreground/60 max-w-sm">
              Private-by-default payment links. Fresh addresses per payment.
              Full self-custody.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground/80">
              Product
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/login"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Create a link
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Templates
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="#"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-foreground/70 hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-black/10">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-foreground/60 text-sm">
              © {new Date().getFullYear()} PIVY. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/login"
                className="text-foreground/70 hover:text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
