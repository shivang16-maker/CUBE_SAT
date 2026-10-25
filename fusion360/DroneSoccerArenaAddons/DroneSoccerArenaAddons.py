"""
Drone Soccer Arena Add-ons -- Fusion 360 script

Adds to the open arena design:
  * 2 goal posts  -- a vertical ring (hoop) on a stand at each end of the arena
  * 4 obstacles   -- 2 round pillars + 2 arch gates, placed point-symmetric
                     about the arena centre so both teams get the same course

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
# values below are only used if the design is empty.
AUTO_FIT = True
ARENA_LENGTH_MM = 12000.0
ARENA_WIDTH_MM = 6000.0
ARENA_HEIGHT_MM = 4000.0

# "auto" picks the smallest dimension of the arena as the vertical one.
# Set to "X", "Y" or "Z" if the auto-detection gets it wrong.
UP_AXIS = "auto"

# Goal: a vertical ring the drone (ball) flies through along the arena length.
GOAL_INNER_DIAMETER_MM = 600.0      # opening of the ring
GOAL_TUBE_DIAMETER_MM = 60.0        # thickness of the ring tube
GOAL_CENTER_HEIGHT_MM = None        # None -> 45 % of arena height
GOAL_DISTANCE_FROM_END_MM = None    # None -> 12 % of arena length
GOAL_POST_DIAMETER_MM = 50.0
GOAL_BASE_DIAMETER_MM = 600.0
BASE_THICKNESS_MM = 20.0

# Obstacles sit at (+/- X_FRACTION * length, +/- Y_FRACTION * width) from the
# arena centre: pillars on one diagonal, arch gates on the other.
OBSTACLE_X_FRACTION = 0.25
OBSTACLE_Y_FRACTION = 0.25

PILLAR_DIAMETER_MM = 400.0
PILLAR_HEIGHT_MM = None             # None -> 75 % of arena height
PILLAR_BASE_DIAMETER_MM = 700.0

ARCH_OPENING_WIDTH_MM = 1500.0      # clear gap between the two arch posts
ARCH_HEIGHT_MM = None               # None -> 60 % of arena height
ARCH_POST_DIAMETER_MM = 100.0
ARCH_BEAM_SIZE_MM = 100.0           # square cross-section of the top beam
ARCH_BASE_DIAMETER_MM = 400.0

# Colours (R, G, B). Team colours for the goals, safety colours for obstacles.
GOAL_COLORS = [(220, 40, 40), (40, 90, 220)]   # -X end, +X end
PILLAR_COLOR = (255, 140, 0)
ARCH_COLOR = (250, 210, 0)

PREFIX = "DSA_"


# --------------------------------------------------------------------------
# Layout (pure maths, arena coordinates in mm)
#   a = along the arena length, b = across the width, h = height above floor,
#   origin at the centre of the arena floor.
# --------------------------------------------------------------------------

def _or_default(value, default):
    return default if value is None else value


def compute_layout(length, width, height):
    """Return a list of parts: {name, color, shapes:[...]} in arena mm."""
    parts = []

    # ---- Goals -----------------------------------------------------------
    tube_r = GOAL_TUBE_DIAMETER_MM / 2.0
    ring_major = GOAL_INNER_DIAMETER_MM / 2.0 + tube_r
    ring_outer = ring_major + tube_r
    center_h = _or_default(GOAL_CENTER_HEIGHT_MM, 0.45 * height)
    # keep the ring above the base and below the roof
    center_h = max(center_h, ring_outer + BASE_THICKNESS_MM + 100.0)
    center_h = min(center_h, max(height - ring_outer - 50.0, ring_outer))
    goal_dist = _or_default(GOAL_DISTANCE_FROM_END_MM, 0.12 * length)
    goal_dist = max(goal_dist, GOAL_BASE_DIAMETER_MM / 2.0)

    for i, side in enumerate((-1, 1)):
        a = side * (length / 2.0 - goal_dist)
        parts.append({
            "name": "Goal_%s" % ("A" if side < 0 else "B"),
            "color": GOAL_COLORS[i],
            "shapes": [
                {"type": "torus", "center": (a, 0.0, center_h),
                 "axis": (1.0, 0.0, 0.0), "major": ring_major, "minor": tube_r},
                {"type": "cylinder", "p1": (a, 0.0, 0.0),
                 "p2": (a, 0.0, center_h - ring_major),
                 "r": GOAL_POST_DIAMETER_MM / 2.0},
                {"type": "cylinder", "p1": (a, 0.0, 0.0),
                 "p2": (a, 0.0, BASE_THICKNESS_MM),
                 "r": GOAL_BASE_DIAMETER_MM / 2.0},
            ],
        })

    # ---- Obstacles -------------------------------------------------------
    oa = OBSTACLE_X_FRACTION * length
    ob = OBSTACLE_Y_FRACTION * width

    pillar_h = min(_or_default(PILLAR_HEIGHT_MM, 0.75 * height), height)
    for n, (sa, sb) in enumerate(((1, 1), (-1, -1)), start=1):
        a, b = sa * oa, sb * ob
        parts.append({
            "name": "Obstacle_%d_Pillar" % n,
            "color": PILLAR_COLOR,
            "shapes": [
                {"type": "cylinder", "p1": (a, b, 0.0), "p2": (a, b, pillar_h),
                 "r": PILLAR_DIAMETER_MM / 2.0},
                {"type": "cylinder", "p1": (a, b, 0.0),
                 "p2": (a, b, BASE_THICKNESS_MM),
                 "r": PILLAR_BASE_DIAMETER_MM / 2.0},
            ],
        })

    arch_h = min(_or_default(ARCH_HEIGHT_MM, 0.60 * height),
                 height - ARCH_BEAM_SIZE_MM)
    post_r = ARCH_POST_DIAMETER_MM / 2.0
    # opening must fit between the arena centre line and the side wall
    max_opening = max(ob * 2.0 - 2.0 * ARCH_BASE_DIAMETER_MM, 300.0)
    opening = min(ARCH_OPENING_WIDTH_MM, max_opening)
    half_span = opening / 2.0 + post_r          # centre line of each post
    for n, (sa, sb) in enumerate(((1, -1), (-1, 1)), start=3):
        a, b = sa * oa, sb * ob
        shapes = []
        for pb in (b - half_span, b + half_span):
            shapes.append({"type": "cylinder", "p1": (a, pb, 0.0),
                           "p2": (a, pb, arch_h + ARCH_BEAM_SIZE_MM / 2.0),
                           "r": post_r})
            shapes.append({"type": "cylinder", "p1": (a, pb, 0.0),
                           "p2": (a, pb, BASE_THICKNESS_MM),
                           "r": ARCH_BASE_DIAMETER_MM / 2.0})
        shapes.append({"type": "box", "center": (a, b, arch_h),
                       "size_b": 2.0 * half_span + ARCH_POST_DIAMETER_MM,
                       "size_a": ARCH_BEAM_SIZE_MM,
                       "size_h": ARCH_BEAM_SIZE_MM})
        parts.append({"name": "Obstacle_%d_Arch" % n, "color": ARCH_COLOR,
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


def _make_shape(tbm, frame, s):
    if s["type"] == "cylinder":
        r = s["r"] / 10.0
        return tbm.createCylinderOrCone(frame.point(s["p1"]), r,
                                        frame.point(s["p2"]), r)
    if s["type"] == "torus":
        return tbm.createTorus(frame.point(s["center"]), frame.vector(s["axis"]),
                               s["major"] / 10.0, s["minor"] / 10.0)
    if s["type"] == "box":
        obb = adsk.core.OrientedBoundingBox3D.create(
            frame.point(s["center"]),
            frame.vector((0.0, 1.0, 0.0)),      # long side across the width
            frame.vector((1.0, 0.0, 0.0)),
            s["size_b"] / 10.0, s["size_a"] / 10.0, s["size_h"] / 10.0)
        return tbm.createBox(obb)
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
