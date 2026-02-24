#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}EdgeBook — Supabase Setup${NC}"
echo "================================"

# 1. Check Supabase CLI
if ! command -v supabase &>/dev/null; then
  echo -e "${YELLOW}Installing Supabase CLI...${NC}"
  brew install supabase/tap/supabase
fi
echo -e "${GREEN}✓ Supabase CLI ready${NC}"

# 2. Login
echo ""
echo -e "${YELLOW}Opening browser to log into Supabase...${NC}"
supabase login

# 3. Create project
echo ""
echo -e "${YELLOW}Creating Supabase project 'edgebook'...${NC}"
echo "(Pick the org when prompted)"
OUTPUT=$(supabase projects create edgebook --region eu-west-2 2>&1 || true)
echo "$OUTPUT"

# Extract project ref from output or ask user
echo ""
echo -e "${YELLOW}Enter your project ref (shown above, looks like: abcdefghijklmnop):${NC}"
read -r PROJECT_REF

# 4. Link project
echo ""
echo -e "${YELLOW}Linking project...${NC}"
supabase link --project-ref "$PROJECT_REF"

# 5. Push migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
supabase db push

# 6. Create storage bucket
echo ""
echo -e "${YELLOW}Creating bet-slips storage bucket...${NC}"
supabase storage create bet-slips --public=false 2>/dev/null || echo "Bucket may already exist, continuing..."

# 7. Get credentials and write .env.local
echo ""
echo -e "${YELLOW}Fetching API keys...${NC}"
KEYS=$(supabase projects api-keys --project-ref "$PROJECT_REF" 2>/dev/null || echo "")

if [ -n "$KEYS" ]; then
  ANON_KEY=$(echo "$KEYS" | grep -i "anon" | awk '{print $NF}' | head -1)
  SERVICE_KEY=$(echo "$KEYS" | grep -i "service_role" | awk '{print $NF}' | head -1)
  PROJECT_URL="https://${PROJECT_REF}.supabase.co"

  cat > .env.local <<EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${PROJECT_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Vision API (for OCR — optional)
GOOGLE_VISION_API_KEY=

# Inngest (background jobs — optional)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
EOF

  echo -e "${GREEN}✓ .env.local written${NC}"
else
  echo -e "${YELLOW}Could not auto-fetch keys. Get them from:${NC}"
  echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  echo ""
  echo "Then fill in .env.local manually."
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Start the app:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
