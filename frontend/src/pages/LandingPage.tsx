import React from 'react';
import { NavBar }            from './landing/NavBar';
import { HeroSection }       from './landing/HeroSection';
import { ComparisonSection } from './landing/ComparisonSection';
import { FeaturesSection }   from './landing/FeaturesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { UseCasesSection }   from './landing/UseCasesSection';
import { AISection }         from './landing/AISection';
import { FinalCTASection }   from './landing/FinalCTASection';
import { FooterSection }     from './landing/FooterSection';
import { useScrollReveal }   from '../hooks/useScrollReveal';

export const LandingPage: React.FC = () => {
  // Single global observer for all .lp-reveal elements on the page.
  useScrollReveal();

  return (
    <div className="min-h-screen bg-[#09090b] text-on-surface font-inter selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      <NavBar />
      <main>
        <HeroSection />
        <ComparisonSection />
        <FeaturesSection />
        <HowItWorksSection />
        <UseCasesSection />
        <AISection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </div>
  );
};
