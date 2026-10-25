# Drone Soccer Arena – obstacles & goal posts (Fusion 360 script)

`DroneSoccerArenaAddons/` is a Fusion 360 Python script that adds to your open
arena design:

| Part | What it is | Where |
|------|------------|-------|
| `DSA_Goal_A` / `DSA_Goal_B` | Vertical ring goal (600 mm opening, 60 mm tube) on a post with a base plate – red and blue team colours | Centre line, 12 % of the arena length in from each end |
| `DSA_Obstacle_1_Pillar` / `DSA_Obstacle_2_Pillar` | Ø400 mm round pillar, 75 % of arena height (orange) | One diagonal, ¼ length and ¼ width from centre |
| `DSA_Obstacle_3_Arch` / `DSA_Obstacle_4_Arch` | Arch gate, 1.5 m wide opening, 60 % of arena height (yellow) | The other diagonal |

The layout is point-symmetric about the arena centre, so both teams face the
same course.

## How to run

1. Open your arena design in Fusion 360.
2. **Utilities → Add-Ins → Scripts and Add-Ins** (or press `Shift+S`).
3. Click **+** next to *My Scripts* and select the `DroneSoccerArenaAddons` folder.
4. Select **DroneSoccerArenaAddons** and click **Run**.

The script measures your arena's bounding box. It takes the smallest dimension
as height and the longer floor side as the length, then sizes and places every
part from that. A message box shows what it measured.

## Changing things

Edit the settings at the top of `DroneSoccerArenaAddons.py` (all in mm):
goal size and height, obstacle sizes, positions and colours. Run the script
again: it deletes the previous `DSA_` components and rebuilds them, so you can
adjust it as often as you like.

If height is detected on the wrong axis, set `UP_AXIS = "Z"` (or `"Y"`).
