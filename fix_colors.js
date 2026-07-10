const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/dashboard/DashboardClient.tsx', 'utf8');

// Define the JS variables near isActivity
content = content.replace(
  /const isActivity = mode === "activity";/,
  `const isActivity = mode === "activity";
  const themeColor = isActivity ? "#14b8a6" : "#6366f1";
  const themeColorRgb = isActivity ? "20, 184, 166" : "99, 102, 241";`
);

// Replace string literals
content = content.replace(/"var\(--theme-primary\)"/g, 'themeColor');

// Replace string literals with rgba
content = content.replace(/"rgba\(var\(--theme-primary-rgb\),([\d.]+)\)"/g, '`rgba(${themeColorRgb},$1)`');

// Replace shadow in className
content = content.replace(/shadow-\[0_0_50px_0_rgba\(var\(--theme-primary-rgb\),0\.25\)\]/, '');
// Add style to that div: it's on line 1095
content = content.replace(
  /<div\s+className="fixed inset-x-4 top-1\/2 -translate-y-1\/2 md:max-w-md md:mx-auto z-50 overflow-hidden bg-\[var\(--bg-surface\)\] border border-\[var\(--border\)\] rounded-3xl flex flex-col"/,
  `<div 
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:max-w-md md:mx-auto z-50 overflow-hidden bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl flex flex-col"
        style={{ boxShadow: \`0 0 50px 0 rgba(\${themeColorRgb}, 0.25)\` }}`
);

// Same for the submit button shadow
content = content.replace(/shadow-\[0_4px_12px_rgba\(var\(--theme-primary-rgb\),0\.3\)\]/, '');

// Fix the Tailwind classes text-theme and bg-theme by using inline style
content = content.replace(/className="text-theme"/g, 'style={{ color: themeColor }}');
content = content.replace(/className="([^"]*)text-theme([^"]*)"/g, 'className="$1 $2" style={{ color: themeColor }}');
content = content.replace(/className="([^"]*)bg-theme([^"]*)"/g, 'className="$1 $2" style={{ backgroundColor: themeColor }}');

// Replace className="text-theme" alone
// already done mostly

fs.writeFileSync('src/app/(app)/dashboard/DashboardClient.tsx', content);
