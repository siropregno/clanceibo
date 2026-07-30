import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const mainCss = readFileSync(path.join(srcDir, 'main.css'), 'utf8');

// Strip comments so commented-out declarations never satisfy an assertion.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Returns the declaration block of the first top-level rule whose selector list
// contains `selector` as a whole comma-separated entry.
const ruleBody = (css, selector) => {
  const clean = stripComments(css);
  const rules = clean.matchAll(/([^{}]+)\{([^{}]*)\}/g);
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

const listCssFiles = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listCssFiles(full);
    return full.endsWith('.css') ? [full] : [];
  });

describe('main.css font baseline', () => {
  // The bug this guards: main.css styled only a hand-picked list of tags, so
  // label/legend/span/h3/td/th text rendered in the UA default (Times New
  // Roman) wherever a component had not patched font-family itself.
  it('sets a font-family on body so all text inherits one', () => {
    const body = ruleBody(mainCss, 'body');
    expect(body).not.toBeNull();
    expect(declaration(body, 'font-family')).toBe('var(--font-body)');
  });

  it('sets a base font-size on body', () => {
    expect(declaration(ruleBody(mainCss, 'body'), 'font-size')).toBe('var(--texto-1)');
  });

  it.each(['h1', 'h2', 'h3', 'h4', 'label', 'legend', 'th', 'td'])(
    'gives %s an explicit font-family',
    (tag) => {
      const family = declaration(ruleBody(mainCss, tag), 'font-family');
      expect(family).toMatch(/^var\(--font-(title|title2|body|button)\)$/);
    },
  );

  // Form controls do not inherit font from their ancestors per spec, so each
  // one needs an explicit family or it falls back to the UA default.
  it.each(['input', 'select', 'button', 'textarea', 'option'])(
    'opts %s into the site font',
    (tag) => {
      const family = declaration(ruleBody(mainCss, tag), 'font-family');
      expect(family).toMatch(/^(inherit|var\(--font-(body|button)\))$/);
    },
  );

  it('declares every font variable it references', () => {
    const root = stripComments(mainCss).match(/:root\s*\{([^}]*)\}/)[1];
    const declared = new Set([...root.matchAll(/(--font-[\w-]+)\s*:/g)].map((m) => m[1]));
    const used = new Set([...stripComments(mainCss).matchAll(/var\((--font-[\w-]+)\)/g)].map((m) => m[1]));
    for (const name of used) expect(declared).toContain(name);
  });
});

describe('component stylesheets', () => {
  const cssFiles = listCssFiles(srcDir).filter((f) => !f.endsWith('main.css'));

  it('finds the component stylesheets', () => {
    expect(cssFiles.length).toBeGreaterThan(5);
  });

  // Catches a hardcoded stack like "Arial, sans-serif" bypassing the tokens.
  it.each(cssFiles.map((f) => [path.relative(srcDir, f), f]))(
    '%s uses font tokens, not hardcoded families',
    (_name, file) => {
      const families = [...stripComments(readFileSync(file, 'utf8'))
        .matchAll(/font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
      for (const family of families) {
        expect(family).toMatch(/^(inherit|var\(--font-[\w-]+\))$/);
      }
    },
  );
});
