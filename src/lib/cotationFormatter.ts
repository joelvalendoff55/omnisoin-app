/**
 * Cotation/Billing formatting utilities for Omnidoc export
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface CotationActe {
  id: string;
  code: string;
  type: 'ccam' | 'ngap';
  label: string;
  tarif_base: number;
  coefficient?: number;
  modificateurs?: string[];
  tarif_final: number;
}

export interface CotationEntry {
  id: string;
  patient_name?: string;
  practitioner_name?: string;
  date: string;
  actes: CotationActe[];
  total: number;
  notes?: string;
}

export interface Modificateur {
  code: string;
  label: string;
  type: 'majoration' | 'reduction' | 'supplement';
  value: number;
  is_percentage: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  ccam: 'CCAM',
  ngap: 'NGAP',
};

/**
 * Format a single billing act for copy
 */
export function formatActeForCopy(acte: CotationActe): string {
  const lines: string[] = [];
  
  lines.push(`${acte.code} (${TYPE_LABELS[acte.type]})`);
  lines.push(`Libellé: ${acte.label}`);
  lines.push(`Tarif de base: ${acte.tarif_base.toFixed(2)} €`);
  
  if (acte.coefficient && acte.coefficient !== 1) {
    lines.push(`Coefficient: ${acte.coefficient}`);
  }
  
  if (acte.modificateurs && acte.modificateurs.length > 0) {
    lines.push(`Modificateurs: ${acte.modificateurs.join(', ')}`);
  }
  
  lines.push(`Tarif final: ${acte.tarif_final.toFixed(2)} €`);
  
  return lines.join('\n');
}

/**
 * Format a complete billing entry for copy/export
 */
export function formatCotationForCopy(entry: CotationEntry): string {
  const lines: string[] = [];
  
  lines.push('=== COTATION ===');
  lines.push(`Date: ${format(new Date(entry.date), 'dd MMMM yyyy', { locale: fr })}`);
  
  if (entry.patient_name) {
    lines.push(`Patient: ${entry.patient_name}`);
  }
  
  if (entry.practitioner_name) {
    lines.push(`Praticien: ${entry.practitioner_name}`);
  }
  
  lines.push('');
  lines.push('--- ACTES ---');
  
  entry.actes.forEach((acte, index) => {
    lines.push(`${index + 1}. ${acte.code} - ${acte.label}`);
    lines.push(`   Type: ${TYPE_LABELS[acte.type]} | Tarif: ${acte.tarif_final.toFixed(2)} €`);
    if (acte.modificateurs && acte.modificateurs.length > 0) {
      lines.push(`   Modificateurs: ${acte.modificateurs.join(', ')}`);
    }
  });
  
  lines.push('');
  lines.push(`TOTAL: ${entry.total.toFixed(2)} €`);
  
  if (entry.notes) {
    lines.push('');
    lines.push(`Notes: ${entry.notes}`);
  }
  
  lines.push('');
  lines.push(`Exporté depuis OmniSoin le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`);
  
  return lines.join('\n');
}

/**
 * Format billing history for export
 */
export function formatCotationHistoryForExport(entries: CotationEntry[]): string {
  const lines: string[] = [];
  
  lines.push('=== HISTORIQUE DES COTATIONS ===');
  lines.push(`Période: ${entries.length} entrée(s)`);
  lines.push('');
  
  const totalGeneral = entries.reduce((sum, e) => sum + e.total, 0);
  lines.push(`Total général: ${totalGeneral.toFixed(2)} €`);
  lines.push('');
  lines.push('---');
  
  entries.forEach((entry) => {
    lines.push('');
    lines.push(formatCotationForCopy(entry));
    lines.push('---');
  });
  
  return lines.join('\n');
}

/**
 * Calculate tariff with modifiers
 */
export function calculateTarifWithModificateurs(
  tarifBase: number,
  modificateurs: Modificateur[]
): number {
  let tarif = tarifBase;
  
  modificateurs.forEach((mod) => {
    if (mod.type === 'majoration') {
      if (mod.is_percentage) {
        tarif += tarifBase * (mod.value / 100);
      } else {
        tarif += mod.value;
      }
    } else if (mod.type === 'reduction') {
      if (mod.is_percentage) {
        tarif -= tarifBase * (mod.value / 100);
      } else {
        tarif -= mod.value;
      }
    } else if (mod.type === 'supplement') {
      tarif += mod.value;
    }
  });
  
  return Math.max(0, tarif);
}
