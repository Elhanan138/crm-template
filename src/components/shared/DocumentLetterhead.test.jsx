import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, cleanup, render } from '@testing-library/react';
import { LogoProvider } from '@/lib/LogoContext';
import DocumentLetterhead, { DocumentFooter } from './DocumentLetterhead';
import { BRAND_PRESETS, presetById, presetForColor } from '@/lib/brandPresets';
import { contrastRatio, bestForeground, isHex } from '@/lib/LogoContext';

const withBranding = (ui) => render(<LogoProvider>{ui}</LogoProvider>);

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('brand presets', () => {
  it('offers six, each with a real colour and a distinct id', () => {
    expect(BRAND_PRESETS).toHaveLength(6);
    const ids = BRAND_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of BRAND_PRESETS) {
      expect(isHex(preset.primary), `${preset.id} primary`).toBe(true);
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.hint.trim().length).toBeGreaterThan(0);
    }
  });

  it('carries three harmonising swatches, led by the brand colour itself', () => {
    for (const preset of BRAND_PRESETS) {
      expect(preset.palette, `${preset.id} palette`).toHaveLength(3);
      expect(preset.palette[0]).toBe(preset.primary);
      for (const colour of preset.palette) expect(isHex(colour)).toBe(true);
    }
  });

  it('stays readable — every preset passes AA against its own foreground', () => {
    for (const preset of BRAND_PRESETS) {
      const ratio = contrastRatio(preset.primary, bestForeground(preset.primary));
      expect(ratio, `${preset.id} contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('can be found by id and recognised from a stored colour', () => {
    expect(presetById('teal').label).toBe('טורקיז');
    expect(presetById('nope')).toBeNull();
    expect(presetForColor('#0F766E').id).toBe('teal');
    expect(presetForColor('#123456')).toBeNull();
    expect(presetForColor(null)).toBeNull();
  });
});

describe('document letterhead', () => {
  it('prints nothing for branding that was never filled in', () => {
    withBranding(<DocumentLetterhead title="הצעת מחיר" />);
    expect(screen.getByText('הצעת מחיר')).toBeInTheDocument();
    // No stray separators or empty lines where a company detail would go.
    expect(screen.queryByText(/ח\.פ/)).toBeNull();
    expect(screen.queryByText(/תנאי תשלום/)).toBeNull();
  });

  it('carries the company details the branding settings hold', () => {
    localStorage.setItem('oss_brand_company', JSON.stringify({
      tagline: 'פתרונות תוכנה',
      legalId: '515151515',
      address: 'רחוב הברזל 1',
      paymentTerms: 'שוטף + 30',
      bank: 'IL00 0000',
    }));
    withBranding(<DocumentLetterhead title="הצעת מחיר" />);
    expect(screen.getByText('פתרונות תוכנה')).toBeInTheDocument();
    expect(screen.getByText(/ח\.פ: 515151515/)).toBeInTheDocument();
    expect(screen.getByText(/רחוב הברזל 1/)).toBeInTheDocument();
    expect(screen.getByText(/שוטף \+ 30/)).toBeInTheDocument();
  });

  it('shows the document-specific meta beside the sender', () => {
    withBranding(<DocumentLetterhead title="דוח פרויקט" meta={<p>2026-001</p>} />);
    expect(screen.getByText('דוח פרויקט')).toBeInTheDocument();
    expect(screen.getByText('2026-001')).toBeInTheDocument();
  });

  it('renders no footer at all when there is nothing to sign off with', () => {
    const { container } = withBranding(<DocumentFooter />);
    expect(container.textContent.trim()).toBe('');
  });
});
