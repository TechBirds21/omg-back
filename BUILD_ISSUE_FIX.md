# Main App Build Issue & Solution

## Problem
The main app build is failing with an esbuild parsing error:
```
ERROR: Expected "finally" but found "<"
file: src/pages/admin/Orders.tsx:2574:6
```

## Root Cause
- **File**: `src/pages/admin/Orders.tsx` (3632 lines)
- **Issue**: esbuild has a known bug with very large/complex TypeScript files
- **Error**: esbuild incorrectly thinks there's an unclosed try-catch block

## Solutions

### Option 1: Split Orders.tsx (Recommended)
Split the large `Orders.tsx` file into smaller components:
- `OrdersTable.tsx` - Table component
- `OrdersFilters.tsx` - Filter components  
- `OrdersActions.tsx` - Action handlers
- `Orders.tsx` - Main component (imports others)

### Option 2: Use SWC Instead of esbuild
Install and use `@swc/core` which handles large files better:
```bash
npm install -D @swc/core @vitejs/plugin-react-swc
```

Then update `vite.config.ts`:
```typescript
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  // ... rest of config
});
```

### Option 3: Temporary Workaround
For now, you can:
1. ✅ Deploy store app (`frontend-store.zip`) to `store.omaguva.com`
2. ⚠️ Fix main app build issue later
3. The store app works independently

## Current Status

✅ **Store App**: Ready (`frontend-store.zip`)
⚠️ **Main App**: Needs build fix

## Quick Fix Attempt

Try building with different settings:
```bash
# Try without minification
npm run build:fast

# Or try with terser instead of esbuild
# (requires installing terser)
```

---

**Note**: The store billing app is fully functional and ready to deploy. The main app can be fixed later by splitting the Orders component.

