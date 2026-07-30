import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

// Campaign and mission descriptions are written in a plain <textarea>, so the
// only way an admin can express a paragraph break is a literal newline. HTML
// collapses those into spaces unless the element says otherwise, which turned
// a multi-paragraph briefing into a single wall of text on the detail page.
//
// That is a rendering rule with no JS to assert against and no visible failure
// in any component test - the text is all there, it just reads wrong. So it is
// pinned here, at the stylesheet, where the regression would actually happen.

const cssDir = path.dirname(fileURLToPath(import.meta.url));
const detalleCss = readFileSync(path.join(cssDir, 'campanadetalle.css'), 'utf8');
const listCss = readFileSync(path.join(cssDir, 'campanas.css'), 'utf8');

// Comments are stripped first so a commented-out declaration can never satisfy
// an assertion - the same guard main.css.test.js uses.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

const ruleBody = (css, selector) => {
  const rules = stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const [, selectors, body] of rules) {
    const list = selectors.split(',').map((s) => s.trim());
    if (list.includes(selector)) return body;
  }
  return null;
};

const declaration = (body, property) => {
  if (!body) return null;
  const match = body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : null;
};

describe('campaign description paragraph breaks', () => {
  it.each([
    ['.campanadetalle-descripcion', 'campaign'],
    ['.campanadetalle-mision-desc', 'mission'],
  ])('preserves newlines in the %s description', (selector) => {
    const body = ruleBody(detalleCss, selector);
    expect(body).not.toBeNull();
    expect(declaration(body, 'white-space')).toBe('pre-line');
  });

  // pre-line, specifically. `pre` and `pre-wrap` also keep the newlines but
  // additionally preserve runs of spaces, so text pasted with leading
  // indentation renders ragged. `normal`/`nowrap` lose the breaks entirely,
  // which is the bug this file exists for.
  it.each([
    ['.campanadetalle-descripcion'],
    ['.campanadetalle-mision-desc'],
  ])('does not use a whitespace mode that keeps indentation or drops breaks (%s)', (selector) => {
    const value = declaration(ruleBody(detalleCss, selector), 'white-space');
    expect(['pre', 'pre-wrap', 'normal', 'nowrap']).not.toContain(value);
  });

  // The card on the list page is a teaser clamped to two lines. Honouring
  // newlines there would spend the clamp on a half-empty first line, so it is
  // deliberately left collapsing. This asserts the omission is intentional and
  // survives someone "fixing" it to match the detail page.
  it('leaves the clamped list-card teaser collapsing newlines', () => {
    const body = ruleBody(listCss, '.campana-descripcion');
    expect(body).not.toBeNull();
    expect(declaration(body, 'white-space')).toBeNull();
    expect(declaration(body, 'line-clamp')).toBe('2');
  });
});
