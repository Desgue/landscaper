package render

import (
	"bytes"
	"math"
	"strings"

	"github.com/fogleman/gg"

	"greenprint/internal/filter"
	"greenprint/internal/model"
)

// Segmentation color constants.
// Non-natural, high-contrast palette so Gemini never confuses diagram shapes
// with photorealistic content. Hue bands: plants=pink/magenta, terrain=cyan/gold,
// paths=neon green, structures=red/orange.
const (
	ColorVoid          = "#000000"
	ColorBareSoil      = "#FFA500" // orange — yard boundary fill
	ColorLawnGrass     = "#00FFFF" // cyan
	ColorSoilMulch     = "#FFD700" // gold
	ColorGravelStone   = "#7B68EE" // medium slate blue
	ColorWoodDecking   = "#00CED1" // dark turquoise
	ColorWater         = "#E0FFFF" // light cyan
	ColorPathStone     = "#ADFF2F" // green-yellow neon
	ColorPathBrick     = "#7FFF00" // chartreuse
	ColorPathWood      = "#32CD32" // lime green
	ColorPathConcrete  = "#98FB98" // pale green
	ColorPathOther     = "#00FA9A" // medium spring green
	ColorTreeTrunk     = "#8B008B" // dark magenta
	ColorTreeCanopy    = "#FF00FF" // magenta
	ColorShrub         = "#FF1493" // deep pink
	ColorHerb          = "#FF69B4" // hot pink
	ColorGroundcover   = "#DA70D6" // orchid purple
	ColorClimber       = "#FF00FF" // magenta
	ColorStructWood    = "#FF4500" // orange-red
	ColorStructMetal   = "#FF6347" // tomato
	ColorStructMasonry = "#FF7F50" // coral
	ColorStructStone   = "#DC143C" // crimson
	ColorStructOther   = "#CD5C5C" // indian red
	ColorWaterFeature  = "#1E90FF" // dodger blue
	ColorFireFeature   = "#FFD700" // gold
	ColorNoMaterial    = "#C0C0C0" // silver — fallback for path or structure with no material field
)

// Render produces a segmentation map PNG from filtered elements and a yard boundary.
func Render(elements []filter.FilteredElement, boundary *model.YardBoundary, aspectRatio string) ([]byte, error) {
	// Determine output dimensions from aspect ratio
	outW, outH := outputDimensions(aspectRatio)

	// Compute AABB of yard boundary with 10% padding
	minX, minY, maxX, maxY := boundaryAABB(boundary.Vertices)
	padX := (maxX - minX) * 0.1
	padY := (maxY - minY) * 0.1
	minX -= padX
	minY -= padY
	maxX += padX
	maxY += padY

	worldW := maxX - minX
	worldH := maxY - minY

	// Uniform scale to fit output, letterbox with black
	scaleX := float64(outW) / worldW
	scaleY := float64(outH) / worldH
	scale := math.Min(scaleX, scaleY)

	// Offset to center the content (letterbox)
	renderedW := worldW * scale
	renderedH := worldH * scale
	offsetX := (float64(outW) - renderedW) / 2
	offsetY := (float64(outH) - renderedH) / 2

	dc := gg.NewContext(outW, outH)

	// Helper to transform world coords to canvas coords
	toCanvas := func(wx, wy float64) (float64, float64) {
		cx := (wx-minX)*scale + offsetX
		cy := (wy-minY)*scale + offsetY
		return cx, cy
	}

	// Step 1: Fill entire canvas with void color
	dc.SetHexColor(ColorVoid)
	dc.Clear()

	// Step 2: Fill yard boundary polygon with bare soil
	drawYardBoundary(dc, boundary, toCanvas)
	dc.SetHexColor(ColorBareSoil)
	dc.Fill()

	// Step 3-6: Draw elements in order
	drawElements(dc, elements, toCanvas, scale)

	// Encode to PNG
	buf := new(bytes.Buffer)
	if err := dc.EncodePNG(buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func outputDimensions(aspectRatio string) (w, h int) {
	switch aspectRatio {
	case "landscape":
		return 1024, 576 // 16:9
	case "portrait":
		return 576, 1024 // 9:16
	default: // "square"
		return 1024, 1024
	}
}

func boundaryAABB(vertices []model.Point) (minX, minY, maxX, maxY float64) {
	minX = math.Inf(1)
	minY = math.Inf(1)
	maxX = math.Inf(-1)
	maxY = math.Inf(-1)
	for _, v := range vertices {
		if v.X < minX {
			minX = v.X
		}
		if v.Y < minY {
			minY = v.Y
		}
		if v.X > maxX {
			maxX = v.X
		}
		if v.Y > maxY {
			maxY = v.Y
		}
	}
	return
}

func drawYardBoundary(dc *gg.Context, boundary *model.YardBoundary, toCanvas func(float64, float64) (float64, float64)) {
	verts := boundary.Vertices
	n := len(verts)
	if n < 3 {
		return
	}

	cx, cy := toCanvas(verts[0].X, verts[0].Y)
	dc.MoveTo(cx, cy)

	for i := 0; i < n; i++ {
		next := (i + 1) % n
		p0 := verts[i]
		p1 := verts[next]

		// Check if this edge is an arc
		if i < len(boundary.EdgeTypes) && boundary.EdgeTypes[i].Type == "arc" &&
			boundary.EdgeTypes[i].ArcSagitta != nil && *boundary.EdgeTypes[i].ArcSagitta != 0 {
			arcPoints := approximateArc(p0, p1, *boundary.EdgeTypes[i].ArcSagitta)
			// Skip first point (already at current position), draw to remaining points
			for j := 1; j < len(arcPoints); j++ {
				ax, ay := toCanvas(arcPoints[j].X, arcPoints[j].Y)
				dc.LineTo(ax, ay)
			}
		} else {
			// Straight line
			lx, ly := toCanvas(p1.X, p1.Y)
			dc.LineTo(lx, ly)
		}
	}
	dc.ClosePath()
}

// approximateArc converts an arc edge (chord + sagitta) to a 12-segment polyline (13 points).
func approximateArc(p0, p1 model.Point, sagitta float64) []model.Point {
	// Chord midpoint
	mx := (p0.X + p1.X) / 2
	my := (p0.Y + p1.Y) / 2

	// Chord half-length
	dx := p1.X - p0.X
	dy := p1.Y - p0.Y
	chordLen := math.Sqrt(dx*dx + dy*dy)
	if chordLen < 1e-9 {
		return []model.Point{p0, p1}
	}
	h := chordLen / 2

	// Arc radius
	s := sagitta
	r := (h*h + s*s) / (2 * s)

	// Perpendicular unit vector (rotate chord direction 90°)
	nx := -dy / chordLen
	ny := dx / chordLen

	// Arc center: on perpendicular bisector at distance r-s from M, opposite side from arc
	cx := mx - nx*(r-s)
	cy := my - ny*(r-s)

	// Start and end angles
	theta0 := math.Atan2(p0.Y-cy, p0.X-cx)
	theta1 := math.Atan2(p1.Y-cy, p1.X-cx)

	// Ensure we go the short way around (matching the sagitta direction)
	dTheta := theta1 - theta0
	if dTheta > math.Pi {
		dTheta -= 2 * math.Pi
	} else if dTheta < -math.Pi {
		dTheta += 2 * math.Pi
	}

	// Sample 13 points (12 segments)
	points := make([]model.Point, 13)
	for i := 0; i <= 12; i++ {
		t := float64(i) / 12.0
		theta := theta0 + dTheta*t
		points[i] = model.Point{
			X: cx + r*math.Cos(theta),
			Y: cy + r*math.Sin(theta),
		}
	}
	return points
}

func drawElements(dc *gg.Context, elements []filter.FilteredElement, toCanvas func(float64, float64) (float64, float64), scale float64) {
	// Draw order: terrain cells → paths → structures → plants
	for i := range elements {
		if elements[i].Element.Type == "terrain" {
			drawTerrain(dc, &elements[i], toCanvas, scale)
		}
	}
	for i := range elements {
		if elements[i].Element.Type == "path" {
			drawPath(dc, &elements[i], toCanvas, scale)
		}
	}
	for i := range elements {
		if elements[i].Element.Type == "structure" {
			drawStructure(dc, &elements[i], toCanvas, scale)
		}
	}
	for i := range elements {
		if elements[i].Element.Type == "plant" {
			drawPlant(dc, &elements[i], toCanvas, scale)
		}
	}
}

func drawTerrain(dc *gg.Context, fe *filter.FilteredElement, toCanvas func(float64, float64) (float64, float64), scale float64) {
	color := terrainColor(fe.TerrainType)
	dc.SetHexColor(color)
	// Terrain cells: 100x100cm rectangle, x/y is top-left aligned to 100cm boundaries
	cx, cy := toCanvas(fe.Element.X, fe.Element.Y)
	w := 100.0 * scale
	h := 100.0 * scale
	dc.DrawRectangle(cx, cy, w, h)
	dc.Fill()
}

func drawPath(dc *gg.Context, fe *filter.FilteredElement, toCanvas func(float64, float64) (float64, float64), scale float64) {
	color := pathColor(fe.PathType)
	dc.SetHexColor(color)

	strokeWidth := fe.Element.StrokeWidthCm
	if strokeWidth == 0 && fe.PathType != nil {
		strokeWidth = fe.PathType.DefaultWidthCm
	}
	dc.SetLineWidth(strokeWidth * scale)
	dc.SetLineCapRound()
	dc.SetLineJoinRound()

	points := fe.Element.Points
	if len(points) < 2 {
		return
	}

	cx, cy := toCanvas(points[0].X, points[0].Y)
	dc.MoveTo(cx, cy)

	for i := 0; i < len(points)-1; i++ {
		p0 := points[i]
		p1 := points[i+1]

		// Check if this segment is an arc
		if i < len(fe.Element.Segments) && fe.Element.Segments[i].Type == "arc" &&
			fe.Element.Segments[i].ArcSagitta != nil && *fe.Element.Segments[i].ArcSagitta != 0 {
			arcPts := approximateArc(p0, p1, *fe.Element.Segments[i].ArcSagitta)
			for j := 1; j < len(arcPts); j++ {
				ax, ay := toCanvas(arcPts[j].X, arcPts[j].Y)
				dc.LineTo(ax, ay)
			}
		} else {
			lx, ly := toCanvas(p1.X, p1.Y)
			dc.LineTo(lx, ly)
		}
	}

	// Closed path: draw closing segment from last point to first
	if fe.Element.Closed && len(points) > 2 {
		lx, ly := toCanvas(points[0].X, points[0].Y)
		dc.LineTo(lx, ly)
	}

	dc.Stroke()
}

func drawStructure(dc *gg.Context, fe *filter.FilteredElement, toCanvas func(float64, float64) (float64, float64), scale float64) {
	color := structureColor(fe.StructureType)
	dc.SetHexColor(color)

	elem := fe.Element
	centerX := elem.X + elem.Width/2
	centerY := elem.Y + elem.Height/2
	rotRad := elem.Rotation * math.Pi / 180

	if elem.Shape == "curved" && elem.ArcSagitta != nil && *elem.ArcSagitta != 0 {
		// Curved structure: arc band
		drawCurvedStructure(dc, &elem, toCanvas, scale, rotRad, centerX, centerY)
	} else {
		// Straight structure: rotated rectangle
		hw := elem.Width / 2
		hh := elem.Height / 2
		corners := [4][2]float64{
			{-hw, -hh}, {hw, -hh}, {hw, hh}, {-hw, hh},
		}
		// Rotate corners around center
		for i, c := range corners {
			rx := c[0]*math.Cos(rotRad) - c[1]*math.Sin(rotRad) + centerX
			ry := c[0]*math.Sin(rotRad) + c[1]*math.Cos(rotRad) + centerY
			cx, cy := toCanvas(rx, ry)
			if i == 0 {
				dc.MoveTo(cx, cy)
			} else {
				dc.LineTo(cx, cy)
			}
		}
		dc.ClosePath()
		dc.Fill()
	}
}

func drawCurvedStructure(dc *gg.Context, elem *model.Element, toCanvas func(float64, float64) (float64, float64), _, rotRad, centerX, centerY float64) {
	// Compute arc band: use element bounding box to derive chord
	// The chord runs along the width, sagitta defines the curve
	hw := elem.Width / 2
	hh := elem.Height / 2

	// Outer arc: from left-center to right-center of bounding box
	p0 := model.Point{X: -hw, Y: 0}
	p1 := model.Point{X: hw, Y: 0}
	outerPts := approximateArc(p0, p1, *elem.ArcSagitta)

	// Inner arc: offset by height (band width)
	// Use negative sagitta offset for inner edge
	innerSagitta := *elem.ArcSagitta
	if math.Abs(innerSagitta) > hh {
		innerSagitta -= hh
	} else {
		innerSagitta *= (1 - hh/math.Max(math.Abs(innerSagitta), 1))
	}

	// If inner sagitta is effectively zero or negative, just use a straight line
	var innerPts []model.Point
	if math.Abs(innerSagitta) > 0.1 {
		innerPts = approximateArc(p0, p1, innerSagitta)
	} else {
		innerPts = []model.Point{p0, p1}
	}

	// Build the arc band polygon: outer forward, inner reversed
	// Apply rotation and translate to center
	allPts := make([][2]float64, 0, len(outerPts)+len(innerPts))
	for _, p := range outerPts {
		rx := p.X*math.Cos(rotRad) - p.Y*math.Sin(rotRad) + centerX
		ry := p.X*math.Sin(rotRad) + p.Y*math.Cos(rotRad) + centerY
		allPts = append(allPts, [2]float64{rx, ry})
	}
	for i := len(innerPts) - 1; i >= 0; i-- {
		p := innerPts[i]
		rx := p.X*math.Cos(rotRad) - p.Y*math.Sin(rotRad) + centerX
		ry := p.X*math.Sin(rotRad) + p.Y*math.Cos(rotRad) + centerY
		allPts = append(allPts, [2]float64{rx, ry})
	}

	for i, p := range allPts {
		cx, cy := toCanvas(p[0], p[1])
		if i == 0 {
			dc.MoveTo(cx, cy)
		} else {
			dc.LineTo(cx, cy)
		}
	}
	dc.ClosePath()
	dc.Fill()
}

func drawPlant(dc *gg.Context, fe *filter.FilteredElement, toCanvas func(float64, float64) (float64, float64), scale float64) {
	pt := fe.PlantType
	if pt == nil {
		return
	}

	// Center position
	centerX := fe.Element.X + fe.Element.Width/2
	centerY := fe.Element.Y + fe.Element.Height/2
	cx, cy := toCanvas(centerX, centerY)

	if pt.GrowthForm == "tree" {
		// Tree: draw trunk first, then canopy on top
		trunkDiam := 20.0 // default 20cm
		if pt.TrunkWidthCm != nil {
			trunkDiam = *pt.TrunkWidthCm
		}
		dc.SetHexColor(ColorTreeTrunk)
		dc.DrawCircle(cx, cy, (trunkDiam/2)*scale)
		dc.Fill()

		canopyDiam := pt.SpacingCm
		if pt.CanopyWidthCm != nil {
			canopyDiam = *pt.CanopyWidthCm
		}
		dc.SetHexColor(ColorTreeCanopy)
		dc.DrawCircle(cx, cy, (canopyDiam/2)*scale)
		dc.Fill()
	} else {
		// Non-tree: single circle
		color := plantColor(pt.GrowthForm)
		dc.SetHexColor(color)

		diam := pt.SpacingCm
		if (pt.GrowthForm == "shrub") && pt.CanopyWidthCm != nil {
			diam = *pt.CanopyWidthCm
		}
		dc.DrawCircle(cx, cy, (diam/2)*scale)
		dc.Fill()
	}
}

// --- Color lookup functions ---

func terrainColor(tt *model.TerrainType) string {
	if tt == nil {
		return ColorBareSoil
	}

	// Step 1: Match by built-in ID
	switch tt.ID {
	case "grass":
		return ColorLawnGrass
	case "soil", "mulch", "bark":
		return ColorSoilMulch
	case "gravel", "concrete":
		return ColorGravelStone
	case "wood-decking", "decking-surface":
		return ColorWoodDecking
	case "water":
		return ColorWater
	}

	// Step 2: Fallback to category
	switch tt.Category {
	case "natural":
		return ColorLawnGrass
	case "hardscape":
		return ColorGravelStone
	case "water":
		return ColorWater
	case "mulch":
		return ColorSoilMulch
	case "other":
		return ColorBareSoil
	}

	return ColorBareSoil
}

func pathColor(pt *model.PathType) string {
	if pt == nil || pt.Material == nil {
		return ColorNoMaterial
	}
	switch *pt.Material {
	case "stone", "gravel":
		return ColorPathStone
	case "brick":
		return ColorPathBrick
	case "wood":
		return ColorPathWood
	case "concrete":
		return ColorPathConcrete
	default:
		return ColorPathOther
	}
}

func structureColor(st *model.StructureType) string {
	if st == nil {
		return ColorStructOther
	}

	// Special cases: water feature and fire feature
	if st.Category == "feature" {
		if strings.Contains(st.ID, "fire") {
			return ColorFireFeature
		}
		if st.Material != nil && *st.Material == "other" {
			return ColorWaterFeature
		}
	}

	if st.Material == nil {
		return ColorNoMaterial
	}
	switch *st.Material {
	case "wood":
		return ColorStructWood
	case "metal":
		return ColorStructMetal
	case "masonry":
		return ColorStructMasonry
	case "stone":
		return ColorStructStone
	default:
		return ColorStructOther
	}
}

func plantColor(growthForm string) string {
	switch growthForm {
	case "shrub":
		return ColorShrub
	case "herb":
		return ColorHerb
	case "groundcover":
		return ColorGroundcover
	case "climber":
		return ColorClimber
	default:
		return ColorHerb
	}
}
