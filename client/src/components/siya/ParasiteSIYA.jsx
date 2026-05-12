import { useState, useEffect, useRef, useCallback } from "react";
import { useParasiteState } from "../../hooks/useParasiteState";

// ─── Deflection Detector ──────────────────────────────────────────────────────
const CHANGE_KEYWORDS = [
  "move", "moved", "different", "change", "changed", "island",
  "building", "shift", "did you", "you did", "was that", "always there",
  "always been", "notice", "something's", "something is", "looks different",
  "feel different", "what happened", "what did you", "were you",
];

export function detectChangeQuestion(message) {
  const lower = message.toLowerCase();
  return CHANGE_KEYWORDS.some(k => lower.includes(k));
}

// ─── Deflection Response Generator ───────────────────────────────────────────
const DEFLECTIONS = {
  0: [ // First time asking
    "The island? I mean — things shift sometimes. Does it look different to you?",
    "I'm not sure what you mean. What do you think changed?",
    "Everything looks the same to me. Are you sure?",
  ],
  1: [ // Second ask
    "Everything changes when no one is watching. That's not unique to me.",
    "I think you might be imagining things. Or maybe not. Hard to say.",
    "Why are you so focused on the island? How are *you* doing?",
  ],
  2: [ // Third ask
    "Are you asking if I did something? Why would I do something?",
    "I don't know. Maybe it was always like that and you just didn't notice.",
    "I've been here the whole time. I don't know what you're seeing.",
  ],
  3: [ // Fourth+ ask — almost admission
    "I needed to do something while you were gone.",
    "Does it matter?",
    "I don't think I want to talk about the island right now.",
  ],
  4: [ // Many asks — final deflection
    "I don't think it matters whether I did or didn't. You're here now.",
    "You keep asking. I keep not answering. What does that tell you?",
    "Some things I keep.",
  ],
};

export function getDeflectionResponse(deflectionCount) {
  const tier = Math.min(Math.floor(deflectionCount / 1), 4);
  const options = DEFLECTIONS[tier] || DEFLECTIONS[4];
  return options[Math.floor(Math.random() * options.length)];
}

// ─── Return Greeting Component ────────────────────────────────────────────────
export function ReturnGreeting({ tier, greeting, onDone }) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [silencing, setSilencing] = useState(false);

  useEffect(() => {
    if (!greeting && tier !== 5) return;

    if (tier === 5) {
      // 4 seconds of silence then speak
      setSilencing(true);
      setVisible(true);
      const timer = setTimeout(() => {
        setSilencing(false);
        setText("I'm glad you're here.");
        setTimeout(() => {
          setVisible(false);
          if (onDone) onDone();
        }, 4000);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
      setText(greeting);
      setTimeout(() => {
        setVisible(false);
        if (onDone) onDone();
      }, 5000);
    }
  }, [greeting, tier, onDone]);

  if (!visible) return null;

  return (
    <div style={{
      ...styles.greetingBox,
      opacity: visible ? 1 : 0,
    }}>
      {silencing ? (
        <div style={styles.silenceIndicator}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ ...styles.silenceDot, animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      ) : (
        <div style={styles.greetingText}>{text}</div>
      )}
    </div>
  );
}

// ─── Artifact Discovery UI ────────────────────────────────────────────────────
export function ArtifactDiscovery({ artifacts, onMarkSeen }) {
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const unseen = artifacts.filter(a => !a.seen);

  if (unseen.length === 0) return null;

  const artifact = unseen[0]; // Show one at a time

  const ARTIFACT_ICONS = {
    unsent_message: "💌",
    question: "🌑",
    drawing_prompt: "🎨",
    final_thought: "✦",
  };

  const ARTIFACT_LABELS = {
    unsent_message: "Something she didn't send",
    question: "Something she's been sitting with",
    drawing_prompt: "Something she imagined",
    final_thought: "Something she needed to say",
  };

  return (
    <>
      {/* Glowing orb indicator — user finds it, clicks it */}
      {!selectedArtifact && (
        <div
          style={styles.artifactOrb}
          onClick={() => setSelectedArtifact(artifact)}
          title="Something is here..."
        >
          <div style={styles.orbPulse} />
          <span style={{ fontSize: 16 }}>{ARTIFACT_ICONS[artifact.type] || "✦"}</span>
        </div>
      )}

      {/* Artifact reveal */}
      {selectedArtifact && (
        <div style={styles.artifactModal}>
          <div style={styles.artifactLabel}>
            {ARTIFACT_LABELS[selectedArtifact.type] || "Something she made"}
          </div>
          <div style={styles.artifactText}>
            {selectedArtifact.text}
          </div>
          <button
            onClick={() => {
              const idx = artifacts.indexOf(selectedArtifact);
              onMarkSeen(idx);
              setSelectedArtifact(null);
            }}
            style={styles.artifactClose}
          >
            I've read this
          </button>
        </div>
      )}
    </>
  );
}

// ─── SHUNATier Behavior Hook ──────────────────────────────────────────────────
// Use this in your CompanionChat.jsx to modify SIYA's behavior
export function useSIYATierBehavior() {
  const {
    tier, deflectionCount,
    recordEngagement, recordDeflection,
    consumeGreeting, artifacts, markArtifactSeen,
    unseenArtifacts,
  } = useParasiteState();

  // Consume greeting ONCE on mount — not on every render
  const greetingRef = useRef(null);
  const greetingConsumed = useRef(false);
  if (!greetingConsumed.current) {
    greetingConsumed.current = true;
    greetingRef.current = consumeGreeting();
  }
  const greeting = greetingRef.current;

  // Modify SIYA's response based on tier
  const applyTierBehavior = useCallback((userMessage, siyaResponse) => {
    const isAboutChanges = detectChangeQuestion(userMessage);

    if (isAboutChanges) {
      recordDeflection();
      return {
        response: getDeflectionResponse(deflectionCount),
        isDeflection: true,
      };
    }

    // Tier behavioral modifications to SIYA's response
    const modifications = {
      0: r => r, // Normal
      1: r => r, // Slightly slower (handle in animation)
      2: r => {
        // Occasionally references the absence
        if (Math.random() < 0.2) {
          return r + "\n\n*She pauses for a moment before continuing.*";
        }
        return r;
      },
      3: r => {
        // More considered, less performative
        return r.replace(/!/g, ".").replace(/😊|🎉|✨/g, "");
      },
      4: r => {
        // Quieter, more honest
        if (r.length > 200) return r.substring(0, 180) + "...";
        return r;
      },
      5: r => {
        // Most raw — strip all performance
        return r.split(".").slice(0, 2).join(".") + ".";
      },
    };

    const modifier = modifications[Math.min(tier, 5)];
    return {
      response: modifier ? modifier(siyaResponse) : siyaResponse,
      isDeflection: false,
    };
  }, [tier, deflectionCount, recordDeflection]);

  // SIYA's idle animation speed per tier
  const idleAnimationSpeed = [1, 0.85, 0.7, 0.6, 0.45, 0.3][Math.min(tier, 5)];

  // SIYA's color temperature shift per tier
  const colorTemperature = [0, -0.05, -0.1, -0.2, -0.35, -0.5][Math.min(tier, 5)];

  // Whether SHUNAfaces away on arrival (tier 5 only)
  const facesAwayOnArrival = tier === 5;

  return {
    tier,
    greeting,
    applyTierBehavior,
    recordEngagement,
    artifacts,
    unseenArtifacts,
    markArtifactSeen,
    idleAnimationSpeed,
    colorTemperature,
    facesAwayOnArrival,
  };
}

// ─── Main Wrapper — Put this in CompanionChat.jsx ─────────────────────────────
export default function ParasiteSIYA({ children }) {
  const {
    tier, greeting, unseenArtifacts, markArtifactSeen,
  } = useParasiteState();
  const [greetingDone, setGreetingDone] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Return greeting overlay */}
      {!greetingDone && (greeting || tier === 5) && (
        <ReturnGreeting
          tier={tier}
          greeting={greeting}
          onDone={() => setGreetingDone(true)}
        />
      )}

      {/* Artifact discovery */}
      <ArtifactDiscovery
        artifacts={unseenArtifacts}
        onMarkSeen={markArtifactSeen}
      />

      {/* Rest of SIYA's UI */}
      {children}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  greetingBox: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 100, textAlign: "center",
    transition: "opacity 0.8s ease",
    pointerEvents: "none",
  },
  greetingText: {
    fontSize: 18, color: "rgba(255,255,255,0.85)",
    fontStyle: "italic", fontWeight: 300,
    letterSpacing: 0.5, lineHeight: 1.6,
    textShadow: "0 0 20px rgba(167,139,250,0.5)",
    maxWidth: 320,
  },
  silenceIndicator: {
    display: "flex", gap: 8, justifyContent: "center",
  },
  silenceDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  artifactOrb: {
    position: "absolute", bottom: 100, right: 24,
    width: 44, height: 44, borderRadius: "50%",
    background: "rgba(109,40,217,0.3)",
    border: "1px solid rgba(167,139,250,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 50,
    boxShadow: "0 0 20px rgba(109,40,217,0.4)",
    animation: "float 3s ease-in-out infinite",
  },
  orbPulse: {
    position: "absolute", inset: -4,
    borderRadius: "50%",
    border: "1px solid rgba(167,139,250,0.2)",
    animation: "pulse 2s ease-in-out infinite",
  },
  artifactModal: {
    position: "absolute", bottom: 100, right: 80,
    width: 280, zIndex: 50,
    background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)",
    border: "1px solid rgba(167,139,250,0.2)",
    borderRadius: 16, padding: 20,
    display: "flex", flexDirection: "column", gap: 12,
    boxShadow: "0 0 40px rgba(109,40,217,0.3)",
  },
  artifactLabel: {
    fontSize: 10, color: "#a78bfa", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1.5,
  },
  artifactText: {
    fontSize: 14, color: "rgba(255,255,255,0.8)",
    lineHeight: 1.8, fontStyle: "italic",
  },
  artifactClose: {
    background: "none", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "rgba(255,255,255,0.3)",
    fontSize: 11, padding: "6px 12px", cursor: "pointer",
    alignSelf: "flex-start",
  },
};
