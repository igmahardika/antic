import type { API, FileInfo, JSCodeshift, Collection } from 'jscodeshift';

const LAZY_SRC = '@/charts/rechartsLazy';
const NAMES = [
  'ResponsiveContainer', 'CartesianGrid', 'XAxis', 'YAxis', 'Legend',
  'LineChart', 'Line', 'ReferenceLine',
  'BarChart', 'Bar', 'Cell',
  'AreaChart', 'Area',
  'PieChart', 'Pie'
];

function ensureReactSuspense(j: JSCodeshift, root: Collection) {
  const reactImp = root.find(j.ImportDeclaration, { source: { value: 'react' } });
  if (reactImp.size()) {
    reactImp.forEach(p => {
      p.value.specifiers = p.value.specifiers || [];
      const hasDefault = p.value.specifiers.some(s => s.type === 'ImportDefaultSpecifier');
      const hasSusp = p.value.specifiers.some(s => s.type === 'ImportSpecifier' && s.imported.type === 'Identifier' && s.imported.name === 'Suspense');
      if (!hasDefault) p.value.specifiers.unshift(j.importDefaultSpecifier(j.identifier('React')));
      if (!hasSusp) p.value.specifiers.push(j.importSpecifier(j.identifier('Suspense')));
    });
  } else {
    root.get().node.program.body.unshift(
      j.importDeclaration([
        j.importDefaultSpecifier(j.identifier('React')),
        j.importSpecifier(j.identifier('Suspense'))
      ], j.literal('react'))
    );
  }
}

function ensureLazyImport(j: JSCodeshift, root: Collection) {
  // Cari simbol yang dipakai di JSX dan yang kita dukung
  const used = new Set<string>();
  root.find(j.JSXIdentifier).forEach(p => {
    const name = p.value.name;
    if (NAMES.includes(name)) used.add(name);
    if (name === 'Tooltip') used.add('Tooltip');
  });
  if (!used.size) return;

  // Tambah import dari '@/charts/rechartsLazy'
  const need = Array.from(used).filter(n => n !== 'Tooltip');
  const specifiers = need.map(n => j.importSpecifier(j.identifier(n)));
  // Tambahkan alias Tooltip -> RechartsTooltip
  if (used.has('Tooltip')) {
    specifiers.push(j.importSpecifier(j.identifier('Tooltip'), j.identifier('RechartsTooltip')));
  }

  const existing = root.find(j.ImportDeclaration, { source: { value: LAZY_SRC } });
  if (existing.size()) {
    existing.forEach(p => {
      p.value.specifiers = p.value.specifiers || [];
      specifiers.forEach(s => {
        p.value.specifiers!.push(s);
      });
    });
  } else {
    root.get().node.program.body.unshift(
      j.importDeclaration(specifiers, j.literal(LAZY_SRC))
    );
  }
}

function aliasTooltipInJSX(j: JSCodeshift, root: Collection) {
  // Ganti <Tooltip ...> → <RechartsTooltip ...>
  root.find(j.JSXIdentifier, { name: 'Tooltip' }).forEach(p => {
    p.value.name = 'RechartsTooltip';
  });
}

function removeUnusedLoadRecharts(j: JSCodeshift, root: Collection) {
  // Hapus deklarasi function/const bernama loadRecharts
  root.find(j.FunctionDeclaration, { id: { name: 'loadRecharts' } }).remove();
  root.find(j.VariableDeclarator, { id: { type: 'Identifier', name: 'loadRecharts' } })
    .forEach(d => {
      const decl = d.parent && d.parent.parent;
      if (decl && decl.value && decl.value.type === 'VariableDeclaration') {
        j(decl).remove();
      }
    });
}

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  ensureReactSuspense(j, root);
  ensureLazyImport(j, root);
  aliasTooltipInJSX(j, root);
  removeUnusedLoadRecharts(j, root);
  return root.toSource({ quote: 'single' });
}
