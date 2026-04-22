"""Detection class registry — single source of truth for class ids, labels, and colours.

The Next.js app consumes `color` directly for annotation overlays; keep this stable.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class ClassSpec:
    id: str
    label: str
    color: str
    lahr_fields: tuple[str, ...] = ()


# ---- Floor-plan classes (YOLOv8-seg trained on CubiCasa5K + FloorPlanCAD) ----
FLOORPLAN_CLASSES: dict[str, ClassSpec] = {
    "living_room": ClassSpec("living_room", "Living room", "#6366f1", ("access_living_room", "door_width_living_room")),
    "kitchen":     ClassSpec("kitchen", "Kitchen", "#f59e0b", ("access_kitchen", "door_width_kitchen", "kitchen_turning_150x150")),
    "bathroom":    ClassSpec("bathroom", "Bathroom", "#06b6d4", ("access_bathroom_no_toilet", "door_width_bathroom", "bathroom_turning_150x150")),
    "wc":          ClassSpec("wc", "WC / toilet", "#14b8a6", ("access_separate_toilet", "toilet_dim_width", "toilet_dim_depth")),
    "bedroom":     ClassSpec("bedroom", "Bedroom", "#8b5cf6", ("access_bed1", "access_bed2", "door_width_bed1")),
    "hallway":     ClassSpec("hallway", "Hallway", "#64748b", ("hallway_width_head_on_cm", "hallway_width_turn_cm")),
    "stairs":      ClassSpec("stairs", "Stairs", "#ef4444", ("has_internal_stairs", "stair_width_cm", "internal_steps_count")),
    "lift":        ClassSpec("lift", "Lift", "#10b981", ("has_communal_lift", "communal_lift_dim_width", "communal_lift_dim_depth")),
    "door":        ClassSpec("door", "Door", "#3b82f6", ()),
    "window":      ClassSpec("window", "Window", "#0ea5e9", ()),
    "external_door": ClassSpec("external_door", "External door", "#2563eb", ("property_door_opening_width",)),
}

# ---- Photo fixture classes (YOLOv8 trained on Open Images + ADE20K + Roboflow Universe) ----
PHOTO_CLASSES: dict[str, ClassSpec] = {
    "grab_rail":           ClassSpec("grab_rail", "Grab rail", "#22c55e"),
    "handrail":            ClassSpec("handrail", "Handrail", "#84cc16", ("stair_70cm_clearance",)),
    "stairlift":           ClassSpec("stairlift", "Stair lift", "#a855f7", ("has_stair_lift",)),
    "through_floor_lift":  ClassSpec("through_floor_lift", "Through-floor lift", "#7c3aed", ("has_through_floor_lift",)),
    "level_access_shower": ClassSpec("level_access_shower", "Level-access shower", "#06b6d4", ("bathroom_has_level_access_shower",)),
    "shower_over_bath":    ClassSpec("shower_over_bath", "Shower over bath", "#0891b2"),
    "bathtub":             ClassSpec("bathtub", "Bathtub", "#0ea5e9"),
    "wc":                  ClassSpec("wc", "WC / toilet", "#14b8a6"),
    "basin":               ClassSpec("basin", "Basin", "#38bdf8"),
    "ramp":                ClassSpec("ramp", "Ramp", "#f97316", ("has_property_ramp",)),
    "threshold_step":      ClassSpec("threshold_step", "Threshold step", "#dc2626", ("property_door_threshold_height",)),
}


def color_of(kind: str, class_id: str) -> str:
    table = FLOORPLAN_CLASSES if kind == "floor_plan" else PHOTO_CLASSES
    spec = table.get(class_id)
    return spec.color if spec else "#9ca3af"
