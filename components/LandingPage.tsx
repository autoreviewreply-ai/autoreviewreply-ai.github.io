'use client'

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Building, ShieldAlert, Star, Check, ArrowRight, MessageSquare, Languages, Smile, CheckCircle, ChevronRight, BarChart3, HelpCircle } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export default function LandingPage({ onLoginClick, onSignUpClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100" id="saas-landing">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-40 max-w-7xl mx-auto px-6 md:px-12 h-18 flex items-center justify-between" id="landing-header">
        {/* App Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-[#2563eb] text-white flex items-center justify-center rounded-xl shadow-xs">
            <Sparkles className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-base font-display font-extrabold text-[#1e293b] tracking-tight leading-none">Auto Review Reply</h1>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block mt-0.5">SaaS Reputation Guard</span>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="px-4.5 py-2 text-xs font-bold text-slate-650 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition cursor-pointer"
            id="login-trigger-header"
          >
            Login
          </button>
          <button
            onClick={onSignUpClick}
            className="px-5 py-2.5 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md hover:shadow-lg shadow-blue-500/10 active:scale-98 transition duration-150 cursor-pointer"
            id="signup-trigger-header"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 px-6 md:px-12" id="hero-section">
        <div className="max-w-7xl mx-auto text-center space-y-8 relative z-10 z-deep">
          
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50/70 border border-blue-100 px-4 py-1.5 rounded-full text-[11px] font-bold text-[#2563eb] tracking-tight"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Generation Google Business Reputation AI</span>
          </motion.div>

          {/* Hero Heading */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-slate-900 tracking-tight leading-1.07"
            >
              Automatically reply to reviews with <span className="text-[#2563eb]">Gemini Intelligence</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              ReviewShield operates silently to sync reviews, translate foreign languages, and autopost warm high-converting responses. 1-2 star complaints are safeguarded for human validation.
            </motion.p>
          </div>

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={onSignUpClick}
              className="w-full sm:w-auto px-8 py-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-102 transition duration-200 cursor-pointer flex items-center justify-center gap-2"
              id="get-started-cta"
            >
              <span>Get Started Unlocked Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              id="watch-demo-cta"
            >
              <Building className="h-4 w-4 text-slate-500" />
              <span>Connect Live Account</span>
            </button>
          </motion.div>

          {/* Core App Mock Visual Frame */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="pt-10 max-w-5xl mx-auto"
          >
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xl relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent pointer-events-none rounded-3xl" />
              
              {/* Fake dashboard headers */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 bg-rose-500 rounded-full" />
                  <div className="h-2.5 w-2.5 bg-amber-500 rounded-full" />
                  <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-mono text-slate-400 ml-2">https://autoreplyreview.io/dashboard</span>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-600 font-bold rounded-lg uppercase tracking-wide">
                  Active Security Safeguard Connected
                </span>
              </div>

              {/* Grid content mock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-slate-150 p-4.5 rounded-2xl text-left bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Reviews</span>
                    <BarChart3 className="h-4 w-4 text-[#2563eb]" />
                  </div>
                  <div className="text-2xl font-bold font-display text-slate-800">472</div>
                  <div className="text-[9px] text-[#2563eb] font-bold mt-1">100% Google Maps synchronization</div>
                </div>

                <div className="border border-slate-150 p-4.5 rounded-2xl text-left bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AI Response Coverage</span>
                    <CheckCircle className="h-4 w-4 text-[#10b981]" />
                  </div>
                  <div className="text-2xl font-bold font-display text-slate-800">92.4%</div>
                  <div className="text-[9px] text-emerald-600 font-bold mt-1">Remaining 7.6% gated in Manual Queue</div>
                </div>

                <div className="border border-slate-150 p-4.5 rounded-2xl text-left bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Star Rating</span>
                    <div className="flex text-[#f59e0b]">
                      <Star className="h-3.5 w-3.5 fill-[#f59e0b]" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display text-slate-800">4.8 / 5</div>
                  <div className="text-[9px] text-amber-600 font-bold mt-1">+0.3 boost this month</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-20 bg-white border-y border-slate-200/60 px-6 md:px-12" id="features-section">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[#2563eb] font-extrabold text-[10px] uppercase tracking-widest block">Feature Breakdown</span>
            <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Everything a modern brick-and-mortar business needs</h2>
            <p className="text-xs text-slate-500 font-medium">Protect and expand your google rating automatically while minimizing customer churn.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* feature 1 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:border-blue-100 transition group">
              <div className="h-12 w-12 bg-white text-[#2563eb] rounded-xl flex items-center justify-center border border-slate-150 shadow-xs">
                <Building className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#2563eb] transition">1-Click Google Account Sync</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Avoid tedious manual setup. Simply authenticate via secure Google Auth to retrieve your locations, review directories, and historical charts immediately.
              </p>
            </div>

            {/* feature 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:border-emerald-100 transition group">
              <div className="h-12 w-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center border border-slate-150 shadow-xs">
                <Languages className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition">Automatic Language Translation</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Accept reviews globally. The system auto-detects English, Spanish, French, Japanese, or German reviews and formulates responses in the client&rsquo;s home dialect seamlessly.
              </p>
            </div>

            {/* feature 3 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:border-[#ef4444]/20 transition group">
              <div className="h-12 w-12 bg-white text-[#ef4444] rounded-xl flex items-center justify-center border border-slate-150 shadow-xs">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#ef4444] transition">Critical Sentiment Safeguard</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Never autothreaten or misfire responses. Sensitive comments, complaints, refund requests, or 1-2 star ratings are held securely inside our Supervisor manual review desk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Benefits Section / How It Works */}
      <section className="py-20 px-6 md:px-12" id="benefits-section">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <span className="text-[#2563eb] font-extrabold text-[10px] uppercase tracking-widest block">Core Benefits</span>
            <h2 className="text-3xl font-display font-black text-slate-905 tracking-tight leading-none">Save hundreds of hours while maximizing professional ratings</h2>
            
            <p className="text-xs text-slate-550 leading-relaxed font-semibold">
              Instead of manually checking Google Reviews daily, set customized tone profiles per business and relax. ReviewShield acts as a 24/7 communications director for Pearl Smile Dental, Sage Bistro, or any enterprise.
            </p>

            <div className="space-y-3 pt-2">
              {[
                "Increase response rate to 100% within days.",
                "Custom brand voice targeting per location context.",
                "Avoid legal risks with 100% secure negative review filters.",
                "Improve local SEO search visibility rankings easily."
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xl space-y-4 text-left">
            <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block">Live Protection Logging</span>
            <div className="space-y-3">
              <div className="p-3 border border-slate-100 bg-slate-50/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Customer: Douglas M.</span>
                  <span className="font-bold text-amber-500 bg-amber-50 px-1 rounded uppercase tracking-wider">Held: 1-Star Queue</span>
                </div>
                <p className="font-semibold text-slate-700">&ldquo;Food took 45 minutes to arrive and client service was hostile.&rdquo;</p>
                <div className="p-2 border border-blue-50 bg-blue-50/30 rounded-lg text-[10px] text-slate-500">
                  <span className="font-bold text-[#2563eb] block mb-0.5">Gemini Recommended Reply:</span>
                  &ldquo;We sincerely apologize for the restaurant delay, Douglas. Please reach out securely at manager@bistro.com to enable us to make things right.&rdquo;
                </div>
              </div>

              <div className="p-3 border border-slate-100 bg-emerald-50/10 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>Customer: Amanda J.</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-wider">Posted: 5-Star Auto</span>
                </div>
                <p className="font-semibold text-slate-700">&ldquo;Excellent clinic, extremely modern cosmetic suite and hotel-grade hygiene!&rdquo;</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Footer */}
      <footer className="bg-slate-900 text-white/50 border-t border-slate-800 py-12 px-6 md:px-12" id="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-[#2563eb] text-white flex items-center justify-center rounded-xl shadow-md">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-white font-extrabold text-sm block">Auto Review Reply</span>
              <span className="text-[9px] text-[#2563eb] tracking-widest font-extrabold block">AI SAAS PORTAL</span>
            </div>
          </div>
          
          <p className="text-[10px] font-medium text-slate-400 text-center md:text-right">
            © 2026 Auto Review Reply. Authenticated Google Business Profile API client. All reputation rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
