#!/usr/bin/env bash
#
# Manual API test script for the Greenprint backend.
# Usage: ./scripts/test-api.sh
#
# Requires: curl, a running server (GEMINI_API_KEY=... go run ./cmd/server)
# Output images are written to scripts/output/
# Project fixtures loaded from testdata/*.json

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$SCRIPT_DIR/output"
TESTDATA="$ROOT_DIR/testdata"

mkdir -p "$OUT_DIR"

PASS=0
FAIL=0

# --- helpers ----------------------------------------------------------------

check_status() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo "  PASS  $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# Build an API request body from a frontend export-format JSON file.
# Export format: { "version", "exportedAt", "project": {...}, "registries": {...} }
# API format:   { "project": { ...project fields..., "registries": {...} } }
# The frontend merges registries into project before sending — this function does the same.
make_request() {
  local export_file="$1"
  local options="${2:-}"
  if [ -n "$options" ]; then
    jq --argjson opts "$options" \
      '{ project: (.project + { registries: .registries }), options: $opts }' \
      "$export_file"
  else
    jq '{ project: (.project + { registries: .registries }) }' "$export_file"
  fi
}

# --- tests ------------------------------------------------------------------

echo "=== Greenprint API Tests ==="
echo "Server: $BASE_URL"
echo "Fixtures: $TESTDATA"
echo ""

# ---- Validation tests (no Gemini call) ----

echo "[1] Health check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
check_status "GET /api/health" 200 "$STATUS"

echo "[2] Empty body -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" -d '{}')
check_status "empty body" 400 "$STATUS"

echo "[3] Invalid JSON -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" -d '{not json}')
check_status "invalid JSON" 400 "$STATUS"

echo "[4] Null project -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" -d '{"project": null}')
check_status "null project" 400 "$STATUS"

echo "[5] Too few vertices -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{"project":{"id":"t","yardBoundary":{"vertices":[{"x":0,"y":0},{"x":1,"y":0}]},"layers":[],"elements":[],"registries":{"terrain":[],"plants":[],"structures":[],"paths":[]}}}')
check_status "too few vertices" 400 "$STATUS"

echo "[6] Invalid garden_style -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"garden_style": "prairie"}')")
check_status "invalid garden_style" 400 "$STATUS"

echo "[7] Invalid season -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"season": "monsoon"}')")
check_status "invalid season" 400 "$STATUS"

echo "[8] Invalid seed -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"seed": "abc"}')")
check_status "invalid seed" 400 "$STATUS"

echo "[8b] Invalid image_size -> 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"image_size": "8K"}')")
check_status "invalid image_size" 400 "$STATUS"

# ---- Generation tests (require GEMINI_API_KEY) ----

echo ""
echo "--- Generation tests (require running server with GEMINI_API_KEY) ---"
echo ""

echo "[9] Minimal project, all defaults -> 200"
STATUS=$(curl -s -o "$OUT_DIR/01-minimal-defaults.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json")")
check_status "minimal defaults" 200 "$STATUS"

echo "[10] Minimal, cottage landscape morning -> 200"
STATUS=$(curl -s -o "$OUT_DIR/02-cottage-landscape.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"garden_style":"cottage","aspect_ratio":"landscape","time_of_day":"morning"}')")
check_status "cottage landscape" 200 "$STATUS"

echo "[11] Minimal, portrait elevated -> 200"
STATUS=$(curl -s -o "$OUT_DIR/03-portrait-elevated.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"aspect_ratio":"portrait","viewpoint":"elevated"}')")
check_status "portrait elevated" 200 "$STATUS"

echo "[12] Minimal, seed=42 -> 200"
STATUS=$(curl -s -o "$OUT_DIR/04-seed-42.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"seed":42}')")
check_status "seed 42" 200 "$STATUS"

echo "[13] Full project, cottage summer landscape -> 200"
STATUS=$(curl -s -o "$OUT_DIR/05-full-project.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/full-project.json" '{"garden_style":"cottage","season":"summer","time_of_day":"golden hour","viewpoint":"eye-level","aspect_ratio":"landscape"}')")
check_status "full project" 200 "$STATUS"

echo "[14] Full project, japanese winter isometric -> 200"
STATUS=$(curl -s -o "$OUT_DIR/06-japanese-winter.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/full-project.json" '{"garden_style":"japanese","season":"winter","time_of_day":"overcast","viewpoint":"isometric"}')")
check_status "japanese winter" 200 "$STATUS"

echo "[15] Full project, tropical midday -> 200"
STATUS=$(curl -s -o "$OUT_DIR/07-tropical-midday.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/full-project.json" '{"garden_style":"tropical","season":"summer","time_of_day":"midday"}')")
check_status "tropical midday" 200 "$STATUS"

echo "[16] Edge cases, arc boundary + curved structure -> 200"
STATUS=$(curl -s -o "$OUT_DIR/08-edge-cases.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/edge-cases.json" '{"garden_style":"mediterranean","season":"late spring"}')")
check_status "edge cases" 200 "$STATUS"

echo "[17] Empty yard, no elements -> 200"
STATUS=$(curl -s -o "$OUT_DIR/09-empty-yard.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/empty-yard.json")")
check_status "empty yard" 200 "$STATUS"

echo "[17b] Minimal, image_size 2K -> 200"
STATUS=$(curl -s -o "$OUT_DIR/08b-image-size-2k.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{"image_size":"2K"}')")
check_status "image_size 2K" 200 "$STATUS"

echo "[18] Full project, exclude planned plants -> 200"
STATUS=$(curl -s -o "$OUT_DIR/10-no-planned.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/full-project.json" '{"include_planned":false}')")
check_status "exclude planned" 200 "$STATUS"

echo "[19] Real yard, no photo -> 200"
STATUS=$(curl -s -o "$OUT_DIR/11-real-yard-no-photo.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/real-yard.json" '{"garden_style":"contemporary","season":"summer","time_of_day":"golden hour","aspect_ratio":"landscape"}')")
check_status "real yard no photo" 200 "$STATUS"

# Test with single yard photo (backward compat — string format)
PHOTO_NUM=0
for YARD_PHOTO in "$TESTDATA"/yard-photo-*.{jpg,jpeg}; do
  [ -f "$YARD_PHOTO" ] || continue
  PHOTO_NUM=$((PHOTO_NUM + 1))
  PHOTO_NAME=$(basename "$YARD_PHOTO")
  PHOTO_STEM="${PHOTO_NAME%.*}"
  echo "[20.$PHOTO_NUM] Real yard + $PHOTO_NAME (single string) -> 200"
  PHOTO_B64=$(base64 < "$YARD_PHOTO" | tr -d '\n')
  BODY=$(jq --arg photo "$PHOTO_B64" \
    '{ project: (.project + { registries: .registries }), yard_photo: $photo, options: { garden_style: "contemporary", season: "summer", time_of_day: "golden hour", aspect_ratio: "landscape" } }' \
    "$TESTDATA/real-yard.json")
  STATUS=$(curl -s -o "$OUT_DIR/12-real-yard-$PHOTO_STEM.png" -w "%{http_code}" \
    -X POST "$BASE_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  check_status "real yard + $PHOTO_NAME" 200 "$STATUS"
done
if [ "$PHOTO_NUM" -eq 0 ]; then
  echo "[20] SKIP  real yard + photo (no testdata/yard-photo-*.{jpg,jpeg} found)"
fi

# Test with multi-photo yard_photo array (all photos in testdata)
MULTI_PHOTOS=()
for YARD_PHOTO in "$TESTDATA"/yard-photo-*.{jpg,jpeg}; do
  [ -f "$YARD_PHOTO" ] || continue
  MULTI_PHOTOS+=("$YARD_PHOTO")
done
if [ "${#MULTI_PHOTOS[@]}" -ge 2 ]; then
  echo "[21] Real yard + ${#MULTI_PHOTOS[@]} photos (array format) -> 200"
  # Build a JSON array of base64 strings
  PHOTO_ARRAY="["
  for i in "${!MULTI_PHOTOS[@]}"; do
    [ "$i" -gt 0 ] && PHOTO_ARRAY+=","
    B64=$(base64 < "${MULTI_PHOTOS[$i]}" | tr -d '\n')
    PHOTO_ARRAY+="\"$B64\""
  done
  PHOTO_ARRAY+="]"
  BODY=$(jq --argjson photos "$PHOTO_ARRAY" \
    '{ project: (.project + { registries: .registries }), yard_photo: $photos, options: { garden_style: "contemporary", season: "summer", time_of_day: "golden hour", aspect_ratio: "landscape" } }' \
    "$TESTDATA/real-yard.json")
  STATUS=$(curl -s -o "$OUT_DIR/13-multi-photo-array.png" -w "%{http_code}" \
    -X POST "$BASE_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  check_status "multi-photo array (${#MULTI_PHOTOS[@]} photos)" 200 "$STATUS"
else
  echo "[21] SKIP  multi-photo array (need >= 2 testdata/yard-photo-*.{jpg,jpeg})"
fi

# Test multi-photo validation: too many photos -> 400
echo "[22] Too many photos (5) -> 400"
FAKE_PHOTO=$(base64 < "$TESTDATA/yard-photo-1.jpeg" 2>/dev/null | tr -d '\n' || echo "")
if [ -n "$FAKE_PHOTO" ]; then
  BODY=$(jq --arg p "$FAKE_PHOTO" \
    '{ project: (.project + { registries: .registries }), yard_photo: [$p, $p, $p, $p, $p] }' \
    "$TESTDATA/minimal-project.json")
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate" \
    -H "Content-Type: application/json" -d "$BODY")
  check_status "too many photos" 400 "$STATUS"
else
  echo "[22] SKIP  too many photos (no yard-photo-1.jpeg for test data)"
fi

# Test multi-photo validation: empty array -> 200 (treated as no photos)
echo "[23] Empty photo array -> 200"
STATUS=$(curl -s -o "$OUT_DIR/14-empty-photo-array.png" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$(make_request "$TESTDATA/minimal-project.json" '{}' | jq '. + {yard_photo: []}')")
check_status "empty photo array" 200 "$STATUS"

# --- summary ----------------------------------------------------------------

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$PASS" -gt 8 ]; then
  echo "Output images saved to: $OUT_DIR/"
  ls -lh "$OUT_DIR"/*.png 2>/dev/null || true
fi

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo "SOME TESTS FAILED"
  exit 1
else
  echo "ALL TESTS PASSED"
fi
