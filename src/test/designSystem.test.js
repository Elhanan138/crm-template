import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import config from '../../eslint.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// The colour ban, tested as a rule rather than trusted as a comment.
//
// It was configured for two years and enforced for none of them: the severity
// was "warn", and `npm run lint` runs `eslint . --quiet`, which prints errors
// only. A palette colour passed lint, passed the build, and showed up as a
// chip that goes invisible in one theme.
//
// So the assertion here is not "the rule is configured" — it is "this source
// is rejected". Lowering the severity or narrowing the files it covers fails
// these tests, whichever way someone does it.
// ─────────────────────────────────────────────────────────────────────────────

const linter = new Linter();

const errorsIn = (code, filename) =>
  linter
    .verify(code, config, { filename })
    .filter((m) => m.severity === 2);

const rejects = (code, filename) => {
  const found = errorsIn(code, filename);
  return { ok: found.length > 0, messages: found.map((m) => m.message) };
};

describe('a raw Tailwind palette colour is rejected', () => {
  it('in a component, in a plain class string', () => {
    expect(rejects('export const A = () => <b className="text-red-600" />;', 'src/components/x.jsx').ok).toBe(true);
  });

  it('in a template literal, which is how a conditional class hides', () => {
    const code = 'export const A = ({ on }) => <b className={`p-1 ${on ? "bg-blue-100" : ""}`} />;';
    expect(rejects(code, 'src/components/x.jsx').ok).toBe(true);
  });

  // The one that got through for real: a status→classes map in src/lib, which
  // the rule's file list did not reach.
  it('in src/lib, outside any JSX', () => {
    const code = 'export const MAP = { sent: "bg-blue-100 text-blue-700" };';
    expect(rejects(code, 'src/lib/statusColours.js').ok).toBe(true);
  });

  it('in a page and in a vendored ui component alike', () => {
    for (const file of ['src/pages/X.jsx', 'src/components/ui/x.jsx']) {
      expect(rejects('export const A = () => <b className="border-gray-200" />;', file).ok, file).toBe(true);
    }
  });
});

describe('an ad-hoc alpha over the brand is rejected — accent is that token', () => {
  it('names the token to use instead, so the message is actionable', () => {
    const { ok, messages } = rejects('export const A = () => <b className="bg-primary/10" />;', 'src/components/x.jsx');
    expect(ok).toBe(true);
    expect(messages.join(' ')).toContain('bg-accent');
  });

  // Three forms are allowed and every other one is not — that is the whole
  // point. Before this, seven files each picked their own alpha for an edge.
  it('allows exactly the three documented forms', () => {
    for (const cls of ['hover:bg-primary/90', 'border-primary/30', 'focus-visible:ring-primary/30']) {
      expect(rejects(`export const A = () => <b className="${cls}" />;`, 'src/components/x.jsx').ok, cls).toBe(false);
    }
  });

  it('rejects every other alpha on the brand, including a second edge value', () => {
    const banned = [
      'bg-primary/5', 'bg-primary/10', 'bg-primary/30', 'bg-primary/80',
      'text-primary/15', 'text-primary/70',
      'border-primary/20', 'border-primary/40', 'border-primary/50',
      'ring-primary/10', 'ring-primary/40',
      'from-primary/5', 'to-primary/20', 'via-primary/40',
    ];
    for (const cls of banned) {
      expect(rejects(`export const A = () => <b className="${cls}" />;`, 'src/components/x.jsx').ok, cls).toBe(true);
    }
  });

  // `brand` is the same slate under a second token name, so an alpha there is
  // the same mistake wearing a different hat.
  it('rejects the same thing written as brand', () => {
    for (const cls of ['border-brand/20', 'border-brand/30', 'bg-brand/50']) {
      expect(rejects(`export const A = () => <b className="${cls}" />;`, 'src/components/x.jsx').ok, cls).toBe(true);
    }
  });

  it('leaves the brand without an alpha alone', () => {
    for (const cls of ['bg-primary text-primary-foreground', 'text-primary', 'border-primary', 'bg-brand']) {
      expect(rejects(`export const A = () => <b className="${cls}" />;`, 'src/components/x.jsx').ok, cls).toBe(false);
    }
  });
});

describe('a semantic token is accepted', () => {
  it('passes the tokens the design system actually prescribes', () => {
    const classes = [
      'bg-accent text-accent-foreground',
      'bg-success-muted text-success',
      'bg-warning-muted text-warning',
      'bg-info-muted text-info',
      'bg-destructive/10 text-destructive',
      'bg-muted text-muted-foreground',
      'bg-neutral-muted',
      'text-chart-1 bg-chart-5',
    ];
    for (const cls of classes) {
      expect(rejects(`export const A = () => <b className="${cls}" />;`, 'src/components/x.jsx').ok, cls).toBe(false);
    }
  });
});
