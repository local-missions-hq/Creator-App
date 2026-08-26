import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { minimumTouchTarget } from '../components/accessibilityTokens';

const mobileRoot = join(import.meta.dirname, '..');

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);

    if (entry.isDirectory()) {
      return tsxFiles(target);
    }

    return entry.name.endsWith('.tsx') ? [target] : [];
  });
}

function missingCriticalControlAttributes() {
  const failures: string[] = [];

  for (const file of tsxFiles(mobileRoot)) {
    const sourceText = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === 'Pressable') {
        const attributes = new Set(
          node.attributes.properties
            .filter(ts.isJsxAttribute)
            .map((attribute) => attribute.name.getText(source)),
        );
        const missing = ['accessibilityLabel', 'testID'].filter(
          (attribute) => !attributes.has(attribute),
        );

        if (missing.length > 0) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          failures.push(`${relative(mobileRoot, file)}:${line} missing ${missing.join(', ')}`);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return failures;
}

function directReactNativePressableImports() {
  const failures: string[] = [];

  for (const file of tsxFiles(mobileRoot)) {
    if (file.endsWith('AccessiblePressable.tsx')) {
      continue;
    }

    const sourceText = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    for (const statement of source.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier.getText(source) === "'react-native'" &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        const importsPressable = statement.importClause.namedBindings.elements.some(
          (element) => element.name.text === 'Pressable',
        );

        if (importsPressable) {
          const line = source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1;
          failures.push(`${relative(mobileRoot, file)}:${line}`);
        }
      }
    }
  }

  return failures;
}

function directExpoIoniconImports() {
  const failures: string[] = [];

  for (const file of tsxFiles(mobileRoot)) {
    if (file.endsWith('DecorativeIcon.tsx')) {
      continue;
    }

    const sourceText = readFileSync(file, 'utf8');
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    for (const statement of source.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier.getText(source) === "'@expo/vector-icons'"
      ) {
        const line = source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1;
        failures.push(`${relative(mobileRoot, file)}:${line}`);
      }
    }
  }

  return failures;
}

function decorativeIconAccessibilityContract() {
  const file = join(mobileRoot, 'components', 'DecorativeIcon.tsx');
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const contract: Record<string, string> = {};

  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'ExpoIonicons') {
      for (const attribute of node.attributes.properties.filter(ts.isJsxAttribute)) {
        const name = attribute.name.getText(source);
        contract[name] = attribute.initializer?.getText(source) ?? 'true';
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return contract;
}

function welcomeHeadlineLargeTextContract() {
  const file = join(mobileRoot, 'app', 'index.tsx');
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const contract: Record<string, string> = {};

  const visit = (node: ts.Node) => {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === 'Text' &&
      node.getText(source).includes('Turn local experiences into paid missions.')
    ) {
      for (const attribute of node.openingElement.attributes.properties.filter(ts.isJsxAttribute)) {
        const name = attribute.name.getText(source);
        contract[name] = attribute.initializer?.getText(source) ?? 'true';
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return contract;
}

describe('critical mobile controls', () => {
  it('gives every Pressable a stable test ID and accessibility label', () => {
    expect(missingCriticalControlAttributes()).toEqual([]);
  });

  it('routes every Pressable through the shared minimum touch target', () => {
    expect(directReactNativePressableImports()).toEqual([]);
    expect(minimumTouchTarget).toEqual({ minHeight: 44, minWidth: 44 });
  });

  it('keeps decorative icons out of the accessibility reading order', () => {
    expect(directExpoIoniconImports()).toEqual([]);
    expect(decorativeIconAccessibilityContract()).toMatchObject({
      accessibilityElementsHidden: 'true',
      accessible: '{false}',
      importantForAccessibility: '"no-hide-descendants"',
    });
  });

  it('keeps the welcome headline word-safe at accessibility text sizes', () => {
    expect(welcomeHeadlineLargeTextContract()).toMatchObject({
      lineBreakStrategyIOS: '"hangul-word"',
      maxFontSizeMultiplier: '{1.6}',
    });
  });
});
