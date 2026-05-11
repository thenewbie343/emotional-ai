import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// --- Data for Games ---
const TRIVIA_QUESTIONS = [
  { q: "What is the only planet that spins clockwise?", a: "venus" },
  { q: "What is the dot over the letter 'i' called?", a: "tittle" },
  { q: "What is the speed of light in vacuum (in km/s)?", a: "299792" },
  { q: "What element does 'O' represent on the periodic table?", a: "oxygen" },
  { q: "Who wrote '1984'?", a: "george orwell" }
]

const WOULD_YOU_RATHER = [
  "Would you rather be able to fly or be invisible?",
  "Would you rather live without music or live without television?",
  "Would you rather explore space or the deep ocean?",
  "Would you rather always be 10 minutes late or 20 minutes early?",
  "Would you rather have unlimited free food or unlimited free flights?"
]

const STORY_STARTERS = [
  "The sky above the port was the color of television, tuned to a dead channel...",
  "It was a bright cold day in April, and the clocks were striking thirteen...",
  "In a hole in the ground there lived a hobbit...",
  "Once upon a time, in a floating city above the clouds...",
  "The last man on earth sat alone in a room. There was a knock on the door..."
]

export function getGameResponse(gameType, gameState, userInput) {
  const lowerInput = userInput.toLowerCase()
  let responseText = ""
  let newGameState = { ...gameState }
  let xpReward = 0
  let isGameOver = false

  switch (gameType) {
    case 'trivia':
      if (gameState.step === 'asking') {
        const currentQ = TRIVIA_QUESTIONS[gameState.qIndex]
        if (lowerInput.includes(currentQ.a)) {
          responseText = "Correct! Wow, you're smart. +15 XP!"
          xpReward = 15
        } else {
          responseText = `Ah, not quite! The answer was ${currentQ.a.toUpperCase()}.`
        }
        responseText += " Want another question? (say 'yes' or 'stop')"
        newGameState.step = 'waiting_to_continue'
      } else if (gameState.step === 'waiting_to_continue') {
        if (lowerInput.includes('yes') || lowerInput.includes('sure')) {
          const nextQIndex = Math.floor(Math.random() * TRIVIA_QUESTIONS.length)
          newGameState.qIndex = nextQIndex
          newGameState.step = 'asking'
          responseText = `Okay! Here's the question: ${TRIVIA_QUESTIONS[nextQIndex].q}`
        } else {
          responseText = "Okay, stopping trivia. That was fun!"
          isGameOver = true
        }
      }
      break

    case 'would_you_rather':
      if (gameState.step === 'asking') {
        responseText = "Interesting choice! I think I would choose the opposite, just to see what happens. Want another one? (say 'yes' or 'stop')"
        newGameState.step = 'waiting_to_continue'
        xpReward = 5
      } else if (gameState.step === 'waiting_to_continue') {
        if (lowerInput.includes('yes') || lowerInput.includes('sure')) {
          const nextQ = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)]
          newGameState.step = 'asking'
          responseText = `Alright: ${nextQ}`
        } else {
          responseText = "Okay, game over! I learned a lot about you."
          isGameOver = true
        }
      }
      break

    case 'story':
      if (gameState.step === 'writing') {
        if (lowerInput.includes('stop') || lowerInput.includes('end')) {
          responseText = "The End! What a wild story we just made. +20 XP!"
          isGameOver = true
          xpReward = 20
        } else {
          // In a real app, we'd use an LLM here to generate the next sentence based on userInput
          const genericContinuations = [
            "Suddenly, the lights flickered and a strange hum filled the air. Your turn!",
            "Out of nowhere, a shadow moved across the wall. What happens next?",
            "But before they could react, the ground began to shake! Go on...",
            "They looked down and realized they were holding a glowing blue crystal. Your turn!"
          ]
          responseText = genericContinuations[Math.floor(Math.random() * genericContinuations.length)]
          xpReward = 5 // XP for each turn
        }
      }
      break
      
    case '20_questions':
      if (gameState.step === 'playing') {
        newGameState.turnCount = (gameState.turnCount || 0) + 1
        if (lowerInput.includes('is it') || lowerInput.includes('are you')) {
          if (Math.random() > 0.8 || newGameState.turnCount >= 20) {
            responseText = `Yes! You guessed it in ${newGameState.turnCount} turns! +30 XP!`
            isGameOver = true
            xpReward = 30
          } else {
            responseText = "Nope, that's not it! Keep guessing."
          }
        } else {
          const answers = ["Yes.", "No.", "Sometimes.", "Rarely.", "I don't think so.", "Definitely."]
          responseText = answers[Math.floor(Math.random() * answers.length)] + ` (Turn ${newGameState.turnCount}/20)`
        }
      }
      break
      
    default:
      responseText = "I'm not sure how to play that game."
      isGameOver = true
  }

  return { responseText, newGameState, xpReward, isGameOver }
}

export function MiniGames({ onStartGame }) {
  const [isOpen, setIsOpen] = useState(false)

  const startGame = (type) => {
    let initialMessage = ""
    let initialState = {}

    switch (type) {
      case 'trivia':
        const qIndex = Math.floor(Math.random() * TRIVIA_QUESTIONS.length)
        initialMessage = `Let's play Trivia! Here is your first question: ${TRIVIA_QUESTIONS[qIndex].q}`
        initialState = { step: 'asking', qIndex }
        break
      case 'would_you_rather':
        const wq = WOULD_YOU_RATHER[Math.floor(Math.random() * WOULD_YOU_RATHER.length)]
        initialMessage = `Let's play Would You Rather! ${wq}`
        initialState = { step: 'asking' }
        break
      case 'story':
        const starter = STORY_STARTERS[Math.floor(Math.random() * STORY_STARTERS.length)]
        initialMessage = `Let's write a story together! I'll start, then you add the next sentence. Tell me to 'stop' when you want to end it. \n\n${starter}`
        initialState = { step: 'writing' }
        break
      case '20_questions':
        initialMessage = "I've thought of an object. You have 20 questions to guess what it is. Ask yes/no questions!"
        initialState = { step: 'playing', turnCount: 0 }
        break
      default:
        return
    }

    onStartGame(type, initialState, initialMessage)
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 16px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.2)', color: 'white',
          borderRadius: '20px', cursor: 'pointer', transition: 'all 0.3s'
        }}
      >
        🎮 Play a Game
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '40px', left: 0, width: '200px',
          background: 'rgba(20, 20, 30, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <button className="game-btn" onClick={() => startGame('trivia')}>🧠 Trivia</button>
          <button className="game-btn" onClick={() => startGame('would_you_rather')}>⚖️ Would You Rather</button>
          <button className="game-btn" onClick={() => startGame('story')}>✍️ Co-op Story</button>
          <button className="game-btn" onClick={() => startGame('20_questions')}>❓ 20 Questions</button>
          
          <style>{`
            .game-btn {
              padding: 10px; background: transparent; border: none;
              color: white; text-align: left; cursor: pointer; border-radius: 6px;
              transition: background 0.2s;
            }
            .game-btn:hover { background: rgba(255,255,255,0.1); }
          `}</style>
        </div>
      )}
    </div>
  )
}
