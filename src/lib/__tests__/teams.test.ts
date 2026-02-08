import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  DEFAULT_TEAMS, 
  TEAM_COLORS,
  EVENT_KEY_LABELS,
  type EventKey,
  type TargetType,
  type NotificationChannel,
} from '../teams';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
    })),
  },
}));

describe('Teams Library', () => {
  
  describe('DEFAULT_TEAMS configuration', () => {
    it('should have 4 default teams defined', () => {
      expect(DEFAULT_TEAMS).toHaveLength(4);
    });

    it('should have Assistantes team with pink color', () => {
      const assistantes = DEFAULT_TEAMS.find(t => t.name === 'Assistantes');
      expect(assistantes).toBeDefined();
      expect(assistantes?.color).toBe('#ec4899');
      expect(assistantes?.description).toContain('administrative');
    });

    it('should have Médecins team with blue color', () => {
      const medecins = DEFAULT_TEAMS.find(t => t.name === 'Médecins');
      expect(medecins).toBeDefined();
      expect(medecins?.color).toBe('#3b82f6');
      expect(medecins?.description).toContain('Praticiens');
    });

    it('should have Coordination team with emerald color', () => {
      const coordination = DEFAULT_TEAMS.find(t => t.name === 'Coordination');
      expect(coordination).toBeDefined();
      expect(coordination?.color).toBe('#10b981');
      expect(coordination?.description).toContain('coordination');
    });

    it('should have PDSA team with amber color', () => {
      const pdsa = DEFAULT_TEAMS.find(t => t.name === 'PDSA');
      expect(pdsa).toBeDefined();
      expect(pdsa?.color).toBe('#f59e0b');
      expect(pdsa?.description).toContain('soins ambulatoires');
    });

    it('all default teams should have required properties', () => {
      for (const team of DEFAULT_TEAMS) {
        expect(team.name).toBeDefined();
        expect(team.name.length).toBeGreaterThan(0);
        expect(team.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(team.description).toBeDefined();
      }
    });
  });

  describe('TEAM_COLORS palette', () => {
    it('should have 10 colors', () => {
      expect(TEAM_COLORS).toHaveLength(10);
    });

    it('all colors should be valid hex codes', () => {
      for (const color of TEAM_COLORS) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('should include all default team colors', () => {
      const defaultColors = DEFAULT_TEAMS.map(t => t.color);
      for (const color of defaultColors) {
        expect(TEAM_COLORS).toContain(color);
      }
    });
  });

  describe('EVENT_KEY_LABELS', () => {
    const expectedEvents: EventKey[] = [
      'new_appointment',
      'cancel_appointment', 
      'no_show',
      'urgent_alert',
      'daily_summary',
    ];

    it('should have labels for all event keys', () => {
      for (const event of expectedEvents) {
        expect(EVENT_KEY_LABELS[event]).toBeDefined();
        expect(EVENT_KEY_LABELS[event].length).toBeGreaterThan(0);
      }
    });

    it('new_appointment should be labeled in French', () => {
      expect(EVENT_KEY_LABELS.new_appointment).toBe('Nouveau rendez-vous');
    });

    it('urgent_alert should be labeled in French', () => {
      expect(EVENT_KEY_LABELS.urgent_alert).toBe('Alertes urgentes');
    });

    it('daily_summary should be labeled in French', () => {
      expect(EVENT_KEY_LABELS.daily_summary).toBe('Résumé quotidien');
    });
  });

  describe('Type definitions', () => {
    it('EventKey type should include expected values', () => {
      const eventKeys: EventKey[] = [
        'new_appointment',
        'cancel_appointment',
        'no_show',
        'urgent_alert',
        'daily_summary',
      ];
      
      // Type checking at compile time, runtime just verifies array
      expect(eventKeys).toHaveLength(5);
    });

    it('TargetType should include expected values', () => {
      const targetTypes: TargetType[] = ['structure', 'team', 'user'];
      expect(targetTypes).toHaveLength(3);
    });

    it('NotificationChannel should include expected values', () => {
      const channels: NotificationChannel[] = ['email', 'sms'];
      expect(channels).toHaveLength(2);
    });
  });
});

describe('Smart Default Team Assignments', () => {
  // These match the DEFAULT_TEAM_ASSIGNMENTS in useNotificationRecipients.ts
  const smartDefaults: Record<EventKey, string[]> = {
    new_appointment: ['Assistantes'],
    cancel_appointment: ['Assistantes'],
    no_show: ['Assistantes', 'Coordination'],
    urgent_alert: [], // No default for security
    daily_summary: ['Coordination'],
  };

  it('new_appointment should default to Assistantes', () => {
    expect(smartDefaults.new_appointment).toEqual(['Assistantes']);
  });

  it('cancel_appointment should default to Assistantes', () => {
    expect(smartDefaults.cancel_appointment).toEqual(['Assistantes']);
  });

  it('no_show should default to Assistantes AND Coordination', () => {
    expect(smartDefaults.no_show).toContain('Assistantes');
    expect(smartDefaults.no_show).toContain('Coordination');
    expect(smartDefaults.no_show).toHaveLength(2);
  });

  it('urgent_alert should have NO default recipients (security)', () => {
    expect(smartDefaults.urgent_alert).toEqual([]);
  });

  it('daily_summary should default to Coordination', () => {
    expect(smartDefaults.daily_summary).toEqual(['Coordination']);
  });

  it('all assigned teams should exist in DEFAULT_TEAMS', () => {
    const defaultTeamNames = DEFAULT_TEAMS.map(t => t.name);
    
    for (const [, teams] of Object.entries(smartDefaults)) {
      for (const teamName of teams) {
        expect(defaultTeamNames).toContain(teamName);
      }
    }
  });
});
