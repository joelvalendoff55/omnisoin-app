#!/bin/bash
set -e

echo "=== OmniSoin: Migration Lovable (Vite) -> Next.js ==="
echo ""

# 1. Install Next.js and remove Vite
echo "[1/9] Installing Next.js and removing Vite..."
npm install next@latest
npm uninstall vite @vitejs/plugin-react-swc lovable-tagger react-router-dom
echo "Done."

# 2. Update package.json scripts
echo "[2/9] Updating package.json scripts..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = { dev: 'next dev', build: 'next build', start: 'next start', lint: 'next lint' };
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Done."

# 3. Remove Vite config files and old tsconfig references
echo "[3/9] Removing Vite config files..."
rm -f vite.config.ts
rm -f index.html
rm -f src/main.tsx
rm -f src/vite-env.d.ts
rm -f tsconfig.app.json
rm -f tsconfig.node.json
echo "Done."

# 4. Migrate environment variables (VITE_ -> NEXT_PUBLIC_)
echo "[4/9] Migrating environment variables..."
if [ -f .env ]; then
  sed -i 's/VITE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL/g' .env
  sed -i 's/VITE_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY/g' .env
  sed -i 's/VITE_SUPABASE_PROJECT_ID/NEXT_PUBLIC_SUPABASE_PROJECT_ID/g' .env
  echo "  Updated .env file"
fi
# Replace import.meta.env.VITE_ with process.env.NEXT_PUBLIC_ in all source files
find src -name '*.ts' -o -name '*.tsx' | while read f; do
  sed -i 's/import\.meta\.env\.VITE_SUPABASE_URL/process.env.NEXT_PUBLIC_SUPABASE_URL/g' "$f"
  sed -i 's/import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY/g' "$f"
  sed -i 's/import\.meta\.env\.VITE_SUPABASE_PROJECT_ID/process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID/g' "$f"
  sed -i 's/import\.meta\.env\.VITE_/process.env.NEXT_PUBLIC_/g' "$f"
done
echo "Done."

# 5. Add 'use client' to all components, hooks, and pages that use React hooks
echo "[5/9] Adding 'use client' directive to client components..."
for f in $(find src/components src/hooks src/pages -name '*.tsx' -o -name '*.ts' 2>/dev/null); do
  if ! head -1 "$f" | grep -q '"use client"'; then
    if grep -qE 'useState|useEffect|useRef|useCallback|useMemo|useContext|useReducer|onClick|onChange|onSubmit|useRouter|useSearchParams|usePathname' "$f"; then
      sed -i '1s/^/"use client";\n\n/' "$f"
      echo "  Added 'use client' to $f"
    fi
  fi
done
echo "Done."

# 6. Replace react-router-dom imports with next equivalents
echo "[6/9] Replacing react-router-dom imports..."
find src -name '*.tsx' -o -name '*.ts' | while read f; do
  sed -i 's/import.*useNavigate.*from.*react-router-dom.*/import { useRouter } from "next\/navigation";/g' "$f"
  sed -i 's/const navigate = useNavigate()/const router = useRouter()/g' "$f"
  sed -i 's/navigate(\//router.push(\//g' "$f"
  sed -i 's/navigate("/router.push("/g' "$f"
  sed -i 's/navigate(-1)/router.back()/g' "$f"
  sed -i 's/import.*{.*Link.*}.*from.*react-router-dom.*/import Link from "next\/link";/g' "$f"
  sed -i 's/<Link to=/<Link href=/g' "$f"
  sed -i 's/import.*useParams.*from.*react-router-dom.*/import { useParams } from "next\/navigation";/g' "$f"
  sed -i 's/import.*useSearchParams.*from.*react-router-dom.*/import { useSearchParams } from "next\/navigation";/g' "$f"
  sed -i 's/import.*useLocation.*from.*react-router-dom.*/import { usePathname } from "next\/navigation";/g' "$f"
  sed -i 's/const location = useLocation()/const pathname = usePathname()/g' "$f"
  sed -i 's/location\.pathname/pathname/g' "$f"
done
echo "Done."

# 7. Generate Next.js App Router pages
echo "[7/9] Generating Next.js route files..."
bash generate-routes.sh
echo "Done."

# 8. Update .gitignore for Next.js
echo "[8/9] Updating .gitignore..."
echo -e "\n# Next.js\n.next/\nout/" >> .gitignore
echo "Done."

# 9. Install dependencies
echo "[9/9] Installing all dependencies..."
npm install
echo "Done."

echo ""
echo "=== Migration complete! ==="
echo "Next steps:"
echo "  1. Run: npm run dev"
echo "  2. Fix any remaining TypeScript errors"
echo "  3. Test all routes"
