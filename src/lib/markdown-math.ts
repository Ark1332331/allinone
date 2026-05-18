import katex from 'katex';

const DISPLAY_BRACKET_MATH_PATTERN = /\\\[([\s\S]+?)\\\]/g;
const INLINE_PAREN_MATH_PATTERN = /\\\(([\s\S]+?)\\\)/g;
const DISPLAY_MATH_PATTERN = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH_PATTERN = /(^|[^\\$])\$([^\n$]+?)\$/g;

function renderKatex(source: string, displayMode: boolean) {
  return katex.renderToString(source.trim(), {
    displayMode,
    throwOnError: false,
    strict: false,
  });
}

export function renderInlineKatex(source: string) {
  return renderKatex(source, false);
}

export function looksLikeInlineMathCode(source: string) {
  const value = source.trim();
  if (!value || value.length > 180 || /\n/.test(value)) {
    return false;
  }

  const hasMathSymbol = /[=∑Σπθβλμσℓ∞≤≥≠≈∈∂√^_]|\\(sum|frac|theta|beta|lambda|mu|sigma|ell|log|sin|cos|arg|max|min|prod|cdot)\b/.test(
    value
  );
  if (!hasMathSymbol) {
    return false;
  }

  const hasProgrammingShape = /\b(const|let|var|function|return|import|from|npm|yarn|python|git)\b|=>|===|!==/.test(
    value
  );
  if (hasProgrammingShape) {
    return false;
  }

  return /[A-Za-z0-9θβλμσπℓ][\w{}()[\]\\|;:,+\-*/^_\s=∑Σπθβλμσℓ∞≤≥≠≈∈∂√]+/.test(value);
}

export function renderMarkdownMath(content: string) {
  const renderedMath: string[] = [];
  const stash = (html: string) => {
    const token = `@@DU_MATH_${renderedMath.length}@@`;
    renderedMath.push(html);
    return token;
  };

  const withBracketDisplayMath = content.replace(
    DISPLAY_BRACKET_MATH_PATTERN,
    (_match, math) =>
      stash(`<div class="du-math du-math-display">${renderKatex(math, true)}</div>`)
  );

  const withParenInlineMath = withBracketDisplayMath.replace(
    INLINE_PAREN_MATH_PATTERN,
    (_match, math) =>
      stash(`<span class="du-math du-math-inline">${renderKatex(math, false)}</span>`)
  );

  const withDisplayMath = withParenInlineMath.replace(
    DISPLAY_MATH_PATTERN,
    (_match, math) =>
      stash(`<div class="du-math du-math-display">${renderKatex(math, true)}</div>`)
  );

  const withInlineMath = withDisplayMath.replace(
    INLINE_MATH_PATTERN,
    (_match, prefix, math) =>
      `${prefix}${stash(
        `<span class="du-math du-math-inline">${renderKatex(math, false)}</span>`
      )}`
  );

  return renderedMath.reduce(
    (current, html, index) => current.replace(`@@DU_MATH_${index}@@`, html),
    withInlineMath
  );
}
