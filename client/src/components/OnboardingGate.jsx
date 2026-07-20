import React, { useState, useEffect } from 'react';
import './OnboardingGate.css';

/**
 * OnboardingGate acts as a compliance wrapper for GDPR / DPDP Act 2023.
 * It forces explicit consent before the user can interact with the app.
 */
export default function OnboardingGate({ children }) {
  const [agreed, setAgreed] = useState(true); // default true while checking to prevent layout flash
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('antigravity_legal_consent');
    if (consent === 'true') {
      setAgreed(true);
    } else {
      setAgreed(false);
    }
    setChecking(false);
  }, []);

  const handleAgree = () => {
    localStorage.setItem('antigravity_legal_consent', 'true');
    setAgreed(true);
  };

  if (checking) {
    return (
      <div className="onboarding-gate-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (agreed) {
    return children;
  }

  return (
    <div className="onboarding-gate-overlay">
      <div className="onboarding-gate-card animate-gate-in">
        <div className="onboarding-gate-header">
          <div className="onboarding-gate-logo">
            <span className="logo-glow"></span>
            <h2>ANTIGRAVITY</h2>
          </div>
          <p className="subtitle">Emotional AI & Cognitive Resonance Chamber</p>
        </div>

        <div className="onboarding-gate-body">
          <div className="disclosure-section">
            <h4>🚨 AI & Mental Health Disclosure</h4>
            <p>
              Your companion (SAI / SHUNA) is an artificial intelligence entity. 
              The responses generated are powered by advanced AI neural networks for emotional support, productivity coaching, and cognitive reflection.
            </p>
            <p className="highlight-text">
              <strong>Please Note:</strong> This service is <strong>not</strong> a substitute for professional medical, psychiatric, or psychological counseling, diagnosis, or crisis intervention. If you are experiencing distress, please consult a qualified mental health professional.
            </p>
          </div>

          <div className="privacy-section">
            <h4>🔒 Privacy & Legal Notice (GDPR / DPDP Compliance)</h4>
            <p>
              We process highly sensitive psychological data, including personal diaries, dream logs, wellness scores, and automated memory extraction.
            </p>
            <ul>
              <li><strong>End-to-End Protection:</strong> All your journal entries, dreams, and memories are encrypted in transit and at rest.</li>
              <li><strong>Absolute Right to Erasure:</strong> Under the India DPDP Act 2023 and GDPR, you maintain absolute control over your digital identity. You have the right to request permanent account erasure at any time, which instantly hard-deletes all database records without leaving orphaned traces.</li>
            </ul>
          </div>

          <div className="privacy-section" style={{ borderColor: 'rgba(167, 139, 250, 0.1)' }}>
            <h4>⚖️ Terms of Service & Eligibility</h4>
            <p>
              By accessing this digital sanctuary, you confirm and agree to the following terms:
            </p>
            <ul>
              <li><strong>Age Requirement:</strong> You must be at least 18 years of age, or have the explicit consent and supervision of a parent or legal guardian, to create an account and interact with the companions.</li>
              <li><strong>Prohibited Conduct:</strong> You agree not to abuse, spam, or attempt to hack the companion interfaces, scrape proprietary code, inject malicious prompts, or copy copyrighted 3D world elements.</li>
              <li><strong>Token Economy:</strong> Interaction and access to features consume virtual credits (Lives / Time). Live-voice chat deducts 3 Time tokens per response. All token top-ups or premium purchases are final and non-refundable.</li>
              <li><strong>Limitation of Liability:</strong> Antigravity Island is provided on an "as is" and "as available" basis. The developers assume no liability for emotional impacts, AI accuracy, network uptime, or data loss.</li>
            </ul>
          </div>
        </div>

        <div className="onboarding-gate-footer">
          <button className="agree-btn" onClick={handleAgree}>
            I Understand & Agree
          </button>
          <p className="footer-note">By clicking agree, you consent to the secure processing of your data as outlined above.</p>
        </div>
      </div>
    </div>
  );
}
