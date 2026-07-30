import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

// .admin-action is the compact row-level button used all over the admin panel.
// It ships in four flavours: three with a modifier (-edit, -danger, -restore)
// and one with no modifier at all - "Gestionar"/"Cerrar" and "Ocultar"/
// "Mostrar" are plain .admin-action.
//
// The base rule used to set `background: transparent` and a transparent
// border and leave `color` to the modifiers. That made the unmodified variant
// inherit the card's own text colour: dark text, transparent border, dark
// card. The buttons rendered, occupied space and responded to clicks, but
// were invisible - which is worse than missing, because nothing in the DOM
// looks wrong. Every component test passed the whole time, since the buttons
// were present and clickable by accessible name.
//
// There is no JS to assert against and no component test that can see it, so
// the rule is pinned here, at the stylesheet, where the regression happens.

const cssDir = path.dirname(fileURLToPath(import.meta.url));
const adminCss = readFileSync(path.join(cssDir, 'admin.css'), 'utf8');

// Comments are stripped first so a commented-out declaration can never satisfy
// an assertion - the same guard the other css tests use.
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

// A colour that is actually a colour, not `transparent`/`inherit`/`currentColor`
// - all three would reintroduce the invisible button.
const isVisibleColour = (value) =>
  value !== null && !['transparent', 'inherit', 'currentcolor', 'unset', 'initial']
    .includes(value.toLowerCase());

describe('.admin-action base button', () => {
  const base = ruleBody(adminCss, '.admin-action');

  it('exists as its own rule', () => {
    expect(base).not.toBeNull();
  });

  // The bug, pinned directly: an unmodified .admin-action must set its own
  // colour rather than inheriting the surrounding card's.
  it('sets an explicit text colour so it does not inherit the card background', () => {
    expect(isVisibleColour(declaration(base, 'color'))).toBe(true);
  });

  // A transparent background is fine and intended - but only if the border is
  // visible, or the button has no edge and no fill and reads as bare text.
  it('has a visible border so the transparent background still reads as a button', () => {
    const border = declaration(base, 'border') || declaration(base, 'border-color');
    expect(border).not.toBeNull();
    expect(border.toLowerCase()).not.toContain('transparent');
  });

  it('keeps the compact padding that the panel rows are sized for', () => {
    expect(declaration(base, 'padding')).toBe('7px 14px');
  });
});

// The coloured variants must still win over the base rule. They come later in
// the file at equal specificity, so source order decides - moving the base
// rule below them would silently grey out every Editar and Eliminar button.
describe('.admin-action colour modifiers', () => {
  it.each([
    ['.admin-action-edit'],
    ['.admin-action-danger'],
    ['.admin-action-restore'],
    ['.admin-action-link'],
  ])('%s defines its own colour', (selector) => {
    const body = ruleBody(adminCss, selector);
    expect(body).not.toBeNull();
    expect(isVisibleColour(declaration(body, 'color'))).toBe(true);
  });

  it.each([
    ['.admin-action-edit'],
    ['.admin-action-danger'],
    ['.admin-action-restore'],
    ['.admin-action-link'],
  ])('%s is declared after the base rule so it overrides it', (selector) => {
    const stripped = stripComments(adminCss);
    // Match the selector only where it starts a rule, so the :not() chain in
    // the base hover rule does not count as the modifier's own declaration.
    const basePos = stripped.search(/(^|[},])\s*\.admin-action\s*[,{]/m);
    const modifierPos = stripped.search(
      new RegExp(`(^|[},])\\s*\\${selector}\\s*[,{]`, 'm'),
    );
    expect(basePos).toBeGreaterThanOrEqual(0);
    expect(modifierPos).toBeGreaterThan(basePos);
  });
});
