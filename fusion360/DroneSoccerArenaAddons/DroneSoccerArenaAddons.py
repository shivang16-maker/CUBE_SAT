"""
Drone Soccer Arena Add-ons (Class 20) -- Fusion 360 script

Adds to the open arena design, sized for Drone Soccer Class 20
(20 cm ball-drone, 8 m x 4 m x 3 m arena):

  * 2 goal rings  -- 30 cm inner / 50 cm outer diameter, 10 cm thick,
                     1.5 m in from each short side, on a stand
  * 4 obstacles
      1. Ring       -- hoop on a stand to fly through
      2. Half gate  -- half-circle arch standing on the floor (fly low)
      3. High gate  -- raised window (fly high)
      4. 2 x poles  -- pair of vertical poles to slalom around

How it works
  The script measures the bounding box of everything already in the design
  (your arena), works out which axis is "up" and which horizontal axis is the
  long one, then places everything relative to the arena floor centre.
  Every part is created in its own component whose name starts with
  "DSA_", so running the script again first deletes the old DSA_ parts and
  rebuilds them (handy after you change the settings below).

All settings are in millimetres.
"""

import math
import traceback

try:
    import adsk.core
    import adsk.fusion
except ImportError:  # allows the layout maths to be tested outside Fusion
    adsk = None


# --------------------------------------------------------------------------
# Settings -- edit these, then run the script again
# --------------------------------------------------------------------------

# Arena size. With AUTO_FIT = True these are measured from your model and the
# values below are only used if the design is empty. Class 20: 8 x 4 x 3 m.
AUTO_FIT = True
ARENA_LENGTH_MM = 8000.0
ARENA_WIDTH_MM = 4000.0
ARENA_HEIGHT_MM = 3000.0

# "auto" picks the smallest dimension of the arena as the vertical one.
# Set to "X", "Y" or "Z" if the auto-detection gets it wrong.
UP_AXIS = "auto"

# Shared by every stand
BASE_THICKNESS_MM = 20.0

# ---- Goal rings (Class 20) -------------------------------------------------
GOAL_INNER_DIAMETER_MM = 300.0
GOAL_OUTER_DIAMETER_MM = 500.0
GOAL_RING_THICKNESS_MM = 100.0
GOAL_CENTER_HEIGHT_MM = 1800.0
GOAL_DISTANCE_FROM_END_MM = 1500.0      # from the short side, towards centre
GOAL_POST_DIAMETER_MM = 50.0
GOAL_BASE_DIAMETER_MM = 500.0

# ---- Obstacle positions ------------------------------------------------------
# Measured from the arena centre: a = along the length (towards the goals),
# b = across the width. The centre line is left clear for the face-off.
RING_POS_MM = (-1200.0, 1000.0)
HALF_GATE_POS_MM = (1200.0, -1000.0)
HIGH_GATE_POS_MM = (1200.0, 1000.0)
POLES_POS_MM = (-1200.0, -1000.0)       # midpoint between the two poles

# ---- 1. Ring -----------------------------------------------------------------
RING_INNER_DIAMETER_MM = 600.0
RING_TUBE_DIAMETER_MM = 40.0
RING_CENTER_HEIGHT_MM = 1200.0
RING_POST_DIAMETER_MM = 40.0
RING_BASE_DIAMETER_MM = 400.0

# ---- 2. Half gate (half-circle arch on the floor) ----------------------------
HALF_GATE_INNER_DIAMETER_MM = 900.0     # opening is 900 wide x 450 high
HALF_GATE_TUBE_DIAMETER_MM = 40.0
HALF_GATE_FOOT_DIAMETER_MM = 200.0

# ---- 3. High gate (raised window) --------------------------------------------
HIGH_GATE_OPENING_WIDTH_MM = 800.0
HIGH_GATE_OPENING_BOTTOM_MM = 1500.0    # height of the lower bar
HIGH_GATE_OPENING_TOP_MM = 2200.0       # height of the upper bar
HIGH_GATE_POST_DIAMETER_MM = 50.0
HIGH_GATE_BAR_SIZE_MM = 50.0            # square bar section
HIGH_GATE_BASE_DIAMETER_MM = 300.0

# ---- 4. Two poles ------------------------------------------------------------
POLE_DIAMETER_MM = 50.0
POLE_HEIGHT_MM = 2500.0
POLE_SPACING_MM = 1000.0                # centre to centre, along the length
POLE_BASE_DIAMETER_MM = 300.0

# Colours (R, G, B)
GOAL_COLORS = [(220, 40, 40), (40, 90, 220)]   # -length end, +length end
RING_COLOR = (255, 140, 0)
HALF_GATE_COLOR = (250, 210, 0)
HIGH_GATE_COLOR = (0, 180, 120)
POLE_COLOR = (150, 60, 220)

PREFIX = "DSA_"


# --------------------------------------------------------------------------
# Layout (pure maths, arena coordinates in mm)
#   a = along the arena length, b = across the width, h = height above floor,
#   origin at the centre of the arena floor. Drones fly through every
#   opening along a, i.e. towards the goals.
# --------------------------------------------------------------------------

ALONG = (1.0, 0.0, 0.0)


def _cyl(a, b, h1, h2, diameter):
    return {"type": "cylinder", "p1": (a, b, h1), "p2": (a, b, h2),
            "r": diameter / 2.0}


def _base(a, b, diameter):
    return _cyl(a, b, 0.0, BASE_THICKNESS_MM, diameter)


def compute_layout(length, width, height):
    """Return a list of parts: {name, color, shapes:[...]} in arena mm."""
    parts = []

    # ---- Goal rings ------------------------------------------------------
    goal_outer_r = GOAL_OUTER_DIAMETER_MM / 2.0
    goal_h = min(GOAL_CENTER_HEIGHT_MM, height - goal_outer_r - 50.0)
    goal_a = length / 2.0 - min(GOAL_DISTANCE_FROM_END_MM, length / 4.0)
    for i, side in enumerate((-1, 1)):
        a = side * goal_a
        parts.append({
            "name": "Goal_Ring_%s" % ("A" if side < 0 else "B"),
            "color": GOAL_COLORS[i],
            "shapes": [
                {"type": "annulus", "center": (a, 0.0, goal_h), "axis": ALONG,
                 "outer": goal_outer_r,
                 "inner": GOAL_INNER_DIAMETER_MM / 2.0,
                 "thickness": GOAL_RING_THICKNESS_MM},
                _cyl(a, 0.0, 0.0, goal_h - goal_outer_r + 10.0,
                     GOAL_POST_DIAMETER_MM),
                _base(a, 0.0, GOAL_BASE_DIAMETER_MM),
            ],
        })

    # ---- 1. Ring ---------------------------------------------------------
    a, b = RING_POS_MM
    tube_r = RING_TUBE_DIAMETER_MM / 2.0
    major = RING_INNER_DIAMETER_MM / 2.0 + tube_r
    ring_h = min(RING_CENTER_HEIGHT_MM, height - major - tube_r - 50.0)
    parts.append({
        "name": "Obstacle_1_Ring", "color": RING_COLOR,
        "shapes": [
            {"type": "torus", "center": (a, b, ring_h), "axis": ALONG,
             "major": major, "minor": tube_r},
            _cyl(a, b, 0.0, ring_h - major, RING_POST_DIAMETER_MM),
            _base(a, b, RING_BASE_DIAMETER_MM),
        ],
    })

    # ---- 2. Half gate ----------------------------------------------------
    a, b = HALF_GATE_POS_MM
    tube_r = HALF_GATE_TUBE_DIAMETER_MM / 2.0
    major = HALF_GATE_INNER_DIAMETER_MM / 2.0 + tube_r
    parts.append({
        "name": "Obstacle_2_Half_Gate", "color": HALF_GATE_COLOR,
        "shapes": [
            {"type": "half_torus", "center": (a, b, 0.0), "axis": ALONG,
             "major": major, "minor": tube_r},
            _base(a, b - major, HALF_GATE_FOOT_DIAMETER_MM),
            _base(a, b + major, HALF_GATE_FOOT_DIAMETER_MM),
        ],
    })

    # ---- 3. High gate ----------------------------------------------------
    a, b = HIGH_GATE_POS_MM
    bar = HIGH_GATE_BAR_SIZE_MM
    top = min(HIGH_GATE_OPENING_TOP_MM, height - bar - 50.0)
    bottom = min(HIGH_GATE_OPENING_BOTTOM_MM, top - 300.0)
    post_off = (HIGH_GATE_OPENING_WIDTH_MM + HIGH_GATE_POST_DIAMETER_MM) / 2.0
    bar_len = HIGH_GATE_OPENING_WIDTH_MM + 2.0 * HIGH_GATE_POST_DIAMETER_MM
    shapes = []
    for pb in (b - post_off, b + post_off):
        shapes.append(_cyl(a, pb, 0.0, top + bar, HIGH_GATE_POST_DIAMETER_MM))
        shapes.append(_base(a, pb, HIGH_GATE_BASE_DIAMETER_MM))
    for bar_h in (bottom - bar / 2.0, top + bar / 2.0):
        shapes.append({"type": "box", "center": (a, b, bar_h),
                       "size": (bar, bar_len, bar)})
    parts.append({"name": "Obstacle_3_High_Gate", "color": HIGH_GATE_COLOR,
                  "shapes": shapes})

    # ---- 4. Two poles ----------------------------------------------------
    a, b = POLES_POS_MM
    pole_h = min(POLE_HEIGHT_MM, height)
    shapes = []
    for pa in (a - POLE_SPACING_MM / 2.0, a + POLE_SPACING_MM / 2.0):
        shapes.append(_cyl(pa, b, 0.0, pole_h, POLE_DIAMETER_MM))
        shapes.append(_base(pa, b, POLE_BASE_DIAMETER_MM))
    parts.append({"name": "Obstacle_4_Two_Poles", "color": POLE_COLOR,
                  "shapes": shapes})

    return parts


# --------------------------------------------------------------------------
# Fusion 360 side
# --------------------------------------------------------------------------

class ArenaFrame(object):
    """Maps arena coordinates (a, b, h in mm) to model coordinates (cm)."""

    def __init__(self, len_idx, wid_idx, up_idx, center_cm, floor_cm):
        self.len_idx, self.wid_idx, self.up_idx = len_idx, wid_idx, up_idx
        self.center_cm = center_cm
        self.floor_cm = floor_cm

    def _coords(self, a, b, h, offset):
        c = [0.0, 0.0, 0.0]
        c[self.len_idx] = a / 10.0 + (self.center_cm[self.len_idx] if offset else 0.0)
        c[self.wid_idx] = b / 10.0 + (self.center_cm[self.wid_idx] if offset else 0.0)
        c[self.up_idx] = h / 10.0 + (self.floor_cm if offset else 0.0)
        return c

    def point(self, p):
        return adsk.core.Point3D.create(*self._coords(p[0], p[1], p[2], True))

    def vector(self, v):
        return adsk.core.Vector3D.create(*self._coords(v[0], v[1], v[2], False))


def _is_ours(occ):
    return occ.component.name.startswith(PREFIX)


def _delete_previous(root):
    old = [root.occurrences.item(i) for i in range(root.occurrences.count)]
    removed = 0
    for occ in old:
        if _is_ours(occ):
            occ.deleteMe()
            removed += 1
    return removed


def _measure_arena(root):
    """Bounding box (cm) of all visible bodies except our own parts."""
    lo = [math.inf] * 3
    hi = [-math.inf] * 3
    bodies = [root.bRepBodies.item(i) for i in range(root.bRepBodies.count)]
    for i in range(root.allOccurrences.count):
        occ = root.allOccurrences.item(i)
        if occ.component.name.startswith(PREFIX):
            continue
        bodies.extend(occ.bRepBodies.item(j) for j in range(occ.bRepBodies.count))
    found = False
    for body in bodies:
        if not body.isVisible:
            continue
        bb = body.boundingBox
        for k, (mn, mx) in enumerate(((bb.minPoint.x, bb.maxPoint.x),
                                      (bb.minPoint.y, bb.maxPoint.y),
                                      (bb.minPoint.z, bb.maxPoint.z))):
            lo[k] = min(lo[k], mn)
            hi[k] = max(hi[k], mx)
        found = True
    return (lo, hi) if found else None


def _build_frame(root):
    """Return (frame, length_mm, width_mm, height_mm, notes)."""
    notes = []
    axis_names = "XYZ"
    box = _measure_arena(root) if AUTO_FIT else None

    if box is None:
        if AUTO_FIT:
            notes.append("No visible bodies found - using default arena size.")
        up_idx = axis_names.index(UP_AXIS) if UP_AXIS in axis_names else 2
        horiz = [k for k in range(3) if k != up_idx]
        frame = ArenaFrame(horiz[0], horiz[1], up_idx, [0.0, 0.0, 0.0], 0.0)
        return frame, ARENA_LENGTH_MM, ARENA_WIDTH_MM, ARENA_HEIGHT_MM, notes

    lo, hi = box
    ext_mm = [(hi[k] - lo[k]) * 10.0 for k in range(3)]
    if UP_AXIS in axis_names:
        up_idx = axis_names.index(UP_AXIS)
    else:
        up_idx = min(range(3), key=lambda k: ext_mm[k])
    horiz = sorted((k for k in range(3) if k != up_idx),
                   key=lambda k: ext_mm[k], reverse=True)
    len_idx, wid_idx = horiz
    length, width, height = ext_mm[len_idx], ext_mm[wid_idx], ext_mm[up_idx]
    if height < 1000.0:
        notes.append("Arena looks flat (%.0f mm tall) - using %.0f mm height "
                     "for sizing." % (height, ARENA_HEIGHT_MM))
        height = ARENA_HEIGHT_MM
    center = [(lo[k] + hi[k]) / 2.0 for k in range(3)]
    notes.append("Measured arena: %.0f x %.0f x %.0f mm (length along %s, "
                 "up = %s)." % (length, width, ext_mm[up_idx],
                                axis_names[len_idx], axis_names[up_idx]))
    return ArenaFrame(len_idx, wid_idx, up_idx, center, lo[up_idx]), \
        length, width, height, notes


def _offset(p, axis, dist):
    return tuple(p[k] + axis[k] * dist for k in range(3))


def _cylinder(tbm, frame, p1, p2, r_mm):
    r = r_mm / 10.0
    return tbm.createCylinderOrCone(frame.point(p1), r, frame.point(p2), r)


def _box(tbm, frame, center, size):
    obb = adsk.core.OrientedBoundingBox3D.create(
        frame.point(center),
        frame.vector((1.0, 0.0, 0.0)), frame.vector((0.0, 1.0, 0.0)),
        size[0] / 10.0, size[1] / 10.0, size[2] / 10.0)
    return tbm.createBox(obb)


def _make_shape(tbm, frame, s):
    if s["type"] == "cylinder":
        return _cylinder(tbm, frame, s["p1"], s["p2"], s["r"])
    if s["type"] in ("torus", "half_torus"):
        body = tbm.createTorus(frame.point(s["center"]), frame.vector(s["axis"]),
                               s["major"] / 10.0, s["minor"] / 10.0)
        if s["type"] == "half_torus":
            # keep only the half above the centre (an arch standing on h = 0)
            reach = 2.0 * (s["major"] + s["minor"]) + 10.0
            c = s["center"]
            keep = _box(tbm, frame, (c[0], c[1], c[2] + reach / 4.0),
                        (reach, reach, reach / 2.0))
            tbm.booleanOperation(body, keep,
                                 adsk.fusion.BooleanTypes.IntersectionBooleanType)
        return body
    if s["type"] == "annulus":
        c, axis, half = s["center"], s["axis"], s["thickness"] / 2.0
        body = _cylinder(tbm, frame, _offset(c, axis, -half),
                         _offset(c, axis, half), s["outer"])
        hole = _cylinder(tbm, frame, _offset(c, axis, -half - 1.0),
                         _offset(c, axis, half + 1.0), s["inner"])
        tbm.booleanOperation(body, hole,
                             adsk.fusion.BooleanTypes.DifferenceBooleanType)
        return body
    if s["type"] == "box":
        return _box(tbm, frame, s["center"], s["size"])
    raise ValueError("unknown shape type %r" % s["type"])


def _find_appearance_library(app):
    libs = app.materialLibraries
    for i in range(libs.count):
        lib = libs.item(i)
        if "Appearance" in lib.name:
            return lib
    return None


def _get_appearance(app, design, rgb):
    """Create (or reuse) a solid-colour appearance. Returns None on failure."""
    name = "%sColor_%d_%d_%d" % (PREFIX, rgb[0], rgb[1], rgb[2])
    existing = design.appearances.itemByName(name)
    if existing:
        return existing
    lib = _find_appearance_library(app)
    if lib is None:
        return None
    base = None
    for wanted in ("Plastic - Glossy", "Paint - Enamel Glossy", "Plastic"):
        for i in range(lib.appearances.count):
            candidate = lib.appearances.item(i)
            if candidate.name.startswith(wanted):
                base = candidate
                break
        if base:
            break
    if base is None:
        return None
    appearance = design.appearances.addByCopy(base, name)
    props = appearance.appearanceProperties
    color_prop = None
    for prop_id in ("opaque_albedo", "generic_diffuse"):
        color_prop = adsk.core.ColorProperty.cast(props.itemById(prop_id))
        if color_prop:
            break
    if color_prop is None:
        for i in range(props.count):
            color_prop = adsk.core.ColorProperty.cast(props.item(i))
            if color_prop:
                break
    if color_prop:
        color_prop.value = adsk.core.Color.create(rgb[0], rgb[1], rgb[2], 0)
    return appearance


def _add_part(app, design, root, frame, part):
    tbm = adsk.fusion.TemporaryBRepManager.get()
    shapes = [_make_shape(tbm, frame, s) for s in part["shapes"]]
    body = shapes[0]
    for tool in shapes[1:]:
        tbm.booleanOperation(body, tool, adsk.fusion.BooleanTypes.UnionBooleanType)

    occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    comp = occ.component
    comp.name = PREFIX + part["name"]

    if design.designType == adsk.fusion.DesignTypes.ParametricDesignType:
        base_feature = comp.features.baseFeatures.add()
        base_feature.startEdit()
        comp.bRepBodies.add(body, base_feature)
        base_feature.finishEdit()
        base_feature.name = part["name"]
        new_body = base_feature.bodies.item(0)
    else:
        new_body = comp.bRepBodies.add(body)
    new_body.name = part["name"]

    try:
        appearance = _get_appearance(app, design, part["color"])
        if appearance:
            new_body.appearance = appearance
    except Exception:
        pass  # colour is cosmetic; never fail the whole run because of it


def run(context):
    app = adsk.core.Application.get()
    ui = app.userInterface
    try:
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox("Open your drone soccer arena design (Design "
                          "workspace) and run this script again.")
            return
        root = design.rootComponent

        removed = _delete_previous(root)
        frame, length, width, height, notes = _build_frame(root)
        parts = compute_layout(length, width, height)
        for part in parts:
            _add_part(app, design, root, frame, part)

        if removed:
            notes.append("Replaced %d parts from a previous run." % removed)
        ui.messageBox("Added %d parts:\n  - %s\n\n%s" % (
            len(parts), "\n  - ".join(p["name"] for p in parts),
            "\n".join(notes)), "Drone Soccer Arena")
    except Exception:
        ui.messageBox("Failed:\n%s" % traceback.format_exc(),
                      "Drone Soccer Arena")
