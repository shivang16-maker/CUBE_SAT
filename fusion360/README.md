# Drone Soccer Arena – obstacles & goal posts (Fusion 360 script)

`DroneSoccerArenaAddons/` is a Fusion 360 Python script that adds goal rings
and 4 obstacles to your open arena design, sized for **Drone Soccer Class 20**
(20 cm ball-drone, 8 m × 4 m × 3 m arena).

| Part | What it is | Default position (from arena centre) |
|------|------------|--------------------------------------|
| `DSA_Goal_Ring_A` / `_B` | Class 20 goal: 30 cm inner / 50 cm outer diameter, 10 cm thick, centre 1.8 m high, on a stand (red / blue) | Centre line, 1.5 m in from each short side |
| `DSA_Obstacle_1_Ring` | Hoop, 60 cm opening, centre 1.2 m high, on a stand (orange) | 1.2 m toward goal A, 1 m to the side |
| `DSA_Obstacle_2_Half_Gate` | Half-circle arch standing on the floor, 90 cm wide × 45 cm high opening (yellow) | 1.2 m toward goal B, 1 m to the other side |
| `DSA_Obstacle_3_High_Gate` | Raised window, 80 cm wide, opening from 1.5 m to 2.2 m high (green) | 1.2 m toward goal B, 1 m to the side |
| `DSA_Obstacle_4_Two_Poles` | Two Ø5 cm poles, 2.5 m tall, 1 m apart for slalom (purple) | 1.2 m toward goal A, 1 m to the other side |

Every opening faces along the arena length, toward the goals. The centre line
is left clear for the face-off.

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
