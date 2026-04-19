'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // Redirect authenticated users to dashboard (must be at top level)
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      if (user.is_admin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-dim text-on-surface">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-on-surface-variant">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="bg-surface-dim text-on-surface font-body antialiased min-h-screen flex flex-col dark">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-12 py-6 max-w-[1440px] left-1/2 -translate-x-1/2 bg-surface-dim/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="font-headline text-2xl tracking-tight font-bold text-on-surface">
          Niyam AI
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login" className="bg-primary-container text-on-primary-container font-label font-medium px-8 py-3 rounded hover:bg-inverse-primary transition-colors duration-300 flex items-center gap-2">
            Get Intelligence
          </Link>
        </div>
      </nav>

      <main className="flex-grow pt-32">
        {/* Hero Section */}
        <section className="max-w-[1440px] mx-auto px-12 py-20 lg:py-32 grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7 space-y-8">
            <h1 className="font-headline text-5xl lg:text-[3.5rem] leading-[1.1] tracking-[-0.02em] font-bold text-on-surface">
              India&apos;s Plastic Waste Laws, <span className="text-gradient-primary">Decoded in Seconds</span>
            </h1>
            <p className="font-body text-xl text-on-surface-variant max-w-2xl leading-relaxed">
              Navigate the complexities of the Plastic Waste Management (PWM) Rules 2016 and its myriad amendments. Niyam AI transforms dense regulatory text into immediate, actionable intelligence for producers, legal teams, and compliance officers.
            </p>
            <div className="flex items-center gap-6 pt-4">
              <Link href="/login" className="bg-gradient-primary text-on-primary-container font-label font-medium px-10 py-4 rounded shadow-[0_8px_40px_rgba(2,6,23,0.8)] hover:brightness-110 transition-all duration-300 inline-block">
                Analyze Document
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="relative glass-panel border border-outline-variant/15 p-8 rounded-lg shadow-[0_24px_60px_rgba(2,6,23,0.5)]">
              <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">terminal</span>
                  <h3 className="font-headline font-semibold text-xl text-on-surface">Intelligence Terminal</h3>
                </div>
                <span className="bg-tertiary-container text-on-tertiary-container text-xs px-2 py-1 rounded font-medium tracking-wide">LIVE</span>
              </div>
              <div className="space-y-6">
                <div className="bg-surface-container-lowest p-4 rounded border border-outline-variant/20 shadow-inner">
                  <p className="text-sm text-on-surface-variant font-mono">Query: &quot;What are the EPR targets for multi-layered plastic packaging for the year 2024-25 under the latest amendment?&quot;</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    <div>
                      <h4 className="font-label font-medium text-on-surface">Semantic Search Executed</h4>
                      <p className="text-xs text-on-surface-variant mt-1">Scanned 14 amendments across PWM Rules 2016.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                    <div>
                      <h4 className="font-label font-medium text-on-surface">Clause Extracted</h4>
                      <p className="text-xs text-on-surface-variant mt-1">Identified relevant targets in Schedule II, Part A.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Processing Time:</span>
                    <span className="text-primary font-mono font-medium">1.24s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics Strip */}
        <section className="bg-surface-container border-y border-outline-variant/10 py-12">
          <div className="max-w-[1440px] mx-auto px-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-outline-variant/20">
            <div className="py-4 md:py-0">
              <p className="font-headline text-3xl font-bold text-on-surface">PWM Rules 2016</p>
              <p className="font-label text-sm text-on-surface-variant mt-2 tracking-wide uppercase">+ All Amendments Indexed</p>
            </div>
            <div className="py-4 md:py-0">
              <p className="font-headline text-3xl font-bold text-on-surface text-gradient-primary">98.7%</p>
              <p className="font-label text-sm text-on-surface-variant mt-2 tracking-wide uppercase">Retrieval Accuracy</p>
            </div>
            <div className="py-4 md:py-0">
              <p className="font-headline text-3xl font-bold text-on-surface">&lt;2s</p>
              <p className="font-label text-sm text-on-surface-variant mt-2 tracking-wide uppercase">Average Answer Time</p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-[1440px] mx-auto px-12 py-32 bg-surface-container-low">
          <div className="mb-20 grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-5">
              <h2 className="font-headline text-4xl font-bold text-on-surface leading-tight">The Sovereign Archive of PWM Regulations.</h2>
            </div>
            <div className="col-span-12 lg:col-span-6 lg:col-start-7 flex items-end">
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Built on advanced legal reasoning models, our platform doesn&apos;t just search keywords; it comprehends legislative intent, structured hierarchies, and cross-references within Indian environmental law.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">database</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">Complete PWM Database</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Instant access to the foundational 2016 rules unified with every subsequent amendment, notification, and CPCB guideline in one cohesive structure.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">psychology</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">AI Legal Comprehension</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Ask complex legal questions in natural language. Our AI understands context, definitions, and the interplay between different clauses.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">target</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">Precision Clause Retrieval</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Bypass hours of manual reading. Pinpoint exact sub-sections, provisos, and explanations instantly with exact citations.
              </p>
            </div>
            {/* Card 4 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-primary"></div>
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">EPR Compliance Tracking</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Extract and calculate Extended Producer Responsibility (EPR) targets, registration timelines, and reporting obligations specific to your category.
              </p>
            </div>
            {/* Card 5 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">Real-time Amendment Alerts</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Stay ahead of regulatory shifts. Receive AI-generated summaries of new MoEFCC notifications and their direct impact on existing compliance frameworks.
              </p>
            </div>
            {/* Card 6 */}
            <div className="bg-surface-container-high p-8 rounded border border-outline-variant/10 hover:border-outline-variant/30 transition-colors duration-300 group">
              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded mb-6 group-hover:bg-primary/10 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-3">Team &amp; Consultant Access</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Collaborate securely. Share specific legal interpretations, saved queries, and compliance reports with internal teams or external legal counsel.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-20 px-12 grid grid-cols-1 md:grid-cols-4 gap-12 max-w-[1440px] mx-auto bg-surface-container-lowest">
        <div className="col-span-1 md:col-span-1 space-y-6">
          <div className="font-headline text-xl font-bold text-on-surface">
            Niyam AI
          </div>
          <p className="text-sm text-on-surface/50 font-body">
            © 2024 Niyam AI. The Sovereign Archive. All rights reserved.
          </p>
        </div>
        <div className="col-span-1 space-y-4">
          <h4 className="font-label text-xs font-semibold tracking-wider text-on-surface uppercase mb-6">Product</h4>
          <ul className="space-y-3">
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Compliance Engine</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Risk Monitoring</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">API Docs</Link></li>
          </ul>
        </div>
        <div className="col-span-1 space-y-4">
          <h4 className="font-label text-xs font-semibold tracking-wider text-on-surface uppercase mb-6">Legal</h4>
          <ul className="space-y-3">
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Privacy Policy</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Terms of Service</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Regulatory Disclosure</Link></li>
          </ul>
        </div>
        <div className="col-span-1 space-y-4">
          <h4 className="font-label text-xs font-semibold tracking-wider text-on-surface uppercase mb-6">Company</h4>
          <ul className="space-y-3">
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">About Us</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Contact</Link></li>
            <li><Link className="text-on-surface/50 hover:text-primary transition-colors duration-300 font-body text-sm" href="#">Archive</Link></li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
