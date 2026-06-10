/**
 * Achievement trigger checkers mapping game events to the unlock functions.
 */

export async function checkMissionAchievement(completedCount, unlockFn) {
  if (completedCount >= 10) {
    await unlockFn('library_tower');
  }
}

export async function checkStreakAchievement(streakDays, unlockFn) {
  if (streakDays >= 7) {
    await unlockFn('aurora');
  }
  if (streakDays >= 30) {
    await unlockFn('lighthouse');
  }
}

export function checkExamAchievement(unlockFn, setShowFireworks) {
  // Triggers temporary fireworks burst. Not stored permanently in the DB.
  if (setShowFireworks) {
    setShowFireworks(true);
  } else {
    // Global fallback event for triggering fireworks from other scenes/pages
    window.dispatchEvent(new CustomEvent('trigger-fireworks'));
  }
}

export async function checkGoalAchievement(goalName, unlockFn) {
  if (goalName) {
    await unlockFn('monument', { goalName });
  }
}

export async function checkPomodorAchievement(totalPomodoros, unlockFn) {
  if (totalPomodoros >= 25) {
    await unlockFn('garden');
  }
}

export async function checkRankAchievement(rank, unlockFn) {
  if (rank === 'Mastermind') {
    await unlockFn('observatory');
  }
}
