import { supabase } from '../api/supabaseClient';
import { NOTIFICATION_TEMPLATES } from '../data/notificationTemplates';

class NotificationEngine {
  constructor() {
    this.addNotification = null;
    this.hasEvaluatedToday = false;
  }

  init(addNotificationFn) {
    this.addNotification = addNotificationFn;
  }

  // Get synced state from Supabase auth metadata
  async getSyncState() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return user.user_metadata?.notification_state || {};
  }

  // Save synced state back to Supabase
  async saveSyncState(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const currentState = user.user_metadata?.notification_state || {};
    const newState = { ...currentState, ...updates };
    
    await supabase.auth.updateUser({
      data: { notification_state: newState }
    });
  }

  getRandomTemplate(triggerArray) {
    if (!triggerArray || triggerArray.length === 0) return "Notification received.";
    const index = Math.floor(Math.random() * triggerArray.length);
    return triggerArray[index];
  }

  // Evaluate the heavy triggers on load or via interval
  async evaluateTriggers() {
    if (!this.addNotification) return;

    const state = await this.getSyncState();
    if (!state) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Anti-spam: max 3 per day
    const dailyCount = state.daily_count_date === todayStr ? (state.daily_count || 0) : 0;
    if (dailyCount >= 3) return;

    let notificationSent = false;

    // --- EVALUATION LOGIC ---

    // 1. INACTIVE_3_DAYS_SHUNA
    const lastLogin = state.last_login ? new Date(state.last_login) : now;
    const daysSinceLogin = (now - lastLogin) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLogin >= 3 && !state.notified_inactive_3) {
      this.fireNotification('Shuna', 'INACTIVE_3_DAYS_SHUNA');
      await this.saveSyncState({ notified_inactive_3: true });
      notificationSent = true;
    }

    // 2. DIDNT_START_STUDY_YET
    // If it's past 2 PM and no study session logged today
    if (!notificationSent && now.getHours() >= 14) {
      const lastStudy = state.last_study_session ? new Date(state.last_study_session) : new Date(0);
      const studyToday = lastStudy.toISOString().split('T')[0] === todayStr;
      
      if (!studyToday && state.didnt_study_notified !== todayStr) {
        this.fireNotification('Sai', 'DIDNT_START_STUDY_YET');
        await this.saveSyncState({ didnt_study_notified: todayStr });
        notificationSent = true;
      }
    }

    // Update login timestamp for next time
    await this.saveSyncState({
      last_login: now.toISOString(),
      daily_count: notificationSent ? dailyCount + 1 : dailyCount,
      daily_count_date: todayStr
    });
  }

  // Can be called immediately from components (e.g. Pomodoro timer hits 0)
  triggerImmediate(sender, triggerId) {
    if (!this.addNotification) return;
    this.fireNotification(sender, triggerId);
  }

  fireNotification(sender, triggerId) {
    const templates = NOTIFICATION_TEMPLATES[triggerId];
    const message = this.getRandomTemplate(templates);
    
    this.addNotification({
      sender,
      message,
      triggerId
    });
  }
}

export const notificationEngine = new NotificationEngine();
