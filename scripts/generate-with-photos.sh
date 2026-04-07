#!/usr/bin/env bash
#
# Generate a garden image with N yard photos.
#
# Usage:
#   ./scripts/generate-with-photos.sh <project.json> [photo1.jpg] [photo2.jpg] ... [photoN.jpg]
#   ./scripts/generate-with-photos.sh <project.json>                          # no photos
#   ./scripts/generate-with-photos.sh <project.json> photos/*.jpg             # glob
#
# Options (via env vars):
#   BASE_URL        Server URL             (default: http://localhost:8080)
#   GARDEN_STYLE    garden_style option     (default: contemporary)
#   SEASON          season option           (default: omitted, auto-derived)
#   TIME_OF_DAY     time_of_day option      (default: golden hour)
#   VIEWPOINT       viewpoint option        (default: eye-level)
#   ASPECT_RATIO    aspect_ratio option     (default: landscape)
#   IMAGE_SIZE      image_size option       (default: 1K)
#   SEED            seed option             (default: omitted, random)
#   OUTPUT          output file path        (default: scripts/output/generated.png)
#
# Examples:
#   ./scripts/generate-with-photos.sh testdata/real-yard.json testdata/yard-photo-1.jpeg
#   ./scripts/generate-with-photos.sh testdata/real-yard.json testdata/yard-photo-*.jpeg
#   ASPECT_RATIO=portrait VIEWPOINT=elevated ./scripts/generate-with-photos.sh testdata/full-project.json
#   GARDEN_STYLE=japanese SEASON=winter ./scripts/generate-with-photos.sh testdata/full-project.json photos/front.jpg photos/back.jpg
#
# Requires: curl, jq, base64, a running server

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <project.json> [photo1.jpg] [photo2.jpg] ... [photoN.jpg]"
  echo ""
  echo "  project.json   Frontend export JSON (testdata/*.json)"
  echo "  photo*.jpg     0–4 yard photos (JPEG or PNG)"
  echo ""
  echo "Options via env vars: GARDEN_STYLE, SEASON, TIME_OF_DAY, VIEWPOINT, ASPECT_RATIO, IMAGE_SIZE, SEED, OUTPUT, BASE_URL"
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:8080}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT="${OUTPUT:-$SCRIPT_DIR/output/generated.png}"

PROJECT_FILE="$1"
shift

if [ ! -f "$PROJECT_FILE" ]; then
  echo "Error: project file not found: $PROJECT_FILE"
  exit 1
fi

# Collect photo files
PHOTOS=("$@")
if [ "${#PHOTOS[@]}" -gt 4 ]; then
  echo "Error: max 4 photos allowed, got ${#PHOTOS[@]}"
  exit 1
fi

# Build options JSON
OPTIONS="{}"
[ -n "${GARDEN_STYLE:-}" ] && OPTIONS=$(echo "$OPTIONS" | jq --arg v "$GARDEN_STYLE" '. + {garden_style: $v}')
[ -n "${SEASON:-}" ]       && OPTIONS=$(echo "$OPTIONS" | jq --arg v "$SEASON" '. + {season: $v}')
[ -n "${TIME_OF_DAY:-}" ]  && OPTIONS=$(echo "$OPTIONS" | jq --arg v "${TIME_OF_DAY}" '. + {time_of_day: $v}')
[ -n "${VIEWPOINT:-}" ]    && OPTIONS=$(echo "$OPTIONS" | jq --arg v "$VIEWPOINT" '. + {viewpoint: $v}')
[ -n "${ASPECT_RATIO:-}" ] && OPTIONS=$(echo "$OPTIONS" | jq --arg v "$ASPECT_RATIO" '. + {aspect_ratio: $v}')
[ -n "${IMAGE_SIZE:-}" ]   && OPTIONS=$(echo "$OPTIONS" | jq --arg v "$IMAGE_SIZE" '. + {image_size: $v}')
[ -n "${SEED:-}" ]         && OPTIONS=$(echo "$OPTIONS" | jq --argjson v "$SEED" '. + {seed: $v}')

# Apply defaults for common options if not set
[ -z "${GARDEN_STYLE:-}" ] && OPTIONS=$(echo "$OPTIONS" | jq '. + {garden_style: "contemporary"}')
[ -z "${TIME_OF_DAY:-}" ]  && OPTIONS=$(echo "$OPTIONS" | jq '. + {time_of_day: "golden hour"}')
[ -z "${ASPECT_RATIO:-}" ] && OPTIONS=$(echo "$OPTIONS" | jq '. + {aspect_ratio: "landscape"}')

# Build request body: merge registries into project (mimics frontend)
BODY=$(jq --argjson opts "$OPTIONS" \
  '{ project: (.project + { registries: .registries }), options: $opts }' \
  "$PROJECT_FILE")

# Add yard photos
if [ "${#PHOTOS[@]}" -eq 0 ]; then
  echo "No yard photos — segmentation-only generation"
elif [ "${#PHOTOS[@]}" -eq 1 ]; then
  # Single photo: send as string (backward compatible)
  echo "1 yard photo: ${PHOTOS[0]}"
  if [ ! -f "${PHOTOS[0]}" ]; then
    echo "Error: photo not found: ${PHOTOS[0]}"
    exit 1
  fi
  B64=$(base64 < "${PHOTOS[0]}" | tr -d '\n')
  BODY=$(echo "$BODY" | jq --arg photo "$B64" '. + {yard_photo: $photo}')
else
  # Multiple photos: send as array
  echo "${#PHOTOS[@]} yard photos:"
  PHOTO_ARRAY="[]"
  for PHOTO in "${PHOTOS[@]}"; do
    if [ ! -f "$PHOTO" ]; then
      echo "Error: photo not found: $PHOTO"
      exit 1
    fi
    echo "  - $PHOTO"
    B64=$(base64 < "$PHOTO" | tr -d '\n')
    PHOTO_ARRAY=$(echo "$PHOTO_ARRAY" | jq --arg p "$B64" '. + [$p]')
  done
  BODY=$(echo "$BODY" | jq --argjson photos "$PHOTO_ARRAY" '. + {yard_photo: $photos}')
fi

# Show request summary
BODY_SIZE=$(echo "$BODY" | wc -c | tr -d ' ')
echo ""
echo "Request:"
echo "  Server:       $BASE_URL"
echo "  Project:      $PROJECT_FILE"
echo "  Photos:       ${#PHOTOS[@]}"
echo "  Body size:    $(( BODY_SIZE / 1024 )) KB"
echo "  Options:      $(echo "$OPTIONS" | jq -c .)"
echo "  Output:       $OUTPUT"
echo ""

mkdir -p "$(dirname "$OUTPUT")"

echo "Sending request..."
START=$(date +%s)

HTTP_CODE=$(curl -s -o "$OUTPUT" -w "%{http_code}" \
  -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d "$BODY")

END=$(date +%s)
ELAPSED=$((END - START))

if [ "$HTTP_CODE" -eq 200 ]; then
  SIZE=$(wc -c < "$OUTPUT" | tr -d ' ')
  echo "Success (HTTP $HTTP_CODE, ${ELAPSED}s)"
  echo "Output: $OUTPUT ($(( SIZE / 1024 )) KB)"
else
  echo "Failed (HTTP $HTTP_CODE, ${ELAPSED}s)"
  cat "$OUTPUT" 2>/dev/null
  echo ""
  rm -f "$OUTPUT"
  exit 1
fi
