import { supabaseWithCustomStorage as supabase } from '@/integrations/supabase/customClient';
import { createNotification } from './notifications';

const DEFAULT_THRESHOLD = 20; // 20% default threshold
const STORAGE_KEY = 'ocr_reversion_threshold';
const LAST_ALERT_KEY = 'ocr_reversion_last_alert';

export interface OCRReversionAlertConfig {
  threshold: number; // Percentage (0-100)
  enabled: boolean;
}

/**
 * Get the configured threshold from localStorage (structure-specific)
 */
export function getThresholdConfig(structureId: string): OCRReversionAlertConfig {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${structureId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading threshold config:', e);
  }
  return { threshold: DEFAULT_THRESHOLD, enabled: true };
}

/**
 * Save threshold configuration
 */
export function saveThresholdConfig(structureId: string, config: OCRReversionAlertConfig): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${structureId}`, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving threshold config:', e);
  }
}

/**
 * Check if we should send an alert (rate limiting - max once per day)
 */
function shouldSendAlert(structureId: string): boolean {
  try {
    const lastAlert = localStorage.getItem(`${LAST_ALERT_KEY}_${structureId}`);
    if (!lastAlert) return true;
    
    const lastAlertDate = new Date(lastAlert);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60);
    
    // Only send alert once every 24 hours
    return hoursDiff >= 24;
  } catch {
    return true;
  }
}

/**
 * Mark that we sent an alert
 */
function markAlertSent(structureId: string): void {
  try {
    localStorage.setItem(`${LAST_ALERT_KEY}_${structureId}`, new Date().toISOString());
  } catch (e) {
    console.error('Error marking alert sent:', e);
  }
}

/**
 * Calculate reversion rate from recent imports
 */
export async function calculateReversionRate(
  structureId: string,
  daysBack: number = 30
): Promise<{ total: number; reverted: number; rate: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data: imports, error } = await supabase
    .from('ocr_import_history')
    .select('status')
    .eq('structure_id', structureId)
    .gte('imported_at', cutoffDate.toISOString());

  if (error || !imports) {
    return { total: 0, reverted: 0, rate: 0 };
  }

  const total = imports.length;
  const reverted = imports.filter(i => i.status === 'reverted').length;
  const rate = total > 0 ? (reverted / total) * 100 : 0;

  return { total, reverted, rate };
}

/**
 * Get admin users for a structure to notify
 */
async function getAdminUsers(structureId: string): Promise<string[]> {
  const { data: members, error } = await supabase
    .from('org_members')
    .select('user_id, org_role')
    .eq('structure_id', structureId)
    .eq('is_active', true)
    .in('org_role', ['admin', 'owner']);

  if (error || !members) {
    return [];
  }

  return members.map(m => m.user_id);
}

/**
 * Check reversion rate and send alerts if threshold exceeded
 */
export async function checkAndAlertReversionRate(structureId: string): Promise<{
  checked: boolean;
  rate: number;
  alertSent: boolean;
  threshold: number;
}> {
  const config = getThresholdConfig(structureId);
  
  if (!config.enabled) {
    return { checked: false, rate: 0, alertSent: false, threshold: config.threshold };
  }

  const { total, reverted, rate } = await calculateReversionRate(structureId);

  // Need minimum 5 imports to trigger alert
  if (total < 5) {
    return { checked: true, rate, alertSent: false, threshold: config.threshold };
  }

  // Check if rate exceeds threshold
  if (rate > config.threshold) {
    // Rate limit alerts
    if (!shouldSendAlert(structureId)) {
      return { checked: true, rate, alertSent: false, threshold: config.threshold };
    }

    // Get admins to notify
    const adminIds = await getAdminUsers(structureId);
    
    if (adminIds.length === 0) {
      return { checked: true, rate, alertSent: false, threshold: config.threshold };
    }

    // Send notifications
    const title = `⚠️ Taux d'annulation OCR élevé`;
    const message = `Le taux d'annulation des imports OCR (${rate.toFixed(1)}%) dépasse le seuil configuré (${config.threshold}%). ${reverted} imports annulés sur ${total} ces 30 derniers jours.`;

    const notificationPromises = adminIds.map(userId =>
      createNotification(
        userId,
        structureId,
        title,
        message,
        'warning',
        '/admin?tab=stats'
      )
    );

    await Promise.allSettled(notificationPromises);
    markAlertSent(structureId);

    return { checked: true, rate, alertSent: true, threshold: config.threshold };
  }

  return { checked: true, rate, alertSent: false, threshold: config.threshold };
}
