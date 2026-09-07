export type WcagAuditResult = {
  passed: boolean;
  score: number;
  violations: string[];
};

export function calculateLuminance(r: number, g: number, b: number): number {
  const [aR, aG, aB] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

export function calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = calculateLuminance(...rgb1);
  const l2 = calculateLuminance(...rgb2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Math.round(((brighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Audits a UI element for WCAG 2.1 AA accessibility contract compliance.
 */
export function auditWcagCompliance(params: {
  contrastRatio: number;
  hasAriaLabel: boolean;
  hasKeyboardFocusIndicator: boolean;
}): WcagAuditResult {
  const violations: string[] = [];

  if (params.contrastRatio < 4.5) {
    violations.push(`Relación de contraste insuficiente (${params.contrastRatio}:1, mín 4.5:1 requerido para WCAG 2.1 AA).`);
  }

  if (!params.hasAriaLabel) {
    violations.push('Falta atributo aria-label o texto accesible para lectores de pantalla.');
  }

  if (!params.hasKeyboardFocusIndicator) {
    violations.push('Falta indicador de foco accesible (:focus-visible) para navegación por teclado.');
  }

  const passed = violations.length === 0;
  const score = passed ? 100 : Math.max(0, 100 - violations.length * 30);

  return {
    passed,
    score,
    violations,
  };
}
