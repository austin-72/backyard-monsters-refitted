"""The Brimstone Pit (Inferno casino building), level 1: modelled and rendered with Blender (bpy).

    python3 pit.py <pass> [state] [out]      pass: top | shadow | anim | anim2 | preview
                                             state: normal | damaged | destroyed

Scale and camera match the game's yard: 1 Blender unit = 10 grid units; the footprint is 90 x 90 grid units
(9 x 9 BU) centred on the world origin; the camera is the game's 2:1 isometric view (elevation 30 degrees,
looking from +X +Y; the game's grid is the mirror image of Blender's axes, which does not matter for art). One grid
unit along x is (1, 0.5) screen pixels, so a BU is 14.142 px across at game size; renders are made at
SS times that and scaled down.
"""
import math, os, random, sys, json
import bpy, bmesh
from mathutils import Vector, Euler, Matrix
from bpy_extras.object_utils import world_to_camera_view

SS = 3                      # supersampling: rendered at SS x game size, scaled down after
PX_PER_BU = 14.142 * SS
RES = (720, 660)            # render size at SS (240 x 220 at game size)
LOOK = Vector((0, 0, 1.6))  # the point the camera centres on
FRAMES = 60    # anim: the lava trough, the door glow, the skull's eyes
FRAMES2 = 80   # anim2: the dice bouncing in their bubble (once a loop)
# (both made for one frame every 3 game frames, 13.3 a second, as the Monster Lab plays its own:
#  4.5 s for the lava's loop, 6 s for the dice's)

PASS = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else (sys.argv[1] if len(sys.argv) > 1 else "preview")
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
PASS = ARGS[0] if ARGS else "preview"
STATE = ARGS[1] if len(ARGS) > 1 else "normal"
OUT = ARGS[2] if len(ARGS) > 2 else f"/tmp/pit-{PASS}-{STATE}"
SAMPLES = int(os.environ.get("SAMPLES", "64"))

rng = random.Random(1411)

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
try:
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception:
    pass
scene.cycles.max_bounces = 6
scene.render.film_transparent = True
scene.cycles.film_transparent_glass = True   # (the ground shows through the bubble)
scene.cycles.seed = 0
scene.render.resolution_x, scene.render.resolution_y = RES
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.25
scene.render.threads_mode = "AUTO"

world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.16, 0.11, 0.10, 1)   # dim, warm cavern ambient
bg.inputs[1].default_value = 1.0

# ------------------------------------------------------------------ materials
def mat(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    shader = build(nt)
    nt.links.new(shader.outputs[0], out.inputs[0])
    return m

def principled(nt, color, rough, metal=0.0, spec=0.5):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    try:
        p.inputs["Specular IOR Level"].default_value = spec
    except KeyError:
        pass
    return p

def noise(nt, scale, detail=6, rough=0.6, coord="Object"):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    nt.links.new(tc.outputs[coord], n.inputs["Vector"])
    return n

def bump(nt, height_socket, strength):
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = strength
    nt.links.new(height_socket, b.inputs["Height"])
    return b

def ramp(nt, stops):
    r = nt.nodes.new("ShaderNodeValToRGB")
    cr = r.color_ramp
    cr.elements[0].position, cr.elements[0].color = stops[0][0], (*stops[0][1], 1)
    cr.elements[1].position, cr.elements[1].color = stops[-1][0], (*stops[-1][1], 1)
    for pos, col in stops[1:-1]:
        e = cr.elements.new(pos)
        e.color = (*col, 1)
    return r

DAMAGED = STATE == "damaged"
DESTROYED = STATE == "destroyed"
GLOW = 0.0 if (DAMAGED or DESTROYED) else 1.0

def basalt_blocks(nt):
    """Stacked basalt blocks (a brick pattern for the joints), rough, with a hot glow near the ground."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.inputs["Scale"].default_value = 0.8
    brick.inputs["Mortar Size"].default_value = 0.04
    brick.inputs["Mortar Smooth"].default_value = 0.3
    brick.inputs["Brick Width"].default_value = 1.35
    brick.inputs["Row Height"].default_value = 0.62
    brick.inputs["Bias"].default_value = 0.2
    brick.inputs["Color1"].default_value = (0.17, 0.165, 0.18, 1)
    brick.inputs["Color2"].default_value = (0.11, 0.105, 0.12, 1)
    brick.inputs["Mortar"].default_value = (0.012, 0.008, 0.008, 1)
    brick.offset = 0.5
    # the brick texture wraps round the walls: object coordinates, x + y along, z up
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "ADD"
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs[0], add.inputs[0]); nt.links.new(sep.outputs[1], add.inputs[1])
    nt.links.new(add.outputs[0], comb.inputs[0]); nt.links.new(sep.outputs[2], comb.inputs[1])
    nt.links.new(comb.outputs[0], brick.inputs["Vector"])
    n = noise(nt, 6.0, 8, 0.65)
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.55
    nt.links.new(brick.outputs["Color"], mix.inputs[6])
    nt.links.new(n.outputs["Color"], mix.inputs[7])
    p = principled(nt, (0.06, 0.055, 0.06), 0.82)
    base_col = mix.outputs[2]
    if DAMAGED or DESTROYED:
        # cracks (voronoi edges) and soot patches blacken the blocks
        v = nt.nodes.new("ShaderNodeTexVoronoi"); v.feature = "DISTANCE_TO_EDGE"
        v.inputs["Scale"].default_value = 1.6
        wn = noise(nt, 2.0, 4, 0.5)
        mv = nt.nodes.new("ShaderNodeMix"); mv.data_type = "VECTOR"; mv.inputs["Factor"].default_value = 0.4
        nt.links.new(tc.outputs["Object"], mv.inputs[4]); nt.links.new(wn.outputs["Color"], mv.inputs[5])
        nt.links.new(mv.outputs[1], v.inputs["Vector"])
        cr = ramp(nt, [(0.0, (0.02, 0.015, 0.015)), (0.03, (1, 1, 1))])
        nt.links.new(v.outputs["Distance"], cr.inputs[0])
        soot = noise(nt, 1.3, 5, 0.6)
        sr = ramp(nt, [(0.45, (0.25, 0.22, 0.22)), (0.62, (1, 1, 1))])
        nt.links.new(soot.outputs["Fac"], sr.inputs[0])
        m1 = nt.nodes.new("ShaderNodeMix"); m1.data_type = "RGBA"; m1.blend_type = "MULTIPLY"; m1.inputs["Factor"].default_value = 1.0
        nt.links.new(base_col, m1.inputs[6]); nt.links.new(cr.outputs["Color"], m1.inputs[7])
        m2 = nt.nodes.new("ShaderNodeMix"); m2.data_type = "RGBA"; m2.blend_type = "MULTIPLY"; m2.inputs["Factor"].default_value = 1.0
        nt.links.new(m1.outputs[2], m2.inputs[6]); nt.links.new(sr.outputs["Color"], m2.inputs[7])
        base_col = m2.outputs[2]
    nt.links.new(base_col, p.inputs["Base Color"])
    hb = nt.nodes.new("ShaderNodeMath"); hb.operation = "ADD"
    nt.links.new(brick.outputs["Fac"], hb.inputs[0]); nt.links.new(n.outputs["Fac"], hb.inputs[1])
    b = bump(nt, hb.outputs[0], 0.6)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    # glowing mortar near the bottom (the heat under the Pit)
    zr = ramp(nt, [(0.0, (1, 1, 1)), (0.22, (0, 0, 0))])
    zs = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], zs.inputs[0])
    nt.links.new(zs.outputs[2], zr.inputs[0])
    mort = nt.nodes.new("ShaderNodeMath"); mort.operation = "LESS_THAN"; mort.inputs[1].default_value = 0.5
    nt.links.new(brick.outputs["Fac"], mort.inputs[0])
    inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    nt.links.new(mort.outputs[0], inv.inputs[1])
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = "MULTIPLY"
    nt.links.new(zr.outputs["Color"], m1.inputs[0]); nt.links.new(inv.outputs[0], m1.inputs[1])
    em = nt.nodes.new("ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = 3.0 * (0.25 if DAMAGED else (0.05 if DESTROYED else 1.0))
    nt.links.new(m1.outputs[0], em.inputs[0])
    p.inputs["Emission Color"].default_value = (1.0, 0.32, 0.04, 1)
    nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    return p

def basalt_rock(nt, glow_cracks=0.0):
    """Rough dark basalt; optional glowing lava cracks (voronoi edges)."""
    n = noise(nt, 3.0, 10, 0.7)
    col = ramp(nt, [(0.3, (0.035, 0.03, 0.032)), (0.7, (0.11, 0.1, 0.1))])
    nt.links.new(n.outputs["Fac"], col.inputs[0])
    p = principled(nt, (0.05, 0.045, 0.05), 0.88)
    nt.links.new(col.outputs["Color"], p.inputs["Base Color"])
    n2 = noise(nt, 12.0, 8, 0.7)
    b = bump(nt, n2.outputs["Fac"], 0.45)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    if glow_cracks > 0:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        v = nt.nodes.new("ShaderNodeTexVoronoi")
        v.feature = "DISTANCE_TO_EDGE"
        v.inputs["Scale"].default_value = 0.55
        wn = noise(nt, 1.5, 4, 0.5)
        mixv = nt.nodes.new("ShaderNodeMix"); mixv.data_type = "VECTOR"
        mixv.inputs["Factor"].default_value = 0.35
        nt.links.new(tc.outputs["Object"], mixv.inputs[4]); nt.links.new(wn.outputs["Color"], mixv.inputs[5])
        nt.links.new(mixv.outputs[1], v.inputs["Vector"])
        r = ramp(nt, [(0.0, (1, 1, 1)), (0.018, (0, 0, 0))])
        nt.links.new(v.outputs["Distance"], r.inputs[0])
        # only some of the cracks glow
        mask = noise(nt, 0.9, 2, 0.5)
        mr = ramp(nt, [(0.5, (0, 0, 0)), (0.6, (1, 1, 1))])
        nt.links.new(mask.outputs["Fac"], mr.inputs[0])
        mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY"
        nt.links.new(r.outputs["Color"], mm.inputs[0]); nt.links.new(mr.outputs["Color"], mm.inputs[1])
        r = type("R", (), {"outputs": {"Color": mm.outputs[0]}})()
        em = nt.nodes.new("ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = glow_cracks
        nt.links.new(r.outputs["Color"], em.inputs[0])
        p.inputs["Emission Color"].default_value = (1.0, 0.3, 0.03, 1)
        nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    return p

def obsidian(nt):
    p = principled(nt, (0.012, 0.010, 0.016), 0.16, spec=0.8)
    try:
        p.inputs["Coat Weight"].default_value = 0.4
        p.inputs["Coat Roughness"].default_value = 0.05
    except KeyError:
        pass
    n = noise(nt, 4.0, 4, 0.5)
    b = bump(nt, n.outputs["Fac"], 0.15)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    return p

def bone(nt):
    n = noise(nt, 9.0, 6, 0.6)
    col = ramp(nt, [(0.35, (0.62, 0.58, 0.47)), (0.75, (0.9, 0.87, 0.78))])
    nt.links.new(n.outputs["Fac"], col.inputs[0])
    p = principled(nt, (0.8, 0.75, 0.62), 0.55)
    nt.links.new(col.outputs["Color"], p.inputs["Base Color"])
    try:
        p.inputs["Subsurface Weight"].default_value = 0.08
    except KeyError:
        pass
    b = bump(nt, n.outputs["Fac"], 0.2)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    return p

def gold(nt):
    # (a little glow of its own: in a dark place, a metal reflects nothing and goes black)
    p = principled(nt, (1.0, 0.7, 0.25), 0.3, metal=0.7)
    p.inputs["Emission Color"].default_value = (1.0, 0.62, 0.18, 1)
    p.inputs["Emission Strength"].default_value = 0.6
    return p

LAVA_MAPPINGS = []

def lava(nt, strength=9.0):
    """Molten lava: crusted dark patches over bright flowing orange, emissive. Its texture moves in a circle
    over the 31 frames (see set_frame), so the loop joins up."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    LAVA_MAPPINGS.append(mp)
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 2.2
    n.inputs["Detail"].default_value = 8
    n.inputs["Roughness"].default_value = 0.62
    n.inputs["Distortion"].default_value = 0.8
    nt.links.new(mp.outputs[0], n.inputs["Vector"])
    col = ramp(nt, [(0.34, (0.05, 0.012, 0.005)), (0.46, (0.55, 0.06, 0.0)), (0.56, (1.0, 0.33, 0.02)), (0.7, (1.0, 0.78, 0.25))])
    nt.links.new(n.outputs["Fac"], col.inputs[0])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Strength"].default_value = strength
    nt.links.new(col.outputs["Color"], e.inputs["Color"])
    # the crust is not glowing: mix with a rough dark surface where the ramp is dark
    p = principled(nt, (0.03, 0.02, 0.02), 0.7)
    fac = ramp(nt, [(0.38, (0, 0, 0)), (0.5, (1, 1, 1))])
    nt.links.new(n.outputs["Fac"], fac.inputs[0])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fac.outputs["Color"], mix.inputs[0])
    nt.links.new(p.outputs[0], mix.inputs[1])
    nt.links.new(e.outputs[0], mix.inputs[2])
    return mix

PIP_EMISSION = []

def pip(nt):
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (1.0, 0.42, 0.06, 1)
    e.inputs["Strength"].default_value = 14.0 * GLOW
    PIP_EMISSION.append(e)
    if GLOW == 0:
        return principled(nt, (0.03, 0.02, 0.02), 0.6)
    return e

EYE_EMISSION = []

def eye(nt):
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (1.0, 0.42, 0.06, 1)
    e.inputs["Strength"].default_value = 14.0 * GLOW
    EYE_EMISSION.append(e)
    if GLOW == 0:
        return principled(nt, (0.03, 0.02, 0.02), 0.6)
    return e

def glass(nt):
    """The bubble: a thin shell of clear, faintly warm glass."""
    p = principled(nt, (1.0, 0.94, 0.86), 0.02, spec=0.6)
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["IOR"].default_value = 1.25
    return p

DOOR_EMISSION = []

def door_glow(nt):
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (1.0, 0.36, 0.05, 1)
    e.inputs["Strength"].default_value = 5.0 if GLOW else 0.35
    DOOR_EMISSION.append(e)
    return e

M = {
    "blocks": mat("blocks", basalt_blocks),
    "rock": mat("rock", lambda nt: basalt_rock(nt, 4.0 * (0.3 if DAMAGED else (0.1 if DESTROYED else 1.0)))),
    "rockplain": mat("rockplain", lambda nt: basalt_rock(nt, 0.0)),
    "obsidian": mat("obsidian", obsidian),
    "bone": mat("bone", bone),
    "gold": mat("gold", gold),
    "lava": mat("lava", lambda nt: lava(nt, 4.5 if not DESTROYED else 1.5)),
    "pip": mat("pip", pip),
    "eye": mat("eye", eye),
    "glass": mat("glass", glass),
    "door": mat("door", door_glow),
}

# ------------------------------------------------------------------ modelling helpers
coll = scene.collection

def link(ob):
    coll.objects.link(ob)
    return ob

def mesh_obj(name, bm, material, loc=(0, 0, 0), rot=(0, 0, 0), smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = rot
    ob.data.materials.append(material)
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = True
    return link(ob)

def bevel(ob, width, segs=2):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segs
    m.limit_method = "ANGLE"
    return m

def displace(ob, strength, scale=1.0, seed=0):
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.levels = sub.render_levels = 3
    tex = bpy.data.textures.new(f"d{seed}", "CLOUDS")
    tex.noise_scale = scale
    tex.noise_depth = 2
    d = ob.modifiers.new("disp", "DISPLACE")
    d.texture = tex
    d.strength = strength
    d.mid_level = 0.5
    d.texture_coords = "OBJECT"
    return d

def frustum(name, bottom, top, height, material, loc, rot=(0, 0, 0)):
    """A box whose top is smaller than its bottom (bottom, top: (x, y) half sizes)."""
    bm = bmesh.new()
    bx, by = bottom
    tx, ty = top
    vs = [bm.verts.new(v) for v in [(-bx, -by, 0), (bx, -by, 0), (bx, by, 0), (-bx, by, 0),
                                     (-tx, -ty, height), (tx, -ty, height), (tx, ty, height), (-tx, ty, height)]]
    for f in [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, material, loc, rot)

def box(name, size, material, loc, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    return mesh_obj(name, bm, material, loc, rot)

def shard(name, r, h, material, loc, rot, sides=4):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=sides, radius1=r, radius2=0.0, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    # a little irregular
    for v in bm.verts:
        if v.co.z < h * 0.9:
            v.co.x += rng.uniform(-0.12, 0.12) * r
            v.co.y += rng.uniform(-0.12, 0.12) * r
    return mesh_obj(name, bm, material, loc, rot)

def sphere(name, r, material, loc, segs=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(8, segs // 2), radius=r)
    return mesh_obj(name, bm, material, loc, smooth=True)

def cylinder(name, r, h, material, loc, rot=(0, 0, 0), segs=24):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    return mesh_obj(name, bm, material, loc, rot, smooth=False)

def tusk(name, pts, radius, material):
    """A curved bone/horn along pts (x, y, z, radius factor)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.resolution_u = 12
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p[:3]
        bp.radius = p[3]
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(material)
    return link(ob)

def boolean_diff(target, cutter):
    m = target.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = cutter
    m.solver = "EXACT"
    cutter.hide_render = True
    cutter.hide_viewport = True
    return m

ANIMATED = []     # objects that change from frame to frame (the anim strip)
BUBBLES = []      # (object, phase, size)

# ------------------------------------------------------------------ the Pit, level 1
# footprint: 9 x 9 BU centred on the origin. Front faces: +X (lower left on screen) and +Y (lower right).
HUT_C = Vector((-0.55, -0.55, 0))

def rock_slab(name, radius, height, material, loc, sides=11, jitter=0.18, seed=0):
    """An irregular slab of rock: a many-sided prism, its corners pushed in and out, the top a little lower
    at the edge."""
    r2 = random.Random(seed)
    bm = bmesh.new()
    bot, top = [], []
    for i in range(sides):
        a = i / sides * 2 * math.pi + r2.uniform(-0.12, 0.12)
        r = radius * (1 + r2.uniform(-jitter, jitter))
        bot.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0)))
        top.append(bm.verts.new((math.cos(a) * r * 0.93, math.sin(a) * r * 0.93, height * r2.uniform(0.8, 1.0))))
    bm.faces.new(list(reversed(bot)))
    bm.faces.new(top)
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new([bot[i], bot[j], top[j], top[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, material, loc)

def build_platform():
    p = rock_slab("platform", 4.05, 0.42, M["rock"], (0, 0, 0), sides=12, jitter=0.1, seed=3)
    p.rotation_euler = (0, 0, math.radians(15))
    bevel(p, 0.1, 2)
    displace(p, 0.2, 0.45, 1)
    # a step down in front of the door (+Y face)
    s = rock_slab("step", 0.85, 0.24, M["rock"], (HUT_C.x - 0.2, 3.85, 0), sides=7, jitter=0.2, seed=5)
    s.scale = (1.3, 0.8, 1)
    bevel(s, 0.05, 2)
    displace(s, 0.08, 0.5, 2)

def build_hut():
    base_z = 0.42
    body = frustum("hut", (2.55, 2.55), (2.15, 2.15), 2.55, M["blocks"], (HUT_C.x, HUT_C.y, base_z))
    bevel(body, 0.07, 2)
    # the doorway, on the +Y face: an arch (box + cylinder) cut into the wall
    cut_box = box("doorcut", (1.3, 1.6, 1.35), M["rockplain"], (HUT_C.x - 0.2, HUT_C.y + 2.45, base_z + 0.67))
    cut_arc = cylinder("doorarc", 0.65, 1.6, M["rockplain"], (HUT_C.x - 0.2, HUT_C.y + 2.45, base_z + 1.345), rot=(math.pi / 2, 0, 0))
    boolean_diff(body, cut_box)
    boolean_diff(body, cut_arc)
    # glowing interior seen through the door
    glow = box("doorglow", (1.3, 0.1, 2.0), M["door"], (HUT_C.x - 0.2, HUT_C.y + 1.95, base_z + 1.0))
    ANIMATED.append(glow)
    # a light inside, spilling out of the door onto the step
    li = bpy.data.lights.new("doorlight", "POINT")
    li.energy = 60 if GLOW else 3
    li.color = (1.0, 0.45, 0.12)
    li.shadow_soft_size = 0.3
    lo = bpy.data.objects.new("doorlight", li)
    lo.location = (HUT_C.x - 0.2, HUT_C.y + 2.35, base_z + 0.8)
    link(lo)
    # obsidian band round the top, and a roof slab
    top_z = base_z + 2.55
    band = frustum("band", (2.32, 2.32), (2.36, 2.36), 0.34, M["obsidian"], (HUT_C.x, HUT_C.y, top_z - 0.12))
    bevel(band, 0.05, 2)
    roof = frustum("roof", (2.1, 2.1), (1.85, 1.85), 0.3, M["rockplain"], (HUT_C.x, HUT_C.y, top_z + 0.2))
    bevel(roof, 0.08, 2)
    # a crown of obsidian shards round the roof edge, taller at the back
    for i in range(22):
        a = i / 22 * 2 * math.pi + rng.uniform(-0.08, 0.08)
        edge = 2.05
        x = HUT_C.x + max(-edge, min(edge, math.cos(a) * edge * 1.35))
        y = HUT_C.y + max(-edge, min(edge, math.sin(a) * edge * 1.35))
        back = 1.0 - 0.5 * (math.cos(a - math.radians(225)) * 0.5 + 0.5)  # 1 at the back, 0.5 at the front
        front_corner = math.cos(a - math.radians(45)) > 0.75
        if front_corner:
            continue  # the sign stands there
        h = rng.uniform(0.55, 1.05) * (0.55 + 0.75 * (1 - back) if False else 0.6 + 0.9 * (1.0 - (1.0 - back)))
        tilt = 0.35
        rot = (-math.sin(a) * tilt * rng.uniform(0.6, 1.2), math.cos(a) * tilt * rng.uniform(0.6, 1.2), rng.uniform(0, 3))
        sh = shard(f"shard{i}", rng.uniform(0.22, 0.36), h, M["obsidian"], (x, y, top_z + 0.22), rot)
        if DAMAGED and rng.random() < 0.35:
            sh.rotation_euler = (rot[0] * 3, rot[1] * 3, rot[2])
            sh.scale = (1, 1, 0.55)
    # obsidian crystal clusters at the two side corners, above the roof line
    for (sx, sy) in ((1, -1), (-1, 1), (-1, -1)):
        bx, by = HUT_C.x + sx * 2.35, HUT_C.y + sy * 2.35
        for k in range(4):
            h = rng.uniform(1.6, 3.4) if k == 0 else rng.uniform(0.9, 2.2)
            ox, oy = rng.uniform(-0.35, 0.35), rng.uniform(-0.35, 0.35)
            shard(f"pillar{sx}{sy}{k}", rng.uniform(0.3, 0.45), h, M["obsidian"], (bx + ox, by + oy, base_z + (1.2 if k == 0 else 0.6) * (0 if k else 1)),
                  (sy * rng.uniform(0.05, 0.25), -sx * rng.uniform(0.05, 0.25), rng.uniform(0, 3)), sides=5)
    # a skull over the door, eyes glowing
    skz = base_z + 2.62
    sky = HUT_C.y + 2.3
    sk = sphere("skull", 0.3, M["bone"], (HUT_C.x - 0.2, sky, skz), segs=16)
    sk.scale = (1.0, 0.85, 0.95)
    jaw = box("jaw", (0.34, 0.24, 0.16), M["bone"], (HUT_C.x - 0.2, sky + 0.08, skz - 0.25))
    bevel(jaw, 0.04, 2)
    for ex in (-0.11, 0.11):
        e = sphere(f"eye{ex}", 0.07, M["eye"], (HUT_C.x - 0.2 + ex, sky + 0.23, skz + 0.02), segs=10)
        ANIMATED.append(e)
    # bone tusks framing the door
    for side in (-1, 1):
        dx = HUT_C.x - 0.2 + side * 0.9
        yf = HUT_C.y + 2.62
        tusk(f"tusk{side}", [(dx, yf, base_z + 0.05, 1.0), (dx + side * 0.2, yf + 0.3, base_z + 1.0, 0.85),
                             (dx + side * 0.05, yf + 0.4, base_z + 1.8, 0.6), (dx - side * 0.35, yf + 0.2, base_z + 2.3, 0.15)],
             0.15, M["bone"])

def die(name, size, loc, rot, pips_glow=True):
    """A bone die with sunken glowing pips (standard faces: 1 opposite 6, 2 opposite 5, 3 opposite 4)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=size)
    ob = mesh_obj(name, bm, M["bone"], loc, rot)
    bevel(ob, size * 0.16, 4)
    pr = size * 0.085
    h = size / 2
    q = size * 0.26
    layouts = {1: [(0, 0)], 2: [(-q, -q), (q, q)], 3: [(-q, -q), (0, 0), (q, q)],
               4: [(-q, -q), (-q, q), (q, -q), (q, q)], 5: [(-q, -q), (-q, q), (0, 0), (q, -q), (q, q)],
               6: [(-q, -q), (-q, 0), (-q, q), (q, -q), (q, 0), (q, q)]}
    faces = {5: (Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0))),    # top
             2: (Vector((0, 0, -1)), Vector((1, 0, 0)), Vector((0, 1, 0))),
             3: (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),
             4: (Vector((-1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),
             6: (Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))),
             1: (Vector((0, -1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)))}
    pips = []
    for value, (nrm, u, v) in faces.items():
        for (a, b) in layouts[value]:
            p = sphere(f"{name}pip{value}{a}{b}", pr, M["pip"], (0, 0, 0), segs=10)
            p.parent = ob
            p.location = nrm * (h - pr * 0.35) + u * a + v * b
            p.scale = (1, 1, 1)
            pips.append(p)
    return ob, pips

DICE = []      # (object, rest location, rest rotation (quaternion), size)
DOME = []      # the bubble, its collar and light, the dice and their pips: the anim2 layer

def torus(name, R, r, material, loc):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=12, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob

def build_sign():
    """The Pit's sign: a pair of big bone dice with glowing pips in a big glass bubble on a gold collar,
    on the roof towards the front. Now and then they pop up and tumble (set_frame2)."""
    roof_z = 0.42 + 2.55 + 0.5
    bc = Vector((HUT_C.x + 0.3, HUT_C.y + 0.3, roof_z))
    R = 1.6
    if DESTROYED:
        return
    col = torus("collar", R - 0.02, 0.13, M["gold"], (bc.x, bc.y, roof_z + 0.08))
    DOME.append(col)
    if not DAMAGED:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=R, segments=48, ring_count=24, location=(bc.x, bc.y, roof_z + 0.45))
        bub = bpy.context.active_object
        bub.name = "bubble"
        bub.data.materials.append(M["glass"])
        for p in bub.data.polygons:
            p.use_smooth = True
        sol = bub.modifiers.new("shell", "SOLIDIFY")
        sol.thickness = 0.03
        # (cut at the roof: nothing below the collar)
        cut = box("bubblecut", (4, 4, 2), M["rockplain"], (bc.x, bc.y, roof_z + 0.08 - 1.0))
        boolean_diff(bub, cut)
        DOME.append(bub)
        li = bpy.data.lights.new("bubblelight", "POINT")
        li.energy = 8
        li.color = (1.0, 0.55, 0.2)
        li.shadow_soft_size = 0.4
        lo = bpy.data.objects.new("bubblelight", li)
        lo.location = (bc.x, bc.y, roof_z + 1.6)
        lo.visible_glossy = False   # (no bright spot of it reflected in the glass)
        link(lo)
        for name, size, off, rz in (("signdie", 1.0, (-0.45, 0.4), 20), ("signdie2", 0.88, (0.5, -0.35), -35)):
            loc = Vector((bc.x + off[0], bc.y + off[1], roof_z + size / 2 + 0.01))
            rot = Euler((0, 0, math.radians(rz)))
            d, pips = die(name, size, loc, rot)
            DICE.append((d, loc.copy(), rot.to_quaternion(), size))
            DOME.append(d)
            DOME.extend(pips)
    else:
        # the bubble shattered: jagged glass round the collar, one die tipped inside, one over the side
        for i in range(9):
            a = i / 9 * 2 * math.pi + rng.uniform(-0.1, 0.1)
            shard(f"glass{i}", rng.uniform(0.18, 0.3), rng.uniform(0.35, 0.8), M["glass"],
                  (bc.x + math.cos(a) * (R - 0.05), bc.y + math.sin(a) * (R - 0.05), roof_z + 0.1),
                  (-math.sin(a) * 0.25, math.cos(a) * 0.25, rng.uniform(0, 3)), sides=3)
        die("signdie", 1.0, (bc.x - 0.3, bc.y + 0.2, roof_z + 0.52), (math.radians(35), math.radians(-12), math.radians(50)))
        die("signdie2", 0.88, (HUT_C.x + 3.0, HUT_C.y + 3.0, 0.42 + 0.44), (math.radians(20), math.radians(70), math.radians(10)))

def build_trough():
    """A stone trough of lava along the +X face, out front, with bubbles."""
    tx, ty = HUT_C.x + 3.15, HUT_C.y + 0.35
    t = frustum("trough", (0.6, 1.75), (0.68, 1.85), 0.55, M["rock"], (tx, ty, 0.3))
    bevel(t, 0.07, 2)
    inner = box("troughcut", (0.95, 3.25, 0.6), M["rockplain"], (tx, ty, 0.3 + 0.55 + 0.12))
    boolean_diff(t, inner)
    lv = box("lavasurface", (0.95, 3.25, 0.08), M["lava"], (tx, ty, 0.3 + 0.55 - 0.1))
    ANIMATED.append(lv)
    if not DESTROYED:
        for i in range(6):
            b = sphere(f"bubble{i}", 1.0, M["lava"], (tx + rng.uniform(-0.3, 0.3), ty + rng.uniform(-1.5, 1.5), 0.3 + 0.55 - 0.08), segs=12)
            BUBBLES.append((b, rng.random(), rng.uniform(0.1, 0.19)))
            ANIMATED.append(b)
    li = bpy.data.lights.new("lavalight", "POINT")
    li.energy = 45 if not DESTROYED else 8
    li.color = (1.0, 0.4, 0.08)
    li.shadow_soft_size = 0.8
    lo = bpy.data.objects.new("lavalight", li)
    lo.location = (tx, ty, 1.4)
    link(lo)

def build_props():
    """A heap of gold coins by the door step, and a small die lying there."""
    x0, y0 = HUT_C.x + 0.85, HUT_C.y + 3.05
    for i in range(14):
        layer = 0 if i < 8 else (1 if i < 12 else 2)
        r = 0.42 - layer * 0.15
        a = rng.uniform(0, 2 * math.pi)
        cylinder(f"coin{i}", 0.17, 0.05, M["gold"], (x0 + math.cos(a) * rng.uniform(0, r), y0 + math.sin(a) * rng.uniform(0, r), 0.45 + layer * 0.055),
                 rot=(rng.uniform(-0.35, 0.35), rng.uniform(-0.35, 0.35), 0), segs=18)
    if not DESTROYED:
        die("smalldie", 0.45, (HUT_C.x - 1.45, HUT_C.y + 3.2, 0.42 + 0.22), (0, 0, math.radians(25)))

def build_rubble():
    """Destroyed: the hut fallen into a heap of blocks and shards, bones and dice scattered."""
    for i in range(60):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(0, 2.6) ** 0.8
        x, y = HUT_C.x + math.cos(a) * r, HUT_C.y + math.sin(a) * r
        h = max(0.0, 1.3 - r * 0.45)
        s = rng.uniform(0.3, 0.75)
        b = box(f"rubble{i}", (s, s * rng.uniform(0.6, 1.2), s * rng.uniform(0.4, 0.8)), M["blocks"] if i % 3 else M["rockplain"],
                (x, y, 0.42 + h * rng.uniform(0.3, 1.0)), (rng.uniform(0, 1), rng.uniform(0, 1), rng.uniform(0, 3)))
        bevel(b, 0.04, 1)
    for i in range(9):
        a = rng.uniform(0, 2 * math.pi)
        shard(f"fallen{i}", rng.uniform(0.18, 0.3), rng.uniform(0.5, 0.9), M["obsidian"],
              (HUT_C.x + math.cos(a) * rng.uniform(1.2, 3.0), HUT_C.y + math.sin(a) * rng.uniform(1.2, 3.0), 0.45),
              (rng.uniform(1.2, 1.9), 0, rng.uniform(0, 6)))
    for i in range(5):
        x, y = HUT_C.x + rng.uniform(-1.5, 3.2), HUT_C.y + rng.uniform(-0.5, 3.4)
        tusk(f"bone{i}", [(x, y, 0.5, 1.0), (x + 0.4, y + 0.1, 0.52, 0.8), (x + 0.75, y - 0.05, 0.5, 1.0)], 0.07, M["bone"])
    die("fallendie", 1.0, (HUT_C.x + 2.0, HUT_C.y + 2.2, 0.42 + 0.42), (math.radians(8), math.radians(-12), math.radians(30)))
    die("smalldie2", 0.42, (HUT_C.x - 1.2, HUT_C.y + 3.2, 0.42 + 0.2), (0, 0, math.radians(-15)))
    die("smalldie3", 0.42, (HUT_C.x + 2.9, HUT_C.y - 1.0, 0.42 + 0.2), (math.radians(90), 0, math.radians(10)))
    for side in (-1, 1):  # one tusk still standing
        if side == 1:
            dx = HUT_C.x - 0.2 + side * 0.72
            yf = HUT_C.y + 2.62
            tusk("standingtusk", [(dx, yf, 0.42, 1.0), (dx + 0.18, yf + 0.25, 1.2, 0.85), (dx + 0.05, yf + 0.35, 1.8, 0.6)], 0.13, M["bone"])

def build_damage():
    """Damaged: blocks knocked off the walls lying round, a dark crack patch, smoke-blackened."""
    for i in range(8):
        x = HUT_C.x + rng.uniform(-2.6, 3.0)
        y = HUT_C.y + rng.choice([rng.uniform(2.6, 3.4), rng.uniform(-2.2, 3.2)])
        if abs(x - HUT_C.x) < 2.6 and abs(y - HUT_C.y) < 2.6:
            y = HUT_C.y + 2.9
        s = rng.uniform(0.25, 0.5)
        b = box(f"debris{i}", (s, s * 0.9, s * 0.6), M["blocks"], (x, y, 0.42 + s * 0.3), (rng.uniform(0, 1), rng.uniform(0, 1), rng.uniform(0, 3)))
        bevel(b, 0.03, 1)
    # a chunk knocked out of the top of the left front corner (the +X side, over the trough), in view
    cut = box("roofbite", (1.5, 1.7, 1.5), M["rockplain"], (HUT_C.x + 2.35, HUT_C.y - 1.2, 3.0), (0.35, 0.25, 0.5))
    for name in ("hut", "band", "roof"):
        boolean_diff(bpy.data.objects[name], cut)

SPARKS = []   # (object, phase, start, velocity)

def build_sparks():
    """Damaged: sparks jump from the broken corner now and then, and fall."""
    spark_mat = mat("spark", lambda nt: (lambda e: (e.inputs["Color"].__setattr__("default_value", (1.0, 0.8, 0.35, 1)), e.inputs["Strength"].__setattr__("default_value", 25.0), e)[2])(nt.nodes.new("ShaderNodeEmission")))
    start = Vector((HUT_C.x + 2.2, HUT_C.y - 1.1, 3.1))
    for i in range(7):
        sp = sphere(f"spark{i}", 0.055, spark_mat, start, segs=8)
        v = Vector((rng.uniform(0.6, 1.8), rng.uniform(-1.2, 0.8), rng.uniform(1.0, 2.2)))
        SPARKS.append((sp, rng.uniform(0, 1) if i > 2 else i * 0.03, start.copy(), v))
        ANIMATED.append(sp)

build_platform()
if DESTROYED:
    build_rubble()
else:
    build_hut()
    build_sign()
    if DAMAGED:
        build_damage()
        build_sparks()
build_trough()
build_props()

# ------------------------------------------------------------------ camera
cam_d = bpy.data.cameras.new("cam")
cam_d.type = "ORTHO"
cam_d.ortho_scale = max(RES) / PX_PER_BU
cam = bpy.data.objects.new("cam", cam_d)
d = Vector((math.cos(math.radians(30)) * math.cos(math.radians(45)), math.cos(math.radians(30)) * math.sin(math.radians(45)), math.sin(math.radians(30))))
cam.location = LOOK + d * 60
cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
cam_d.clip_end = 200
link(cam)
scene.camera = cam

bpy.context.view_layer.update()
# ------------------------------------------------------------------ lights
sun_d = bpy.data.lights.new("sun", "SUN")
sun_d.energy = 5.5
sun_d.color = (1.0, 0.92, 0.84)
sun_d.angle = math.radians(6)
sun = bpy.data.objects.new("sun", sun_d)
# from the upper left of the screen (the game's light), 50 degrees up
right = cam.matrix_world.to_3x3() @ Vector((1, 0, 0))
away = -(cam.matrix_world.to_3x3() @ Vector((0, 0, -1)))
away.z = 0
away = -away.normalized()  # horizontal, into the screen
frm = (-right.normalized() * 1.0 + away * 0.45).normalized()
frm = Vector((frm.x, frm.y, 0)).normalized() * math.cos(math.radians(45)) + Vector((0, 0, math.sin(math.radians(45))))
sun.rotation_euler = (-frm).to_track_quat("-Z", "Y").to_euler()
link(sun)
rim_d = bpy.data.lights.new("rim", "SUN")
rim_d.energy = 0.9
rim_d.color = (0.85, 0.55, 1.0)
rim = bpy.data.objects.new("rim", rim_d)
rim.rotation_euler = (-(Vector((frm.x * -1, frm.y * -1, 0.6)).normalized())).to_track_quat("-Z", "Y").to_euler()
link(rim)

def px_of(p):
    """Pixel (x, y from the top left) of a world point in the render (at SS)."""
    co = world_to_camera_view(scene, cam, Vector(p))
    return (co.x * RES[0], (1 - co.y) * RES[1])

# ------------------------------------------------------------------ animation
def set_frame(f):
    """The anim layer at frame f (of FRAMES)."""
    t = f / FRAMES
    th = 2 * math.pi * t
    # the lava creeps: its pattern goes once round a small circle over the loop (4.5 s)
    for mp in LAVA_MAPPINGS:
        mp.inputs["Location"].default_value = (0.16 * math.cos(th), 0.16 * math.sin(th), 0.0)
    for (b, phase, size) in BUBBLES:
        u = (t + phase) % 1.0
        # swell for 70% of the loop, then pop (gone) for the rest
        s = size * math.sin(min(u / 0.7, 1.0) * math.pi / 2) if u < 0.7 else 0.0
        b.scale = (s, s, s * 0.8) if s > 0.01 else (0.001, 0.001, 0.001)
    # the skull's eyes: mostly lit, a quick double flicker in the loop
    flick = 1.0
    if f in (17, 19):
        flick = 0.3
    elif f == 18:
        flick = 0.6
    for e in EYE_EMISSION:
        e.inputs["Strength"].default_value = 14.0 * GLOW * flick
    # sparks: a burst in the first half of the loop, flying and falling, then gone
    for (sp, phase, start, v) in SPARKS:
        u = (t - phase) % 1.0
        life = 0.45
        if u < life:
            tt = u / life * 0.9
            sp.location = start + v * tt + Vector((0, 0, -4.9 * tt * tt))
            k = 1.0 - u / life
            sp.scale = (k, k, k)
        else:
            sp.scale = (0.001, 0.001, 0.001)
    # the door glow breathes
    for e in DOOR_EMISSION:
        e.inputs["Strength"].default_value = (5.0 + 1.2 * math.sin(th * 2)) if GLOW else 0.35

BOUNCE_AT = 34          # the frame of FRAMES2 the dice jump on
ARCS = [(8, 1.0), (5, 0.3), (3, 0.08)]   # (frames, height as a share of the first) of each hop

def hop_height(k, apex):
    """Height above rest k frames into the bounce (0 when resting)."""
    t = k
    for n, share in ARCS:
        if 0 <= t < n:
            u = t / n
            return apex * share * 4 * u * (1 - u)
        t -= n
    return 0.0

def set_frame2(f):
    """The anim2 layer at frame f (of FRAMES2): the dice rest, then pop up, tumble a whole turn (so they
    land as they were), bounce twice and settle; the pips flash as they land."""
    total = sum(n for n, _ in ARCS)
    flash = 1.0
    for i, (d, loc, rq, size) in enumerate(DICE):
        k = f - BOUNCE_AT - i          # the second die a frame behind
        apex = (0.72, 0.62)[i]
        if 0 <= k < total:
            h = hop_height(k, apex)
            p = k / total
            ease = 1 - (1 - min(1.0, p * 1.25)) ** 2          # most of the turn in the first hop
            axis = Vector(((0.6, 0.8, 0.2), (-0.7, 0.3, 0.65))[i]).normalized()
            from mathutils import Quaternion
            q = Quaternion(axis, 2 * math.pi * ease) @ rq
            drift = (Vector((bc_x, bc_y, 0)) - Vector((loc.x, loc.y, 0))) * 0.22 * math.sin(math.pi * p)
            d.location = loc + drift + Vector((0, 0, h))
            d.rotation_mode = "QUATERNION"
            d.rotation_quaternion = q
            if k in (ARCS[0][0], ARCS[0][0] + 1):
                flash = 1.9
        else:
            d.rotation_mode = "QUATERNION"
            d.location = loc
            d.rotation_quaternion = rq
    # (a dim flicker once in the loop as well)
    if f in (66, 68):
        flash = 0.35
    for e in PIP_EMISSION:
        e.inputs["Strength"].default_value = 14.0 * GLOW * flash

bc_x, bc_y = HUT_C.x + 0.3, HUT_C.y + 0.3

# ------------------------------------------------------------------ passes
def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

meta = {"state": STATE, "ss": SS, "res": RES, "origin_center_px": px_of((0, 0, 0))}

def border_round(objs, pad=0.02, frames=None, setter=None):
    xs, ys = [], []
    for f in (frames or [None]):
        if setter and f is not None:
            setter(f)
        bpy.context.view_layer.update()
        for ob in objs:
            if ob.type not in ("MESH", "CURVE"):
                continue
            for c in ob.bound_box:
                co = world_to_camera_view(scene, cam, ob.matrix_world @ Vector(c))
                xs.append(co.x); ys.append(co.y)
    scene.render.use_border = True
    scene.render.use_crop_to_border = False
    scene.render.border_min_x, scene.render.border_max_x = max(0, min(xs) - pad), min(1, max(xs) + pad)
    scene.render.border_min_y, scene.render.border_max_y = max(0, min(ys) - pad), min(1, max(ys) + pad)

if PASS in ("top", "preview", "button"):
    set_frame(0)
    set_frame2(0)
    render(OUT + ".png")
elif PASS == "anim2":
    # everything drawn, round the bubble only (assemble.py keeps what differs from the top); the same
    # samples and seed as the top, so what does not move comes out the same
    set_frame(0)
    border_round(DOME, 0.03, range(BOUNCE_AT, BOUNCE_AT + 18), set_frame2)
    frames = [int(x) for x in os.environ.get("FRAMES_ONLY", "").split(",") if x] or range(FRAMES2)
    for f in frames:
        set_frame2(f)
        render(f"{OUT}.{f:02d}.png")
elif PASS == "shadow":
    # only the shadow: everything hidden from the camera but casting, on a shadow catcher; the sun only
    for ob in scene.objects:
        if ob.type == "MESH" or ob.type == "CURVE":
            ob.visible_camera = False
        if ob.type == "LIGHT" and ob.name not in ("sun",):
            ob.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0.001))
    plane = bpy.context.active_object
    plane.is_shadow_catcher = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.0
    set_frame(0)
    render(OUT + ".png")
elif PASS == "anim":
    # only what moves: everything else holds out (hides what is behind it), frames 0..30
    for ob in scene.objects:
        if ob.type in ("MESH", "CURVE") and ob not in ANIMATED:
            ob.is_holdout = True
    set_frame2(0)
    frames = [int(x) for x in os.environ.get("FRAMES_ONLY", "").split(",") if x] or range(FRAMES)
    xs, ys = [], []
    for f in (0, 15, 30, 45):
        set_frame(f)
        bpy.context.view_layer.update()
        for ob in ANIMATED:
            for c in ob.bound_box:
                w = ob.matrix_world @ Vector(c)
                co = world_to_camera_view(scene, cam, w)
                xs.append(co.x); ys.append(co.y)
    pad = 0.03
    scene.render.use_border = True
    scene.render.use_crop_to_border = False
    scene.render.border_min_x, scene.render.border_max_x = max(0, min(xs) - pad), min(1, max(xs) + pad)
    scene.render.border_min_y, scene.render.border_max_y = max(0, min(ys) - pad), min(1, max(ys) + pad)
    for f in frames:
        set_frame(f)
        render(f"{OUT}.{f:02d}.png")

with open(OUT + ".json", "w") as fh:
    json.dump(meta, fh)
print("META", json.dumps(meta))
