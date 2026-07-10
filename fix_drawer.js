const fs = require('fs');
let content = fs.readFileSync('src/components/features/QuickAddDrawer.tsx', 'utf8');

content = content.replace(
  'const router = useRouter(); const pathname = usePathname();',
  'const router = useRouter(); const pathname = usePathname();\n  const isActivity = pathname?.includes("/transactions");\n  const themeColor = isActivity ? "#14b8a6" : "#6366f1";\n  const themeColorRgb = isActivity ? "20,184,166" : "99,102,241";'
);

// Replace classNames with template literals
content = content.replace(/className="([^"]*(bg-indigo-500|text-indigo-500|text-indigo-400|shadow-indigo-500)[^"]*)"/g, (match, p1) => {
  let replaced = p1;
  replaced = replaced.replace(/bg-indigo-500/g, '${isActivity ? "bg-teal-500" : "bg-indigo-500"}');
  replaced = replaced.replace(/text-indigo-500/g, '${isActivity ? "text-teal-500" : "text-indigo-500"}');
  replaced = replaced.replace(/text-indigo-400/g, '${isActivity ? "text-teal-400" : "text-indigo-400"}');
  replaced = replaced.replace(/shadow-indigo-500/g, '${isActivity ? "shadow-teal-500" : "shadow-indigo-500"}');
  return `className={\`${replaced}\`}`;
});

// Replace hardcoded RGB
content = content.replace(/99,102,241/g, '${themeColorRgb}');

// Replace hardcoded Hex
content = content.replace(/#6366f1/g, '${themeColor}');

fs.writeFileSync('src/components/features/QuickAddDrawer.tsx', content);
