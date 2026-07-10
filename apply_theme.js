const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/dashboard/DashboardClient.tsx', 'utf8');

// Add inline style to root
content = content.replace(
  /<div className="relative max-w-md mx-auto min-h-\[100dvh\] pb-32 flex flex-col">/,
  `<div className="relative max-w-md mx-auto min-h-[100dvh] pb-32 flex flex-col"
      style={{ "--theme-primary": isActivity ? "#14b8a6" : "#6366f1", "--theme-primary-rgb": isActivity ? "20,184,166" : "99,102,241" } as React.CSSProperties}>`
);

// Add Ambient Glow Background after root div starts
content = content.replace(
  `style={{ "--theme-primary": isActivity ? "#14b8a6" : "#6366f1", "--theme-primary-rgb": isActivity ? "20,184,166" : "99,102,241" } as React.CSSProperties}>`,
  `style={{ "--theme-primary": isActivity ? "#14b8a6" : "#6366f1", "--theme-primary-rgb": isActivity ? "20,184,166" : "99,102,241" } as React.CSSProperties}>

      {/* 活動專屬：動態光暈背景 */}
      {isActivity && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
      )}`
);

// Replace hardcoded colors
content = content.replace(/#6366f1/gi, 'var(--theme-primary)');
// Wait, replacing ALL #6366f1 replaces the one we just injected in the style!
// So we must fix the injected style after.
content = content.replace(/var\(--theme-primary\)", "--theme-primary-rgb": isActivity \? "20,184,166" : "99,102,241"/g, '#6366f1", "--theme-primary-rgb": isActivity ? "20,184,166" : "99,102,241"');

// Replace RGB
content = content.replace(/99,102,241/g, 'var(--theme-primary-rgb)');
// Fix the injected style again
content = content.replace(/var\(--theme-primary-rgb\)" \} as React.CSSProperties/g, '99,102,241" } as React.CSSProperties');

fs.writeFileSync('src/app/(app)/dashboard/DashboardClient.tsx', content);
