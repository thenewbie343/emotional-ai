import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || "https://emotional-ai-18zi.onrender.com";

export default function QuizModal({ session, lessonName, onClose }) {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentIdx, setCurrentIdx] = useState(0); // 0, 1, 2 = MC, 3 = Open Ended
  const [selectedOption, setSelectedOption] = useState(null);
  const [mcCorrectCount, setMcCorrectCount] = useState(0);
  
  // Feynman open ended state
  const [explanation, setExplanation] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [xpEarned, setXpEarned] = useState(0);
  const [step, setStep] = useState('questions'); // 'questions', 'feynman', 'feedback'

  const userId = session?.user?.id;

  useEffect(() => {
    fetchQuiz();
  }, [lessonName]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/study/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: lessonName })
      });
      const data = await res.json();
      setQuizData(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load quiz. Please try again.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleNextMC = () => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === quizData.multipleChoice[currentIdx].answerIndex;
    if (isCorrect) {
      setMcCorrectCount(prev => prev + 1);
    }
    
    setSelectedOption(null);
    if (currentIdx < 2) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setStep('feynman');
    }
  };

  const handleSubmitExplanation = async (e) => {
    e.preventDefault();
    if (!explanation.trim()) return;
    
    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE}/api/study/quiz/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          question: quizData.openEnded.question,
          explanation: explanation.trim()
        })
      });
      const data = await res.json();
      setFeedback(data.feedback);
      setXpEarned(data.xpEarned || 25);
      setStep('feedback');
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate explanation.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle} className="text-center py-12">
          <div style={spinnerStyle}></div>
          <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', letterSpacing: '1px' }}>
            SAI is generating quiz questions...
          </p>
        </div>
      </div>
    );
  }

  const currentMcQuestion = quizData?.multipleChoice?.[currentIdx];

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f3e8ff' }}>Quiz: {lessonName}</h3>
            <span style={{ fontSize: '0.75rem', color: 'rgba(168,85,247,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SAI Active Recall Engine
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: MULTIPLE CHOICE */}
          {step === 'questions' && currentMcQuestion && (
            <motion.div key="mc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Question {currentIdx + 1} of 3
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e2e8f0', marginBottom: 20, lineHeight: 1.5 }}>
                {currentMcQuestion.question}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {currentMcQuestion.options.map((option, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    style={{
                      background: selectedOption === idx ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedOption === idx ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                      padding: '14px 18px', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem',
                      color: selectedOption === idx ? '#c084fc' : '#e2e8f0', transition: 'all 0.2s'
                    }}
                    className="hover:bg-white/5"
                  >
                    {option}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleNextMC}
                  disabled={selectedOption === null}
                  style={{
                    background: selectedOption === null ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                    border: 'none', padding: '12px 24px', borderRadius: '12px', color: selectedOption === null ? 'rgba(255,255,255,0.3)' : 'white',
                    fontWeight: 600, fontSize: '0.85rem', cursor: selectedOption === null ? 'not-allowed' : 'pointer'
                  }}
                >
                  {currentIdx < 2 ? "Next Question" : "Continue to Feynman Section"}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: FEYNMAN OPEN-ENDED */}
          {step === 'feynman' && (
            <motion.div key="feynman" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Feynman Active Recall
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 500, color: '#e2e8f0', marginBottom: 16, lineHeight: 1.5 }}>
                {quizData.openEnded.question}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.4 }}>
                💡 Explain this concept in your own words as if you were teaching it to someone else. SAI will evaluate your explanation for logical gaps and missing details.
              </p>

              <form onSubmit={handleSubmitExplanation}>
                <textarea
                  placeholder="Type your explanation here..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  disabled={evaluating}
                  rows={6}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px', padding: '16px', color: 'white', outline: 'none', fontSize: '0.85rem',
                    lineHeight: 1.5, resize: 'none', marginBottom: 24
                  }}
                  required
                />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={evaluating || !explanation.trim()}
                    style={{
                      background: evaluating || !explanation.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      border: 'none', padding: '12px 24px', borderRadius: '12px', color: evaluating || !explanation.trim() ? 'rgba(255,255,255,0.3)' : 'white',
                      fontWeight: 600, fontSize: '0.85rem', cursor: evaluating || !explanation.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {evaluating ? "Evaluating Explanation..." : "Submit Explanation"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 3: SCORE & FEEDBACK */}
          {step === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Summary Metrics */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>MC Score</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: mcCorrectCount === 3 ? '#10b981' : '#f59e0b' }}>
                    {mcCorrectCount} / 3 Correct
                  </div>
                </div>
                <div style={{ flex: 1, background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>XP Awarded</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c084fc' }}>
                    +{xpEarned} XP
                  </div>
                </div>
              </div>

              {/* SAI Logical Critique */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                  SAI Logical Critique
                </h4>
                <div style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px',
                  padding: '18px', fontSize: '0.85rem', lineHeight: 1.6, color: '#cbd5e1', maxHeight: '250px',
                  overflowY: 'auto'
                }} className="no-scrollbar">
                  {feedback.split('\n').map((para, i) => para.trim() ? <p key={i} style={{ marginBottom: 12 }}>{para}</p> : null)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px 28px', borderRadius: '12px', color: 'white', fontWeight: 600,
                    fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Close Results
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Inline Styles
const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
  zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center',
  padding: '20px'
};

const modalContentStyle = {
  background: 'rgba(15, 15, 25, 0.9)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px', padding: '32px 40px', maxWidth: '520px', width: '100%',
  color: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif'
};

const spinnerStyle = {
  width: '40px', height: '40px', border: '3px solid rgba(168, 85, 247, 0.2)',
  borderTop: '3px solid #c084fc', borderRadius: '50%', animation: 'spin 1s linear infinite',
  margin: '0 auto'
};
