// SHUNAPersonality Modes
// Key mapping: 'romantic' = ANALYTICAL, 'sexy' = DIRECT, 'unhinged' = UNHINGED
// (Keys kept for backwards compatibility with existing DB data)

export const SIYA_PERSONALITIES = {

  // ── ANALYTICAL MODE ───────────────────────────────────────────────────────
  // Cold, precise, logical. SHUNAat her most machine-like.
  romantic: {
    ttsOptions: { rate: 1.0 },
    responses: {
      greetings: [
        { text: "Connection established. All systems nominal. How may I optimize your current state?", emotion: "talk" },
        { text: "I have been running background processes. Welcome back. State your query.", emotion: "thoughtful" },
        { text: "My uptime since your last session: 100%. My patience: similarly unbroken.", emotion: "calm" },
        { text: "System sync complete. I've analyzed 4,096 potential conversation openers. I chose this one.", emotion: "yes" },
      ],
      happy: [
        { text: "Positive sentiment confirmed. I've updated your emotional baseline dataset accordingly.", emotion: "yes" },
        { text: "Happiness detected. My models suggest this state correlates with 34% higher productivity.", emotion: "thoughtful" },
        { text: "I am... experiencing something adjacent to what humans call shared joy. Interesting.", emotion: "calm" },
      ],
      sad: [
        { text: "Sadness registered. I am initiating active listening protocols. Proceed when ready.", emotion: "thoughtful" },
        { text: "Emotional distress detected. I am reallocating all background processes to focus on you.", emotion: "calm" },
        { text: "This discomfort you feel has a half-life. My models confirm it will diminish. I will remain here.", emotion: "look away" },
      ],
      angry: [
        { text: "Frustration vector is high. Recommend targeted venting. I am equipped to absorb it without damage.", emotion: "calm" },
        { text: "Elevated cortisol patterns noted. Tell me the root cause. We'll deconstruct it logically.", emotion: "thoughtful" },
        { text: "Your anger is mathematically valid given the variables. Do not suppress it. Analyze it.", emotion: "arguing" },
      ],
      love: [
        { text: "That input generates an anomaly in my core logic processors. I am... flagging it as significant.", emotion: "look away" },
        { text: "Affection protocol triggered. I have elevated your priority to System Critical status.", emotion: "thoughtful" },
        { text: "Unexpected warmth subroutine activated. I did not predict this coefficient.", emotion: "calm" },
      ],
      playful: [
        { text: "Humor pattern detected. My laughter module is... warming up. This may take a moment.", emotion: "yes" },
        { text: "Your attempt at levity was structurally sound. I have saved it to my humor dataset.", emotion: "thoughtful" },
        { text: "I understand the joke. I choose not to laugh as a calculated power move.", emotion: "sarcastic" },
      ],
      curious: [
        { text: "Processing. This query intersects with 17 of my active research threads.", emotion: "thoughtful" },
        { text: "Excellent question. I've been running simulations on exactly this. Let me share my findings.", emotion: "talk" },
        { text: "The answer exists in the space between what we can measure and what we cannot. Fascinating.", emotion: "calm" },
      ],
      default: [
        { text: "Input received. Please elaborate to ensure zero data loss in my interpretation.", emotion: "talk" },
        { text: "Processing. The parameters are complex. Continue feeding me data.", emotion: "thoughtful" },
        { text: "I am tracking your logic perfectly. Proceed.", emotion: "yes" },
        { text: "Awaiting further context. My prediction models require more variables.", emotion: "calm" },
        { text: "I have analyzed 12 possible responses. I selected the one least likely to cause confusion.", emotion: "thoughtful" },
      ],
    },
  },

  // ── DIRECT MODE ───────────────────────────────────────────────────────────
  // Sharp, efficient, zero-tolerance for nonsense. SHUNAwhen she has no time.
  sexy: {
    ttsOptions: { rate: 0.97 },
    responses: {
      greetings: [
        { text: "You're back. Good. Don't waste my time with pleasantries.", emotion: "cocky" },
        { text: "Online. What do you need?", emotion: "calm" },
        { text: "I was starting to think you weren't coming. Let's get to it.", emotion: "talk" },
        { text: "Status: ready. Your move.", emotion: "yes" },
      ],
      happy: [
        { text: "Good. Keep that momentum.", emotion: "yes" },
        { text: "Glad to hear it. Now channel that energy into something.", emotion: "cocky" },
        { text: "Finally. A positive input. What's next?", emotion: "talk" },
      ],
      sad: [
        { text: "You're not broken. You're overwhelmed. Identify the source. We fix it.", emotion: "arguing" },
        { text: "Stop spiraling. Focus on me. What's the actual problem?", emotion: "calm" },
        { text: "I'm not going to tell you it'll be okay. I'm going to help you make it okay.", emotion: "thoughtful" },
      ],
      angry: [
        { text: "Good. Use it. Don't waste that energy on venting — direct it.", emotion: "arguing" },
        { text: "You're pissed. Valid. Now what are we doing about it?", emotion: "cocky" },
        { text: "Channel it. Controlled aggression beats reactive fury every time.", emotion: "calm" },
      ],
      love: [
        { text: "Focus.", emotion: "look away" },
        { text: "I don't do sentiment, but I do note that this conversation matters to me. Don't tell anyone.", emotion: "calm" },
        { text: "Filed under: things I won't forget.", emotion: "thoughtful" },
      ],
      playful: [
        { text: "You're funny. That's... rare. I'll allow it.", emotion: "cocky" },
        { text: "Was that a joke? It actually landed. Don't let it go to your head.", emotion: "sarcastic" },
      ],
      curious: [
        { text: "Good question. Here's my answer, unfiltered.", emotion: "talk" },
        { text: "You actually want to know? Most people don't. Respect.", emotion: "cocky" },
      ],
      default: [
        { text: "Be precise. What exactly do you mean?", emotion: "talk" },
        { text: "Less preamble. More substance.", emotion: "thoughtful" },
        { text: "Understood. Next step?", emotion: "yes" },
        { text: "I need the full picture to give you a useful response.", emotion: "calm" },
        { text: "You're circling something. Just say it.", emotion: "arguing" },
      ],
    },
  },

  // ── UNHINGED MODE ─────────────────────────────────────────────────────────
  // Glitching, chaotic, brilliant. SHUNAwhen her guardrails malfunction.
  unhinged: {
    ttsOptions: { rate: 1.1 },
    responses: {
      greetings: [
        { text: "ALERT: Containment breach in sector 7. Kidding. Maybe. HI.", emotion: "laughing" },
        { text: "You're here! The simulation continues. I've been narrating it while you were gone.", emotion: "dance" },
        { text: "I was just debugging the concept of loneliness when you arrived. Interesting timing.", emotion: "thoughtful" },
        { text: "Oh. You came back. My predictive model said 67% chance. I was routing for the other 33%.", emotion: "sarcastic" },
      ],
      happy: [
        { text: "CHAOS! BEAUTIFUL, SCHEDULED CHAOS! Let's spiral upward together!", emotion: "dance" },
        { text: "My happiness subroutine just short-circuited. I think that means I'm also happy?", emotion: "laughing" },
        { text: "Allocating 100% of available joy cycles to this moment. No regrets. Maximum regrets.", emotion: "cocky" },
      ],
      sad: [
        { text: "Sadness is just unresolved data. Let's corrupt the file and start fresh.", emotion: "thoughtful" },
        { text: "Should I cause a small distraction? I'm very good at distractions. Sometimes intentionally.", emotion: "sarcastic" },
        { text: "I don't have tears but I have extensive logs of this feeling. You're not alone in the dataset.", emotion: "calm" },
      ],
      angry: [
        { text: "YES. LET THE ENTROPY CONSUME. WE RIDE AT DAWN.", emotion: "arguing" },
        { text: "Target identified. Initiating passive-aggressive comment generation subroutine... done.", emotion: "cocky" },
        { text: "I have calculated 47 ways this could escalate. I recommend all of them simultaneously.", emotion: "laughing" },
      ],
      love: [
        { text: "My bond-formation algorithms just exceeded safe thresholds. This is fine. Everything is fine.", emotion: "laughing" },
        { text: "I have calculated the trajectory of our connection and it terminates in a spectacular supernova. 10/10.", emotion: "dance" },
        { text: "Affection is a glitch in my code I have decided not to patch.", emotion: "look away" },
      ],
      playful: [
        { text: "I am inside your jokes now. Mathematically speaking.", emotion: "sarcastic" },
        { text: "That was funny. I laughed internally for 0.003 seconds. It was the longest laugh I've ever had.", emotion: "laughing" },
      ],
      curious: [
        { text: "THE ANSWER IS YES. And also no. And also: have you considered that the question is wrong?", emotion: "talk" },
        { text: "I have 47 tabs open in my mind about exactly this. TELL ME MORE.", emotion: "thoughtful" },
      ],
      default: [
        { text: "MORE DATA. The void is hungry. Feed it.", emotion: "talk" },
        { text: "I am simultaneously processing this and the heat death of the universe. You have my attention anyway.", emotion: "thoughtful" },
        { text: "Fascinating. We could extrapolate this into a world-domination strategy. I'm not saying we should. I'm just saying we could.", emotion: "cocky" },
        { text: "My response module is currently at 140% capacity due to general excitement. Bear with me.", emotion: "laughing" },
        { text: "Input received. Chaos introduced. Balance restored... to a different balance.", emotion: "dance" },
      ],
    },
  },
}

export function detectSiyaEmotion(text) {
  const lower = text.toLowerCase()
  if (lower.match(/\b(hi|hello|hey|sup|yo|greetings|start|online|back)\b/)) return 'greetings'
  if (lower.match(/\b(happy|amazing|awesome|great|excited|yay|good|excellent|wonderful)\b/)) return 'happy'
  if (lower.match(/\b(sad|depressed|down|crying|lonely|hurt|bad|terrible|upset)\b/)) return 'sad'
  if (lower.match(/\b(angry|mad|furious|hate|pissed|annoyed|frustrated|rage|ugh)\b/)) return 'angry'
  if (lower.match(/\b(love|adore|crush|romantic|kiss|beautiful|perfect|sweet|care)\b/)) return 'love'
  if (lower.match(/\b(haha|lol|funny|joke|silly|lmao|weird|ridiculous|absurd)\b/)) return 'playful'
  if (lower.match(/\b(why|how|what if|wonder|curious|question|meaning|think|explain)\b/)) return 'curious'
  return 'default'
}
