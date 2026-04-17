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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard
  if (isAuthenticated && user) {
    return null;
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ⚖️ Niyam AI
            </h1>
            <Link
              href="/login"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Legal Intelligence at Your Fingertips
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              Niyam AI is an advanced legal query and document analysis system powered by cutting-edge AI. Search through comprehensive legal provisions, rules, and acts in seconds.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/login"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 text-center"
              >
                Get Started
              </Link>
              <a
                href="#features"
                className="px-8 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold transition-all border-2 border-indigo-600 dark:border-indigo-400 text-center"
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-300 dark:border-gray-700">
              <div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">500+</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Legal Documents</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">99%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">&lt;2s</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Query Time</p>
              </div>
            </div>
          </div>

          {/* Right Column - Feature Preview */}
          <div className="hidden md:block">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 border-2 border-indigo-200 dark:border-indigo-700">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">🔍</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Smart Search</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Find legal provisions instantly</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-bold">📄</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Document Analysis</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered legal document review</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">⚡</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Real-time Results</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get answers faster than ever</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">🔐</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Secure & Private</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enterprise-grade security</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white dark:bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Powerful Features
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📚',
                title: 'Comprehensive Legal Database',
                description: 'Access a vast collection of Indian legal acts, rules, provisions, and amendments'
              },
              {
                icon: '🤖',
                title: 'AI-Powered Analysis',
                description: 'Leverage advanced machine learning to understand complex legal concepts'
              },
              {
                icon: '⚙️',
                title: 'Precision Retrieval',
                description: 'State-of-the-art BM25 and semantic search for accurate results'
              },
              {
                icon: '📊',
                title: 'Citation Tracking',
                description: 'Track and verify legal citations with automatic source attribution'
              },
              {
                icon: '🔄',
                title: 'Real-time Updates',
                description: 'Stay updated with the latest amendments and legal changes'
              },
              {
                icon: '👥',
                title: 'Multi-user Support',
                description: 'Collaborate with team members with role-based access control'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 p-8 rounded-lg hover:shadow-lg transition-shadow">
                <p className="text-4xl mb-4">{feature.icon}</p>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Legal Research?
          </h3>
          <p className="text-xl text-indigo-100 mb-8">
            Join legal professionals who trust Niyam AI for accurate and fast legal information
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign In Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">About</h4>
              <p className="text-sm">Niyam AI - Simplifying legal research with AI</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="text-sm space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="text-sm space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <p className="text-sm">support@niyamai.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 Niyam AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
