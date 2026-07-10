const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/layout.tsx');
let text = content.toString('utf16le');
if (text.indexOf('import') === -1) text = content.toString('utf8');

text = text.replace('const isActivity = pathname === "/transactions";', 'const isActivity = pathname?.includes("/transactions");');
text = text.replace(/style=\{\{ background: ", --theme-primary.*?} as React\.CSSProperties\}\}/, 'style={{ background: "var(--bg-base)", "--theme-primary": themeColor, "--theme-primary-rgb": themeColorRgb } as React.CSSProperties}');

fs.writeFileSync('src/app/(app)/layout.tsx', text, 'utf8');
