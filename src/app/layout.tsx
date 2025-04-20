import React from "react";
import "./guardian-style.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/SessionProvider";
import Link from "next/link";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="guardian-style">
        {/* Top slim bar */}
        <div className="top-bar">
          <div className="top-bar-content">
            <div className="today-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="top-bar-right">
              <div className="today-paper">Today's Paper</div>
              <div className="auth-controls">
                {session ? (
                  <div className="user-info">
                    <span className="user-name">{session.user?.name}</span>
                    <Link href="/api/auth/signout" className="signout-link">Sign Out</Link>
                  </div>
                ) : (
                  <Link href="/api/auth/signin" className="login-link">Sign In</Link>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main site header */}
        <header className="site-header">
          <div className="header-content">
            <h1 className="logo" id="animated-logo">NewsAI</h1>
            <nav className="nav-container">
              <ul className="nav-list">
                <li className="nav-item"><a href="/">Home</a></li>
                <li className="nav-item"><a href="/politics">Politics</a></li>
                <li className="nav-item"><a href="/tech">Technology</a></li>
                <li className="nav-item"><a href="/business">Business</a></li>
                <li className="nav-item"><a href="/science">Science</a></li>
                <li className="nav-item"><a href="/analysis">AI Analysis</a></li>
              </ul>
            </nav>
          </div>
        </header>
        
        <SessionProvider session={session}>
          <main className="main-content">
            {children}
          </main>
        </SessionProvider>
        
        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-left">
              <div className="footer-logo">NewsAI</div>
              <p className="footer-tagline">Powered by Claude AI</p>
            </div>
            <div className="footer-right">
              <p className="footer-copyright">© {new Date().getFullYear()} AI News Analysis</p>
              <div className="footer-links">
                <a href="/about">About</a>
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
              </div>
            </div>
          </div>
        </footer>
        
        {/* Logo animation script */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const logo = document.getElementById('animated-logo');
            if (logo) {
              logo.addEventListener('click', function() {
                this.style.animation = 'none';
                setTimeout(() => {
                  this.style.animation = 'typing 2.5s steps(10, end), blink-caret 0.75s step-end infinite';
                }, 10);
              });
            }
          });
        `}} />
      </body>
    </html>
  );
}
