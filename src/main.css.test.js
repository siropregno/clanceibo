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

describe('type scale', () => {
  const rootBlock = stripComments(mainCss).match(/:root\s*\{([^}]*)\}/)[1];

  // The heading roles every page shares. Each one owns its size in exactly one
  // place so a page cannot fork it.
  it.each([
    ['.titulo-pagina', 'var(--titulo-1)'],
    ['.subtitulo-pagina', 'var(--texto-btn)'],
    ['.titulo-seccion', 'var(--seccion-1)'],
  ])('%s sizes itself from a token', (selector, expected) => {
    expect(declaration(ruleBody(mainCss, selector), 'font-size')).toBe(expected);
  });

  it('scales the page title on mobile', () => {
    const mobile = stripComments(mainCss).match(
      /@media screen and \(max-width: 768px\)\s*\{([\s\S]*)\}/,
    )[1];
    // Both the bare tag and the class, since pages use either.
    expect(mobile).toMatch(/\.titulo-pagina/);
    expect(declaration(ruleBody(mobile, '.titulo-pagina'), 'font-size')).toBe(
      'var(--titulo-mobile)',
    );
  });

  it('declares every size token the app references', () => {
    const declared = new Set(
      [...rootBlock.matchAll(/(--(?:titulo|subtitulo|seccion|texto|track)[\w-]*)\s*:/g)].map(
        (m) => m[1],
      ),
    );
    const used = new Set(
      listCssFiles(srcDir).flatMap((f) =>
        [
          ...stripComments(readFileSync(f, 'utf8')).matchAll(
            /var\((--(?:titulo|subtitulo|seccion|texto|track)[\w-]*)\)/g,
          ),
        ].map((m) => m[1]),
      ),
    );
    for (const name of used) expect(declared).toContain(name);
  });
});

describe('component stylesheets', () => {
  const cssFiles = listCssFiles(srcDir).filter((f) => !f.endsWith('main.css'));

  it('finds the component stylesheets', () => {
    expect(cssFiles.length).toBeGreaterThan(5);
  });

  /*
   * The bug this guards: the same visual role was sized independently per page
   * (page titles at 32/28/26px/2rem, subtitles at 13/14/15px, eyebrow labels at
   * 11px vs 12px with 0.06em vs 0.04em tracking). Nothing outside main.css may
   * declare a raw font-size, so a new page cannot fork the scale by hand.
   */
  it.each(cssFiles.map((f) => [path.relative(srcDir, f), f]))(
    '%s sizes text from tokens, not raw units',
    (_name, file) => {
      const sizes = [
        ...stripComments(readFileSync(file, 'utf8')).matchAll(/font-size\s*:\s*([^;}]+)/g),
      ].map((m) => m[1].trim());
      for (const size of sizes) {
        expect(size).toMatch(/^(inherit|var\(--[\w-]+\))$/);
      }
    },
  );

  // em compounds off the parent, so the same declaration renders at a
  // different size depending on where the element is mounted.
  it.each(cssFiles.map((f) => [path.relative(srcDir, f), f]))(
    '%s uses no compounding em sizes',
    (_name, file) => {
      expect(stripComments(readFileSync(file, 'utf8'))).not.toMatch(
        /font-size\s*:\s*[\d.]+em\b/,
      );
    },
  );

  // Numeric weights bypass the --thin..--black tokens.
  it.each(cssFiles.map((f) => [path.relative(srcDir, f), f]))(
    '%s sets font-weight from tokens',
    (_name, file) => {
      const weights = [
        ...stripComments(readFileSync(file, 'utf8')).matchAll(/font-weight\s*:\s*([^;}]+)/g),
      ].map((m) => m[1].trim());
      for (const weight of weights) {
        expect(weight).toMatch(/^(inherit|normal|var\(--[\w-]+\))$/);
      }
    },
  );

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
