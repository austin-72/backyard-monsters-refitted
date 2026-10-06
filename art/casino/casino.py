"""The Brimstone Pit's casino art (lobby, Magma Drop, Scratchers, Roulette, Slots): modelled and rendered with
Blender (bpy), one picture a run:

    python3 casino.py <what> <out.png>

    what: lobby | board | peg | cup | wheel | rim | cabinet | lever | grid_bg | pile | crystal | sky | tower | track | finish | card_bone | card_obsidian | card_magma
          | sym_crown | sym_magma | sym_sulfur | sym_coal | sym_bone
          | tile_magmadrop | tile_scratch | tile_roulette | tile_bonepile | tile_slots | tile_ascent | tile_derby

Renders are made bigger than the game shows them and scaled down by assemble.py, which also adds the
monsters' portraits, the coatings (drawn in code) and writes server/public/assets/casino/.
The materials are the Brimstone Pit building's (art/brimstonepit/pit.py): basalt, obsidian, bone, gold, lava.
"""
import math, os, random, sys
import bpy, bmesh
from mathutils import Vector

WHAT = sys.argv[1] if len(sys.argv) > 1 else "peg"
OUT = sys.argv[2] if len(sys.argv) > 2 else f"/tmp/casino-{WHAT}.png"
SAMPLES = int(os.environ.get("SAMPLES", "48"))
rng = random.Random(141)

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
scene.cycles.seed = 0
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.25
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
BG = world.node_tree.nodes["Background"]
BG.inputs[0].default_value = (0.16, 0.11, 0.10, 1)
BG.inputs[1].default_value = 1.0
coll = scene.collection


def setup(w, h, transparent=True, ambient=1.0):
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    BG.inputs[1].default_value = ambient


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
    p.inputs["Specular IOR Level"].default_value = spec
    return p


def noise(nt, scale, detail=6, rough=0.6, coord="Object", distortion=0.0):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    n.inputs["Distortion"].default_value = distortion
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


def rock(nt, glow=0.0, scale=3.0, crack_scale=0.55, tint=(1, 1, 1)):
    """Rough dark basalt; glow > 0: some of its cracks glow with lava."""
    n = noise(nt, scale, 10, 0.7)
    col = ramp(nt, [(0.3, (0.035 * tint[0], 0.03 * tint[1], 0.032 * tint[2])), (0.7, (0.12 * tint[0], 0.1 * tint[1], 0.1 * tint[2]))])
    nt.links.new(n.outputs["Fac"], col.inputs[0])
    p = principled(nt, (0.05, 0.045, 0.05), 0.88)
    nt.links.new(col.outputs["Color"], p.inputs["Base Color"])
    n2 = noise(nt, scale * 4, 8, 0.7)
    b = bump(nt, n2.outputs["Fac"], 0.45)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    if glow > 0:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        v = nt.nodes.new("ShaderNodeTexVoronoi")
        v.feature = "DISTANCE_TO_EDGE"
        v.inputs["Scale"].default_value = crack_scale
        wn = noise(nt, 1.5, 4, 0.5)
        mixv = nt.nodes.new("ShaderNodeMix")
        mixv.data_type = "VECTOR"
        mixv.inputs["Factor"].default_value = 0.35
        nt.links.new(tc.outputs["Object"], mixv.inputs[4])
        nt.links.new(wn.outputs["Color"], mixv.inputs[5])
        nt.links.new(mixv.outputs[1], v.inputs["Vector"])
        r = ramp(nt, [(0.0, (1, 1, 1)), (0.02, (0, 0, 0))])
        nt.links.new(v.outputs["Distance"], r.inputs[0])
        mask = noise(nt, 0.9, 2, 0.5)
        mr = ramp(nt, [(0.48, (0, 0, 0)), (0.6, (1, 1, 1))])
        nt.links.new(mask.outputs["Fac"], mr.inputs[0])
        mm = nt.nodes.new("ShaderNodeMath")
        mm.operation = "MULTIPLY"
        nt.links.new(r.outputs["Color"], mm.inputs[0])
        nt.links.new(mr.outputs["Color"], mm.inputs[1])
        em = nt.nodes.new("ShaderNodeMath")
        em.operation = "MULTIPLY"
        em.inputs[1].default_value = glow
        nt.links.new(mm.outputs[0], em.inputs[0])
        p.inputs["Emission Color"].default_value = (1.0, 0.3, 0.03, 1)
        nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    return p


def obsidian(nt):
    p = principled(nt, (0.012, 0.010, 0.016), 0.16, spec=0.8)
    p.inputs["Coat Weight"].default_value = 0.4
    p.inputs["Coat Roughness"].default_value = 0.05
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
    p.inputs["Subsurface Weight"].default_value = 0.08
    b = bump(nt, n.outputs["Fac"], 0.2)
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    return p


def gold(nt, glow=0.6):
    p = principled(nt, (1.0, 0.7, 0.25), 0.3, metal=0.7)
    p.inputs["Emission Color"].default_value = (1.0, 0.62, 0.18, 1)
    p.inputs["Emission Strength"].default_value = glow
    return p


def lava(nt, strength=6.0, scale=2.2, stretch=(1, 1, 1)):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = stretch
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = 8
    n.inputs["Roughness"].default_value = 0.62
    n.inputs["Distortion"].default_value = 0.8
    nt.links.new(mp.outputs[0], n.inputs["Vector"])
    col = ramp(nt, [(0.34, (0.05, 0.012, 0.005)), (0.46, (0.55, 0.06, 0.0)), (0.56, (1.0, 0.33, 0.02)), (0.7, (1.0, 0.78, 0.25))])
    nt.links.new(n.outputs["Fac"], col.inputs[0])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Strength"].default_value = strength
    nt.links.new(col.outputs["Color"], e.inputs["Color"])
    p = principled(nt, (0.03, 0.02, 0.02), 0.7)
    fac = ramp(nt, [(0.36, (0, 0, 0)), (0.48, (1, 1, 1))])
    nt.links.new(n.outputs["Fac"], fac.inputs[0])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fac.outputs["Color"], mix.inputs[0])
    nt.links.new(p.outputs[0], mix.inputs[1])
    nt.links.new(e.outputs[0], mix.inputs[2])
    return mix


def emission(color, strength):
    def build(nt):
        e = nt.nodes.new("ShaderNodeEmission")
        e.inputs["Color"].default_value = (*color, 1)
        e.inputs["Strength"].default_value = strength
        return e
    return build


def plain(color, rough=0.5, metal=0.0, glow=0.0, glow_color=None, coat=0.0):
    def build(nt):
        p = principled(nt, color, rough, metal)
        if glow:
            p.inputs["Emission Color"].default_value = (*(glow_color or color), 1)
            p.inputs["Emission Strength"].default_value = glow
        if coat:
            p.inputs["Coat Weight"].default_value = coat
            p.inputs["Coat Roughness"].default_value = 0.05
        return p
    return build


def crystal(color, glow):
    def build(nt):
        p = principled(nt, color, 0.08, spec=0.9)
        p.inputs["Transmission Weight"].default_value = 0.55
        p.inputs["IOR"].default_value = 1.6
        p.inputs["Emission Color"].default_value = (*color, 1)
        p.inputs["Emission Strength"].default_value = glow
        return p
    return build


def gold_lava(nt):
    """Molten gold with glowing seams (the Magma card)."""
    p = gold(nt, 0.2)
    p.inputs["Base Color"].default_value = (0.95, 0.5, 0.12, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    v = nt.nodes.new("ShaderNodeTexVoronoi")
    v.feature = "DISTANCE_TO_EDGE"
    v.inputs["Scale"].default_value = 3.0
    nt.links.new(tc.outputs["Object"], v.inputs["Vector"])
    r = ramp(nt, [(0.0, (1, 1, 1)), (0.035, (0, 0, 0))])
    nt.links.new(v.outputs["Distance"], r.inputs[0])
    col = nt.nodes.new("ShaderNodeMix")
    col.data_type = "RGBA"
    nt.links.new(r.outputs["Color"], col.inputs["Factor"])
    col.inputs[6].default_value = (1.0, 0.62, 0.18, 1)
    col.inputs[7].default_value = (1.0, 0.25, 0.02, 1)
    nt.links.new(col.outputs[2], p.inputs["Emission Color"])
    em = nt.nodes.new("ShaderNodeMath")
    em.operation = "MULTIPLY_ADD"
    em.inputs[1].default_value = 3.5
    em.inputs[2].default_value = 0.12
    nt.links.new(r.outputs["Color"], em.inputs[0])
    nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    return p


M = {}


def M_(name):
    if name not in M:
        builders = {
            "rock": lambda nt: rock(nt, 0.0),
            "rockglow": lambda nt: rock(nt, 3.0),
            "rockwall": lambda nt: rock(nt, 1.2, 1.2, 0.35),
            "boardwall": lambda nt: rock(nt, 1.4, 4.0, 0.8),
            "bankrock": lambda nt: rock(nt, 1.2, 2.0, 0.45),
            "obsidian": obsidian,
            "bone": bone,
            "gold": gold,
            "goldbright": lambda nt: gold(nt, 1.6),
            "goldlava": gold_lava,
            "lava": lava,
            "lavabright": lambda nt: lava(nt, 12.0, 3.0),
            "lavafall": lambda nt: lava(nt, 7.0, 1.6, (2.5, 2.5, 0.35)),
            "ember": emission((1.0, 0.42, 0.06), 14.0),
            "emberdim": emission((1.0, 0.35, 0.05), 2.0),
            "purple": emission((0.62, 0.2, 1.0), 8.0),
            "ruby": crystal((0.9, 0.04, 0.03), 1.2),
            "sulfur": crystal((0.95, 0.66, 0.04), 0.12),
            "lavadrop": lambda nt: lava(nt, 3.5, 1.4),
            "rim": emission((1.0, 0.28, 0.03), 1.0),
            "coal": lambda nt: rock(nt, 1.2, 6.0, 1.6, (0.6, 0.6, 0.65)),
            "ash": plain((0.32, 0.3, 0.29), 0.95),
            "redlava": plain((0.45, 0.05, 0.02), 0.35, glow=0.6, glow_color=(1.0, 0.2, 0.02), coat=0.3),
            "black": plain((0.02, 0.018, 0.02), 0.3, coat=0.5),
            "cellbg": plain((0.05, 0.03, 0.028), 0.7),
            "felt": plain((0.18, 0.03, 0.02), 0.9),
            "golddim": lambda nt: gold(nt, 0.2),
            "eyeglow": emission((1.0, 0.3, 0.03), 6.0),
            "cabinetrock": lambda nt: rock(nt, 3.0, 2.5, 1.3, (0.7, 0.62, 0.62)),
            "wheelred": plain((0.5, 0.05, 0.02), 0.35, glow=0.35, glow_color=(1.0, 0.15, 0.02), coat=0.4),
            "wheelpurple": plain((0.3, 0.08, 0.5), 0.3, glow=1.2, glow_color=(0.6, 0.2, 1.0), coat=0.4),
        }
        M[name] = mat(name, builders[name])
    return M[name]


# ------------------------------------------------------------------ modelling helpers
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
    if material is not None:
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
    return ob


def displace(ob, strength, scale=1.0, levels=3, seed=0):
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.levels = sub.render_levels = levels
    tex = bpy.data.textures.new(f"d{seed}{ob.name}", "CLOUDS")
    tex.noise_scale = scale
    tex.noise_depth = 2
    d = ob.modifiers.new("disp", "DISPLACE")
    d.texture = tex
    d.strength = strength
    d.mid_level = 0.5
    d.texture_coords = "OBJECT"
    if ob.type == "MESH":
        for p in ob.data.polygons:
            p.use_smooth = True
    return ob


def box(name, size, material, loc, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    return mesh_obj(name, bm, material, loc, rot)


def sphere(name, r, material, loc, segs=24, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=max(8, segs // 2), radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    return mesh_obj(name, bm, material, loc, smooth=True)


def ico(name, r, material, loc, subdiv=3):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    return mesh_obj(name, bm, material, loc, smooth=True)


def cylinder(name, r, h, material, loc, rot=(0, 0, 0), segs=32, r2=None, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    ob = mesh_obj(name, bm, material, loc, rot)
    if smooth:
        for p in ob.data.polygons:
            p.use_smooth = abs(p.normal.z) < 0.9
    return ob


def cone(name, r, h, material, loc, rot=(0, 0, 0), segs=16):
    """A cone standing on its base at loc."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=0.0, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    return mesh_obj(name, bm, material, loc, rot)


def shard(name, r, h, material, loc, rot, sides=6):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=sides, radius1=r, radius2=r * 0.85, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2))
    top = [v for v in bm.verts if v.co.z > h * 0.9]
    tip = bm.verts.new((0, 0, h + r * 1.4))
    # a pointed top
    for f in [f for f in bm.faces if all(v in top for v in f.verts)]:
        bm.faces.remove(f)
    top.sort(key=lambda v: math.atan2(v.co.y, v.co.x))
    for i in range(len(top)):
        bm.faces.new([top[i], top[(i + 1) % len(top)], tip])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm, material, loc, rot)


def torus(name, R, r, material, loc, rot=(0, 0, 0), seg=64):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=12, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def curve(name, pts, radius, material, res=12):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.resolution_u = res
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p[:3]
        bp.radius = p[3] if len(p) > 3 else 1.0
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.use_fill_caps = True
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(material)
    return link(ob)


def rock_lump(name, r, material, loc, strength=0.35, scale=0.6, seed=0):
    ob = ico(name, r, material, loc, 2)
    displace(ob, strength * r, scale * r, 2, seed)
    return ob


def bone_piece(name, length, r, loc, rot):
    """A cartoon bone: a shaft with two knobs at each end."""
    parts = []
    shaft = cylinder(name, r, length, M_("bone"), (0, 0, 0), segs=16)
    parts.append(shaft)
    for end in (-1, 1):
        for side in (-1, 1):
            k = sphere(f"{name}k{end}{side}", r * 1.45, M_("bone"), (side * r * 1.05, 0, end * length / 2), segs=16)
            k.parent = shaft
    shaft.location = loc
    shaft.rotation_euler = rot
    return shaft


def camera(loc, target, lens=50, ortho=None):
    cd = bpy.data.cameras.new("cam")
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    cd.clip_end = 400
    cam = link(bpy.data.objects.new("cam", cd))
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    return cam


def light(kind, loc, energy, color=(1, 0.9, 0.8), size=1.0, target=(0, 0, 0)):
    ld = bpy.data.lights.new("l", kind)
    ld.energy = energy
    ld.color = color
    if kind == "AREA":
        ld.size = size
    elif kind in ("POINT", "SPOT"):
        ld.shadow_soft_size = size
    ob = link(bpy.data.objects.new("l", ld))
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


def key_lights(scale=1.0, dist=6.0):
    """Light from the upper left (as the Inferno buildings'), warm fill from below."""
    light("AREA", (-dist * 0.6, -dist * 0.7, dist * 0.9), 380 * scale * (dist / 6) ** 2, (1.0, 0.9, 0.8), 3.0)
    light("AREA", (dist * 0.8, -dist * 0.4, -dist * 0.1), 120 * scale * (dist / 6) ** 2, (1.0, 0.45, 0.15), 3.0)
    light("AREA", (dist * 0.2, dist * 0.9, dist * 0.6), 160 * scale * (dist / 6) ** 2, (1.0, 0.55, 0.25), 3.0)


def render():
    scene.render.filepath = OUT
    bpy.ops.render.render(write_still=True)


# ------------------------------------------------------------------ Magma Drop
def peg_model(loc=(0, 0, 0), s=1.0):
    stud = sphere("stud", 0.66 * s, M_("obsidian"), (loc[0], loc[1], loc[2] + 0.1 * s), scale=(1, 1, 0.7))
    rim = torus("rim", 0.74 * s, 0.17 * s, M_("rim"), (loc[0], loc[1], loc[2] + 0.06 * s))
    sphere("hot", 0.22 * s, M_("rim"), (loc[0], loc[1], loc[2] + 0.52 * s), scale=(1, 1, 0.4))
    return stud, rim


def scene_peg():
    setup(162, 162)
    BG.inputs[1].default_value = 0.4
    peg_model()
    camera((0, -3.2, 6.5), (0, 0, 0.1), ortho=2.25)
    key_lights(0.6)


def cup_model(loc=(0, 0, 0), s=1.0):
    body = cylinder("crucible", 0.62 * s, 0.9 * s, M_("rock"), (loc[0], loc[1], loc[2] + 0.45 * s), segs=24, r2=0.95 * s)
    bevel(body, 0.06 * s, 2)
    rim = torus("cuprim", 0.93 * s, 0.08 * s, M_("rock"), (loc[0], loc[1], loc[2] + 0.9 * s), seg=32)
    top = cylinder("cuplava", 0.88 * s, 0.02 * s, M_("lava"), (loc[0], loc[1], loc[2] + 0.905 * s), segs=32)
    return body, rim, top


def scene_cup():
    setup(204, 180)
    cup_model()
    camera((0, -7.5, 4.2), (0, 0, 0.45), ortho=2.3)
    key_lights(0.8)


def scene_board():
    """The wall behind the pegs: basalt lit by lava from below, dark in the middle where the pegs are."""
    setup(948, 788, transparent=False, ambient=0.15)
    wall = box("wall", (6.0, 0.4, 5.2), M_("boardwall"), (0, 0.2, 0))
    displace(wall, 0.22, 0.45, 6)
    # a lava seam along the bottom
    seam = box("seam", (6.0, 0.6, 0.3), M_("lavabright"), (0, -0.25, -2.12))
    camera((0, -10, 0), (0, 0, 0), ortho=4.74 * 1.0)
    scene.render.resolution_x, scene.render.resolution_y = 948, 788
    light("AREA", (0, -2.0, -3.2), 900, (1.0, 0.35, 0.08), 6.0, (0, 0, 0))
    light("AREA", (-3, -6, 4), 260, (1.0, 0.85, 0.75), 4.0, (0, 0, 0))


# ------------------------------------------------------------------ the lobby
def scene_lobby():
    """A dim cavern lit by a lava river and a lava fall, gaming tables in the distance."""
    setup(1092, 777, transparent=False, ambient=0.05)
    BG.inputs[0].default_value = (0.08, 0.04, 0.03, 1)
    # banks either side of the river
    for side in (-1, 1):
        bank = box(f"bank{side}", (9.0, 30.0, 1.0), M_("bankrock"), (side * 6.0, 10.0, -0.5))
        displace(bank, 0.35, 1.2, 6, seed=side + 2)
    river = box("river", (3.4, 30.0, 0.2), M_("lava"), (0, 10.0, -0.55))
    # walls, back and ceiling
    back = box("back", (30.0, 1.0, 16.0), M_("rockwall"), (0, 24.0, 6.0))
    displace(back, 1.6, 1.5, 6, seed=5)
    for side in (-1, 1):
        w = box(f"side{side}", (1.0, 34.0, 16.0), M_("rockwall"), (side * 9.5, 8.0, 6.0))
        displace(w, 1.6, 1.8, 6, seed=7 + side)
    ceil = box("ceil", (30.0, 34.0, 1.0), M_("rock"), (0, 8.0, 9.5))
    displace(ceil, 1.2, 1.5, 6, seed=9)
    # the lava fall into the river
    fall = box("fall", (3.0, 0.3, 12.0), M_("lavafall"), (0, 23.3, 5.0))
    displace(fall, 0.25, 0.8, 3, seed=11)
    pool = cylinder("pool", 3.0, 0.2, M_("lavabright"), (0, 22.0, -0.5), segs=32)
    # stalactites and pillars
    for i in range(26):
        x = rng.uniform(-9, 9)
        y = rng.uniform(4, 23)
        if abs(x) < 2.2 and y < 20:
            x += 3.5 if x > 0 else -3.5
        h = rng.uniform(1.0, 3.6)
        c = cone(f"stal{i}", rng.uniform(0.25, 0.6), h, M_("rock"), (x, y, 9.0), rot=(math.pi, 0, rng.uniform(0, 3)), segs=7)
        displace(c, 0.08, 0.4, 2, seed=20 + i)
    for i, (x, y) in enumerate([(-6.5, 12.0), (6.8, 15.0), (-4.2, 19.0)]):
        p = cylinder(f"pillar{i}", 0.9, 12.0, M_("rockglow"), (x, y, 4.0), segs=12, r2=0.6)
        displace(p, 0.3, 0.8, 3, seed=40 + i)
    # gaming tables on the banks, glowing
    tables = [(-4.2, 6.5), (4.0, 7.5), (-5.0, 13.0), (4.6, 12.0), (-3.0, 16.5), (3.4, 17.0)]
    for i, (x, y) in enumerate(tables):
        top = cylinder(f"table{i}", 1.0, 0.12, M_("felt"), (x, y, 0.95), segs=32)
        torus(f"trim{i}", 1.0, 0.07, M_("gold"), (x, y, 1.0), seg=32)
        cylinder(f"leg{i}", 0.22, 0.9, M_("obsidian"), (x, y, 0.45), segs=12)
        # chips and dice on the tables
        for k in range(3):
            a = rng.uniform(0, 6.28)
            cylinder(f"chips{i}{k}", 0.12, 0.05 * (k + 2), M_(["redlava", "goldbright", "bone"][k]), (x + math.cos(a) * 0.5, y + math.sin(a) * 0.5, 1.03 + 0.025 * (k + 2)), segs=16)
        d = box(f"die{i}", (0.2, 0.2, 0.2), M_("bone"), (x + 0.2, y - 0.3, 1.11), rot=(0, 0, rng.uniform(0, 1)))
        bevel(d, 0.04, 2)
        # a brazier
        bx = x + (1.5 if x > 0 else -1.5)
        cylinder(f"braz{i}", 0.25, 1.4, M_("rock"), (bx, y + 0.4, 0.7), segs=10, r2=0.35)
        cylinder(f"brazf{i}", 0.3, 0.04, M_("lavabright"), (bx, y + 0.4, 1.42), segs=16)
        light("POINT", (bx, y + 0.4, 1.9), 60, (1.0, 0.45, 0.12), 0.3)
        light("POINT", (x, y, 2.6), 30, (1.0, 0.7, 0.4), 0.8)
    # the river's light
    for y in (0, 5, 10, 15, 20):
        light("POINT", (0, y, 0.6), 220, (1.0, 0.35, 0.08), 1.2)
    light("POINT", (0, 21.0, 4.0), 1200, (1.0, 0.4, 0.1), 2.5)
    camera((0, -6.5, 3.0), (0, 10.0, 2.2), lens=22)


# ------------------------------------------------------------------ Brimstone Scratchers
def card_model(kind):
    """A 3 x 3 unit card seen from above (ortho 3.0 = 300 px): a 0.24 edge and nine 0.84 cells."""
    body_mat = {"bone": M_("bone"), "obsidian": M_("obsidian"), "magma": M_("goldlava")}[kind]
    rim_mat = {"bone": M_("gold"), "obsidian": M_("gold"), "magma": M_("gold")}[kind]
    card = box("card", (2.98, 2.98, 0.1), body_mat, (0, 0, -0.05))
    bevel(card, 0.14, 4)
    # a raised rim round the edge, and the sunk window of cells
    frame_w = 0.05
    for (sx, sy, w, h) in [(0, 1.3, 2.62, frame_w), (0, -1.3, 2.62, frame_w), (1.3, 0, frame_w, 2.62), (-1.3, 0, frame_w, 2.62)]:
        b = box("rim", (w, h, 0.05), rim_mat, (sx, sy, 0.02))
        bevel(b, 0.015, 2)
    win = box("window", (2.52, 2.52, 0.02), M_("cellbg"), (0, 0, 0.005))
    # cell walls: thin gold lines between cells
    for k in (-1, 1):
        box("wallv", (0.03, 2.52, 0.03), rim_mat, (k * 0.42, 0, 0.02))
        box("wallh", (2.52, 0.03, 0.03), rim_mat, (0, k * 0.42, 0.02))
    # corner studs
    for sx in (-1, 1):
        for sy in (-1, 1):
            sphere("stud", 0.06, M_("ruby") if kind != "bone" else M_("ember"), (sx * 1.37, sy * 1.37, 0.03), segs=16, scale=(1, 1, 0.6))
    # little skulls? (no): three embers along the top and bottom edges
    for sy in (-1, 1):
        for sx in (-0.5, 0, 0.5):
            sphere("dot", 0.035, M_("emberdim"), (sx, sy * 1.39, 0.02), segs=12, scale=(1, 1, 0.5))


def scene_card(kind):
    setup(600, 600)
    card_model(kind)
    camera((0, 0, 10), (0, 0, 0), ortho=3.0)
    light("AREA", (-3.5, 3.5, 6), 400, (1.0, 0.92, 0.85), 4.0)
    light("AREA", (4, -3, 3), 90, (1.0, 0.5, 0.2), 3.0)
    BG.inputs[1].default_value = 0.6


def sym_crown():
    """Moloch's crown: a gold band with spikes, rubies and two horns."""
    band = cylinder("band", 1.0, 0.55, M_("gold"), (0, 0, 0.27), segs=48)
    inner = cylinder("inner", 0.9, 0.6, M_("black"), (0, 0, 0.3), segs=48)
    torus("brim", 1.0, 0.08, M_("gold"), (0, 0, 0.02), seg=48)
    torus("brim2", 1.0, 0.06, M_("gold"), (0, 0, 0.55), seg=48)
    for i in range(7):
        a = i / 7 * 2 * math.pi - math.pi / 2
        s = shard(f"spike{i}", 0.2, 0.55 + (0.3 if i == 0 else 0), M_("gold"), (math.cos(a) * 0.95, math.sin(a) * 0.95, 0.5), (0, 0, 0), sides=5)
        sphere(f"ruby{i}", 0.12, M_("ruby"), (math.cos(a) * 1.02, math.sin(a) * 1.02, 0.3), segs=16)
    sphere("gem", 0.2, M_("ruby"), (0, -1.05, 0.3), segs=24, scale=(1, 0.6, 1.2))
    for side in (-1, 1):
        curve(f"horn{side}", [(side * 0.9, -0.1, 0.35, 1.0), (side * 1.45, -0.2, 0.75, 0.75), (side * 1.55, -0.1, 1.35, 0.45), (side * 1.3, 0, 1.75, 0.05)], 0.16, M_("bone"))
    return (0, 0, 0.8), 3.7


def sym_magma():
    """A drop of magma."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0)
    for v in bm.verts:
        z = v.co.z
        if z > 0:
            k = 1 - z * 0.85
            v.co.x *= k
            v.co.y *= k
            v.co.z = z * 1.9
    ob = mesh_obj("drop", bm, M_("lavadrop"), (0, 0, 0), smooth=True)
    sub = ob.modifiers.new("s", "SUBSURF")
    sub.levels = sub.render_levels = 2
    for i in range(3):
        a = i * 2.1 + 0.4
        sphere(f"spatter{i}", 0.13 - i * 0.03, M_("lavadrop"), (math.cos(a) * 1.2, math.sin(a) * 0.4 - 0.3, -0.7 + i * 0.25), segs=16)
    return (0, 0, 0.35), 3.6


def sym_sulfur():
    """A cluster of sulfur crystals on a rock."""
    rock_lump("base", 0.6, M_("rock"), (0, 0, -0.6), 0.3, 0.5, seed=3)
    specs = [(0, 0, 1.7, 0.32, 0, 0), (0.4, 0.1, 1.2, 0.26, 0.4, 0.3), (-0.42, 0.05, 1.3, 0.26, -0.45, -0.2),
             (0.15, -0.3, 0.9, 0.2, 0.1, -0.5), (-0.2, 0.35, 1.0, 0.2, -0.2, 0.45), (0.62, -0.2, 0.7, 0.17, 0.75, -0.2)]
    for i, (x, y, h, r, rx, ry) in enumerate(specs):
        shard(f"xtal{i}", r, h, M_("sulfur"), (x, y, -0.3), (ry, rx, rng.uniform(0, 1)), sides=6)
    return (0, 0, 0.35), 3.4


def sym_coal():
    rock_lump("coal", 1.0, M_("coal"), (0, 0, 0), 0.45, 0.7, seed=5)
    rock_lump("coal2", 0.45, M_("coal"), (0.95, -0.35, -0.45), 0.4, 0.6, seed=6)
    return (0.1, 0, 0), 3.2


def sym_bone():
    bone_piece("bone", 2.3, 0.3, (0, 0, 0), (math.radians(20), math.radians(55), math.radians(-10)))
    return (0, 0, 0), 3.4


def scene_symbol(name):
    setup(210, 210)
    BG.inputs[1].default_value = 0.5
    target, size = {"crown": sym_crown, "magma": sym_magma, "sulfur": sym_sulfur, "coal": sym_coal, "bone": sym_bone}[name]()
    camera((0, -9.0, 5.2), target, ortho=size)
    key_lights(1.0)


# ------------------------------------------------------------------ the lobby's tiles (one game each)
def tile_magmadrop():
    board = box("board", (3.0, 0.2, 2.9), M_("obsidian"), (0, 0.1, 1.45))
    bevel(board, 0.04, 2)
    for (x, z, w, h) in [(0, 2.95, 3.2, 0.12), (0, -0.05, 3.2, 0.12), (1.55, 1.45, 0.12, 3.1), (-1.55, 1.45, 0.12, 3.1)]:
        bevel(box("frame", (w, 0.3, h), M_("gold"), (x, 0.05, z)), 0.03, 2)
    rows = 6
    for r in range(rows):
        for i in range(r + 3):
            x = (i - (r + 2) / 2) * 0.36
            sphere("peg", 0.055, M_("rim"), (x, -0.05, 2.5 - r * 0.3), segs=12)
    for k in range(rows + 2):
        x = (k - (rows + 1) / 2) * 0.36
        cup_model((x, -0.12, 0.08), 0.15)
    # the Spurtz fireball's trail (assemble.py puts Spurtz at its head)
    for i in range(6):
        sphere(f"trail{i}", 0.13 - i * 0.017, M_("lavabright"), (0.18 - i * 0.07, -0.25, 1.62 + i * 0.13), segs=16)
    camera((0, -9.0, 2.4), (0, 0, 1.45), ortho=5.0)
    key_lights(0.8)


def tile_scratch():
    for i, (x, y, rz, kind) in enumerate([(-0.55, 0.3, 0.22, "bone"), (0.45, -0.1, -0.12, "magma")]):
        body = box(f"card{i}", (1.6, 2.1, 0.05), M_("bone") if kind == "bone" else M_("goldlava"), (x, y, 0.03 + i * 0.06), (0, 0, rz))
        bevel(body, 0.08, 3)
        # the nine cells: some still ashen, three showing crowns
        for c in range(9):
            cx = (c % 3 - 1) * 0.42
            cy = (c // 3 - 1) * 0.42 - 0.12
            wx = x + cx * math.cos(rz) - cy * math.sin(rz)
            wy = y + cx * math.sin(rz) + cy * math.cos(rz)
            shown = i == 1 and c in (1, 4, 7)
            cell = box(f"cell{i}{c}", (0.38, 0.38, 0.02), M_("cellbg") if shown else M_("ash"), (wx, wy, 0.07 + i * 0.06), (0, 0, rz))
            if shown:
                sphere(f"gem{i}{c}", 0.1, M_("ruby"), (wx, wy, 0.13 + i * 0.06), segs=16)
                torus(f"ring{i}{c}", 0.13, 0.03, M_("goldbright"), (wx, wy, 0.1 + i * 0.06), seg=24)
    # a bone coin that did the scratching
    cylinder("coin", 0.32, 0.06, M_("bone"), (1.25, -0.9, 0.25), rot=(math.radians(70), 0, math.radians(30)), segs=32)
    camera((0, -6.0, 6.5), (0.1, 0.0, 0.1), ortho=3.4)
    key_lights(0.9)


def tile_roulette():
    n = 29
    bm = bmesh.new()
    mats = []
    c = bm.verts.new((0, 0, 0))
    ring = [bm.verts.new((math.cos(i / n * 2 * math.pi) * 1.5, math.sin(i / n * 2 * math.pi) * 1.5, 0)) for i in range(n)]
    for i in range(n):
        f = bm.faces.new([c, ring[i], ring[(i + 1) % n]])
        f.material_index = 2 if i == 0 else i % 2
    ob = mesh_obj("wheel", bm, M_("redlava"), (0, 0, 0.12))
    ob.data.materials.append(M_("black"))
    ob.data.materials.append(M_("purple"))
    cylinder("base", 1.62, 0.2, M_("obsidian"), (0, 0, 0.02), segs=64)
    torus("outer", 1.6, 0.1, M_("gold"), (0, 0, 0.14), seg=64)
    cylinder("hub", 0.9, 0.06, M_("obsidian"), (0, 0, 0.15), segs=48)
    torus("hubrim", 0.9, 0.05, M_("gold"), (0, 0, 0.18), seg=48)
    cone("spindle", 0.22, 0.6, M_("gold"), (0, 0, 0.16), segs=24)
    for i in range(4):
        a = i * math.pi / 2 + 0.3
        curve(f"arm{i}", [(0, 0, 0.45), (math.cos(a) * 0.35, math.sin(a) * 0.35, 0.4), (math.cos(a) * 0.6, math.sin(a) * 0.6, 0.3, 0.6)], 0.045, M_("gold"))
    # separators
    for i in range(n):
        a = i / n * 2 * math.pi
        box(f"sep{i}", (0.6, 0.02, 0.04), M_("gold"), (math.cos(a) * 1.2, math.sin(a) * 1.2, 0.14), (0, 0, a))
    sphere("ball", 0.09, M_("bone"), (math.cos(1.1) * 1.3, math.sin(1.1) * 1.3, 0.24), segs=16)
    camera((0, -6.2, 4.4), (0, 0.15, 0.1), ortho=3.9)
    key_lights(0.9)


def tile_bonepile():
    for gx in range(5):
        for gy in range(5):
            x, y = (gx - 2) * 0.6, (gy - 2) * 0.6
            bevel(box(f"slab{gx}{gy}", (0.54, 0.54, 0.1), M_("obsidian"), (x, y, 0.0)), 0.03, 2)
            if (gx, gy) in ((1, 1), (3, 2), (2, 4)):
                sphere(f"gem{gx}{gy}", 0.12, M_("rim"), (x, y, 0.12), segs=12, scale=(1, 1, 0.7))
            elif (gx, gy) == (4, 0):
                sphere(f"danger{gx}{gy}", 0.14, M_("purple"), (x, y, 0.12), segs=12, scale=(1, 1, 0.7))
            else:
                for k in range(3):
                    bone_piece(f"b{gx}{gy}{k}", 0.3, 0.035, (x + rng.uniform(-0.08, 0.08), y + rng.uniform(-0.08, 0.08), 0.1 + k * 0.05),
                               (math.radians(90), 0, rng.uniform(0, 3.14)))
    camera((0, -6.5, 6.0), (0, 0.1, 0.0), ortho=3.9)
    key_lights(0.9)


def tile_slots():
    """An idol of basalt with three bone reels in its belly and a lever: no real machine's look."""
    body = box("idol", (2.4, 1.2, 2.2), M_("rockglow"), (0, 0, 1.1))
    bevel(body, 0.12, 3)
    head = cylinder("dome", 1.15, 0.5, M_("rock"), (0, 0, 2.45), rot=(math.pi / 2, 0, 0), segs=32)
    for side in (-1, 1):
        curve(f"horn{side}", [(side * 0.9, 0, 2.6, 1.0), (side * 1.4, -0.1, 3.0, 0.7), (side * 1.3, 0, 3.4, 0.1)], 0.12, M_("bone"))
    for (x, z, w, h) in [(0, 1.84, 2.1, 0.08), (0, 0.86, 2.1, 0.08), (1.04, 1.35, 0.08, 1.05), (-1.04, 1.35, 0.08, 1.05)]:
        box("wf", (w, 0.26, h), M_("gold"), (x, -1.0, z))
    for i, x in enumerate((-0.64, 0, 0.64)):
        cylinder(f"reel{i}", 0.45, 0.56, M_("bone"), (x, -0.62, 1.35), rot=(0, math.pi / 2, 0), segs=48)
        # a symbol on each reel's face: an ember, a ruby, an ember (a line of three)
        sym = M_("ember") if i != 1 else M_("ruby")
        sphere(f"sym{i}", 0.15, sym, (x, -1.07, 1.35), segs=16, scale=(1, 0.5, 1))
    cylinder("lever", 0.05, 1.3, M_("gold"), (1.4, 0, 1.9), segs=12)
    sphere("knob", 0.2, M_("lavabright"), (1.4, 0, 2.6), segs=24)
    cylinder("pivot", 0.14, 0.3, M_("gold"), (1.3, 0, 1.3), rot=(0, math.pi / 2, 0), segs=16)
    camera((0.6, -8.0, 3.2), (0.1, 0, 1.6), ortho=6.2)
    key_lights(0.8)


def tile_ascent():
    ground = box("ground", (5.0, 2.0, 0.3), M_("rockglow"), (0, 0.5, -0.15))
    displace(ground, 0.1, 0.5, 3)
    # the climb: a glowing curve from the lower left
    curve("climb", [(-1.9, -0.2, 0.2, 0.6), (-0.8, -0.2, 0.55, 0.8), (0.2, -0.2, 1.3, 1.0), (0.85, -0.2, 2.4, 1.2)], 0.06, M_("lavabright"))
    # the Magma Tower waiting on the right
    t = cylinder("tower", 0.36, 1.5, M_("rock"), (1.75, 0.3, 0.75), segs=10, r2=0.26)
    displace(t, 0.05, 0.3, 2)
    cylinder("towertop", 0.3, 0.1, M_("lavabright"), (1.75, 0.3, 1.52), segs=16)
    for i in range(4):
        a = i * math.pi / 2
        cone(f"spike{i}", 0.08, 0.3, M_("bone"), (1.75 + math.cos(a) * 0.3, 0.3 + math.sin(a) * 0.3, 1.45), segs=6)
    camera((0, -9.0, 2.6), (0, 0, 1.2), ortho=4.8)
    key_lights(0.8)


def tile_derby():
    # a curved lane of lava between basalt banks, a gold arch over the finish
    track = torus("lane", 3.0, 0.45, M_("lavabright"), (0, 3.0, -0.13), seg=96)
    track.scale = (1, 1, 0.2)
    for R in (2.45, 3.55):
        bank = torus(f"bank{R}", R, 0.22, M_("rock"), (0, 3.0, -0.08), seg=96)
        displace(bank, 0.05, 0.3, 1)
    ground = box("ground", (12, 12, 0.2), M_("rockglow"), (0, 3.0, -0.25))
    for side in (-1, 1):
        cylinder(f"post{side}", 0.07, 1.4, M_("gold"), (side * 0.75, 0.0, 0.6), segs=12)
    curve("arch", [(-0.75, 0.0, 1.3), (0, 0.0, 1.65), (0.75, 0.0, 1.3)], 0.06, M_("gold"))
    sphere("archgem", 0.12, M_("ruby"), (0, -0.02, 1.65), segs=16)
    camera((0.3, -7.5, 5.4), (0, 1.2, 0.3), ortho=6.4)
    key_lights(0.8)


# ------------------------------------------------------------------ Wormzer Roulette
N_SEG = 29


def seg_xy(a_deg, r):
    """A point at r from the middle, a degrees clockwise from the top (as the game turns the wheel)."""
    a = math.radians(a_deg)
    return (math.sin(a) * r, math.cos(a) * r)


def scene_wheel():
    """The wheel from above (240 px across in the game, 1 unit = 100 px): 29 segments round a band from
    0.58 to 1.04, segment i centred i x 360 / 29 degrees clockwise from the top; King Wormzer's (0) purple,
    then Lava on odd segments and Ash on even ones; the ball's track outside it. assemble.py adds the
    monsters' heads."""
    setup(720, 720)
    BG.inputs[1].default_value = 0.5
    step = 360 / N_SEG
    bm = bmesh.new()
    for i in range(N_SEG):
        a0, a1 = (i - 0.5) * step, (i + 0.5) * step
        vs = []
        for (a, r) in [(a0, 0.58), (a0, 1.04), (a1, 1.04), (a1, 0.58)]:
            x, y = seg_xy(a, r)
            vs.append(bm.verts.new((x, y, 0.0)))
        # more points along the arcs so the band is round
        f = bm.faces.new(vs)
        f.material_index = 2 if i == 0 else (0 if i % 2 == 1 else 1)
    ob = mesh_obj("band", bm, M_("wheelred"))
    ob.data.materials.append(M_("black"))
    ob.data.materials.append(M_("wheelpurple"))
    sub = ob.modifiers.new("s", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.levels = sub.render_levels = 3
    for i in range(N_SEG):
        a = (i + 0.5) * step
        x, y = seg_xy(a, 0.81)
        box(f"sep{i}", (0.018, 0.47, 0.04), M_("golddim"), (x, y, 0.02), (0, 0, -math.radians(a)))
    torus("inner", 0.58, 0.025, M_("golddim"), (0, 0, 0.02), seg=96)
    torus("outer", 1.045, 0.025, M_("golddim"), (0, 0, 0.02), seg=96)
    cylinder("track", 1.2, 0.04, M_("obsidian"), (0, 0, -0.03), segs=96)
    cylinder("hub", 0.57, 0.05, M_("obsidian"), (0, 0, 0.0), segs=96)
    torus("hubring", 0.42, 0.02, M_("golddim"), (0, 0, 0.03), seg=64)
    torus("lavaring", 0.3, 0.018, M_("rim"), (0, 0, 0.03), seg=64)
    cone("spindle", 0.14, 0.4, M_("golddim"), (0, 0, 0.04), segs=24)
    for k in range(4):
        a = k * 90 + 45
        x, y = seg_xy(a, 0.36)
        curve(f"arm{k}", [(0, 0, 0.3), (x * 0.5, y * 0.5, 0.25), (x, y, 0.12, 0.6)], 0.03, M_("golddim"))
        sphere(f"armknob{k}", 0.05, M_("golddim"), (x, y, 0.12), segs=12)
    camera((0, 0, 10), (0, 0, 0), ortho=2.4)
    light("AREA", (-3.5, 3.5, 6), 380, (1.0, 0.92, 0.85), 4.0)
    light("AREA", (4, -3, 3), 90, (1.0, 0.5, 0.2), 3.0)


def scene_rim():
    """The rim round the wheel (260 px across) and the pointer at the top."""
    setup(780, 780)
    BG.inputs[1].default_value = 0.5
    torus("rim", 1.225, 0.05, M_("gold"), (0, 0, 0.05), seg=128)
    ring = cylinder("ring", 1.3, 0.06, M_("obsidian"), (0, 0, 0.0), segs=128)
    hole = cylinder("hole", 1.2, 0.3, M_("obsidian"), (0, 0, 0.0), segs=128)
    m = ring.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = hole
    m.solver = "EXACT"
    hole.hide_render = True
    for k in range(12):
        x, y = seg_xy(k * 30 + 15, 1.26)
        sphere(f"stud{k}", 0.025, M_("ruby"), (x, y, 0.07), segs=10)
    # the pointer: a gold claw pointing in at the top, a ruby on it
    bm = bmesh.new()
    pts = [(-0.09, 1.3, 0.08), (0.09, 1.3, 0.08), (0.0, 1.03, 0.08)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new(v)
    tri = mesh_obj("pointer", bm, M_("gold"))
    sol = tri.modifiers.new("t", "SOLIDIFY")
    sol.thickness = 0.04
    bevel(tri, 0.01, 2)
    sphere("pgem", 0.035, M_("ruby"), (0, 1.22, 0.12), segs=12)
    camera((0, 0, 10), (0, 0, 0), ortho=2.6)
    light("AREA", (-3.5, 3.5, 6), 380, (1.0, 0.92, 0.85), 4.0)
    light("AREA", (4, -3, 3), 90, (1.0, 0.5, 0.2), 3.0)


# ------------------------------------------------------------------ Magma Slots
def px(x, y):
    """A point of the cabinet picture (480 x 400 in the game) in the world: 1 unit = 100 px, from the front."""
    return (x - 240) / 100, (200 - y) / 100


def scene_cabinet():
    """Moloch's idol: a basalt block with horns, glowing eyes and a plaque on its brow (the jackpot is
    written there by the game), the reels' window in its chest (a hole: the game draws the reels
    behind it) and its open mouth below, lava in it."""
    setup(960, 800)
    BG.inputs[1].default_value = 0.2
    scene.view_settings.exposure = -0.35
    body = box("body", (4.0, 1.2, 3.35), M_("cabinetrock"), (0, 0.6, -0.175))
    bevel(body, 0.1, 3)
    wx0, wz0 = px(94, 120)
    wx1, wz1 = px(386, 312)
    cut = box("cut", (wx1 - wx0 - 0.04, 4, wz0 - wz1 - 0.04), M_("black"), (0, 0, (wz0 + wz1) / 2))
    m = body.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = cut
    m.solver = "EXACT"
    cut.hide_render = True
    # the window's gold frame, over the reels' edges
    t = 0.12
    zc = (wz0 + wz1) / 2
    for (x, z, w, h) in [(0, wz0 + t / 2 - 0.02, wx1 - wx0 + 2 * t, t), (0, wz1 - t / 2 + 0.02, wx1 - wx0 + 2 * t, t),
                         (wx0 - t / 2 + 0.02, zc, t, wz0 - wz1 + 2 * t), (wx1 + t / 2 - 0.02, zc, t, wz0 - wz1 + 2 * t)]:
        bevel(box("frame", (w, 0.16, h), M_("golddim"), (x, -0.06, z)), 0.03, 2)
    # dividers between the reels (the game's reels are 92 px with 8 between)
    for k in (1, 2):
        x, _ = px(94 + k * 100 - 4, 0)
        box(f"div{k}", (0.06, 0.1, wz0 - wz1), M_("golddim"), (x, -0.02, zc))
    # the brow: a plaque for the jackpot, eyes either side
    x0, z0 = px(110, 62)
    x1, z1 = px(370, 110)
    bevel(box("plaque", (x1 - x0, 0.1, z0 - z1), M_("black"), (0, -0.04, (z0 + z1) / 2)), 0.02, 2)
    for (x, z, w, h) in [(0, z0 + 0.03, x1 - x0 + 0.1, 0.05), (0, z1 - 0.03, x1 - x0 + 0.1, 0.05), (x0 - 0.03, (z0 + z1) / 2, 0.05, z0 - z1 + 0.1), (x1 + 0.03, (z0 + z1) / 2, 0.05, z0 - z1 + 0.1)]:
        box("pframe", (w, 0.12, h), M_("golddim"), (x, -0.06, z))
    for side in (-1, 1):
        ex, ez = side * 1.66, (z0 + z1) / 2
        sphere(f"eye{side}", 0.13, M_("eyeglow"), (ex, -0.02, ez), segs=24, scale=(1.3, 0.6, 0.8))
        box(f"brow{side}", (0.5, 0.18, 0.1), M_("rock"), (ex, -0.05, ez + 0.2), (0, side * 0.35, 0))
        curve(f"horn{side}", [(side * 1.75, 0.3, 1.45, 1.0), (side * 2.15, 0.3, 1.6, 0.8), (side * 2.3, 0.3, 1.85, 0.45), (side * 2.15, 0.3, 1.97, 0.05)], 0.16, M_("bone"))
    dome = cylinder("dome", 0.45, 1.0, M_("rock"), (0, 0.6, 1.5), rot=(math.pi / 2, 0, 0), segs=48)
    cone("gemspike", 0.08, 0.2, M_("golddim"), (0, 0.2, 1.88), segs=8)
    sphere("crowngem", 0.09, M_("ruby"), (0, 0.1, 1.72), segs=16)
    # the mouth: a dark tray with lava at its bottom, teeth
    mx0, mz0 = px(130, 330)
    mx1, mz1 = px(350, 372)
    box("mouth", (mx1 - mx0, 0.1, mz0 - mz1), M_("black"), (0, -0.02, (mz0 + mz1) / 2))
    box("mlava", (mx1 - mx0 - 0.1, 0.12, 0.1), M_("lavabright"), (0, -0.04, mz1 + 0.08))
    for k in range(9):
        x = mx0 + 0.12 + k * (mx1 - mx0 - 0.24) / 8
        cone(f"tooth{k}", 0.06, 0.16, M_("bone"), (x, -0.08, mz0 + 0.01), rot=(math.pi, 0, 0), segs=6)
    for k in range(7):
        x = mx0 + 0.25 + k * (mx1 - mx0 - 0.5) / 6
        cone(f"ltooth{k}", 0.05, 0.12, M_("bone"), (x, -0.08, mz1 - 0.01), segs=6)
    # the plinth and the lever's mount (the game draws the lever at 456, 262)
    bevel(box("plinth", (4.4, 1.4, 0.2), M_("rock"), (0, 0.6, -1.92)), 0.04, 2)
    lx, lz = px(456, 262)
    cylinder("mount", 0.13, 0.2, M_("golddim"), (lx - 0.14, 0.4, lz), rot=(0, math.pi / 2, 0), segs=24)
    box("mountplate", (0.12, 0.5, 0.4), M_("golddim"), (2.02, 0.4, lz))
    camera((0, -10, 0), (0, 0, 0), ortho=4.8)
    light("AREA", (-4, -6, 5), 420, (1.0, 0.88, 0.78), 4.0, (0, 0, 0))
    light("AREA", (0, -4, -4.5), 520, (1.0, 0.38, 0.1), 5.0, (0, 0, 0))
    light("AREA", (5, -1, 1), 300, (1.0, 0.45, 0.15), 3.0, (0, 0, 0))


def scene_lever():
    """The lever (36 x 140 in the game), its pivot at the bottom middle."""
    setup(108, 420)
    BG.inputs[1].default_value = 0.5
    cylinder("rod", 0.045, 1.08, M_("gold"), (0, 0, 0.56), segs=16)
    sphere("knob", 0.16, M_("lavabright"), (0, 0, 1.22), segs=32)
    torus("collar", 0.06, 0.02, M_("gold"), (0, 0, 1.06), seg=24)
    camera((0, -10, 0.7), (0, 0, 0.7), ortho=1.4)
    light("AREA", (-3, -6, 4), 500, (1.0, 0.9, 0.8), 3.0, (0, 0, 0.7))
    light("AREA", (3, -4, -1), 150, (1.0, 0.45, 0.15), 3.0, (0, 0, 0.7))


# ------------------------------------------------------------------ Bone Pile
def ash_floor(nt):
    """A cave floor: dark basalt with drifts of pale ash, a few cracks glowing faintly."""
    rk = rock(nt, 0.6, 3.0, 0.5)
    ash = principled(nt, (0.34, 0.31, 0.29), 0.95)
    nb = noise(nt, 12.0, 6, 0.6)
    bb = bump(nt, nb.outputs["Fac"], 0.25)
    nt.links.new(bb.outputs[0], ash.inputs["Normal"])
    mask = noise(nt, 0.9, 5, 0.6)
    mr = ramp(nt, [(0.5, (0, 0, 0)), (0.62, (1, 1, 1))])
    nt.links.new(mask.outputs["Fac"], mr.inputs[0])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Color"], mix.inputs[0])
    nt.links.new(rk.outputs[0], mix.inputs[1])
    nt.links.new(ash.outputs[0], mix.inputs[2])
    return mix


def scene_grid_bg():
    """Under Bone Pile's grid (474 x 394 in the game): a cave floor seen from above."""
    setup(948, 788, transparent=False, ambient=0.2)
    M["ashfloor"] = mat("ashfloor", ash_floor)
    fl = box("floor", (6.0, 5.0, 0.3), M["ashfloor"], (0, 0, -0.15))
    displace(fl, 0.08, 0.5, 5)
    for i in range(40):
        x, y = rng.uniform(-2.4, 2.4), rng.uniform(-2.0, 2.0)
        rock_lump(f"pebble{i}", rng.uniform(0.03, 0.08), M_("rock"), (x, y, 0.0), 0.4, 0.5, seed=60 + i)
    camera((0, 0, 10), (0, 0, 0), ortho=4.74)
    light("AREA", (-3, 3, 6), 500, (1.0, 0.88, 0.78), 5.0)
    light("AREA", (3, -3, 1.5), 300, (1.0, 0.4, 0.1), 5.0)


def skull(loc, s=1.0):
    x, y, z = loc
    head = sphere("skull", 0.34 * s, M_("bone"), (x, y, z), segs=32, scale=(0.9, 0.95, 0.85))
    jaw = box("jaw", (0.36 * s, 0.26 * s, 0.14 * s), M_("bone"), (x, y - 0.12 * s, z - 0.3 * s))
    bevel(jaw, 0.05 * s, 3)
    for side in (-1, 1):
        sphere(f"socket{side}", 0.09 * s, M_("black"), (x + side * 0.12 * s, y - 0.27 * s, z + 0.02 * s), segs=16)
        sphere(f"spark{side}", 0.03 * s, M_("rim"), (x + side * 0.12 * s, y - 0.33 * s, z + 0.02 * s), segs=10)
    sphere("nose", 0.04 * s, M_("black"), (x, y - 0.31 * s, z - 0.1 * s), segs=10)
    for k in range(4):
        box(f"tooth{k}", (0.05 * s, 0.03 * s, 0.05 * s), M_("bone"), (x + (k - 1.5) * 0.07 * s, y - 0.25 * s, z - 0.21 * s))


def scene_pile():
    """A heap of bones with a skull on it (72 px in the game)."""
    setup(216, 216)
    BG.inputs[1].default_value = 0.5
    for i in range(14):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.0, 0.55)
        z = 0.08 + (0.55 - r) * 0.5 + rng.uniform(0, 0.1)
        bone_piece(f"b{i}", rng.uniform(0.5, 0.8), 0.06, (math.cos(a) * r, math.sin(a) * r, z),
                   (rng.uniform(1.2, 1.9), rng.uniform(-0.4, 0.4), rng.uniform(0, 3.14)))
    skull((0.05, -0.2, 0.62), 0.9)
    camera((0, -9.0, 6.5), (0, 0, 0.3), ortho=1.9)
    key_lights(1.0)


def scene_crystal():
    """A magma crystal, found under a safe pile (52 px in the game)."""
    setup(156, 156)
    BG.inputs[1].default_value = 0.5
    M["magmacrystal"] = mat("magmacrystal", crystal((0.9, 0.16, 0.02), 0.55))
    rock_lump("base", 0.35, M_("rock"), (0, 0, -0.25), 0.3, 0.5, seed=7)
    specs = [(0, 0, 0.9, 0.16, 0, 0), (0.2, 0.05, 0.6, 0.12, 0.4, 0.2), (-0.2, 0.05, 0.65, 0.12, -0.45, -0.1), (0.05, -0.18, 0.45, 0.1, 0.15, -0.5)]
    for i, (x, y, h, r, rx, ry) in enumerate(specs):
        shard(f"x{i}", r, h, M["magmacrystal"], (x, y, -0.1), (ry, rx, rng.uniform(0, 1)), sides=6)
    camera((0, -9.0, 5.2), (0, 0, 0.35), ortho=1.6)
    key_lights(0.8)


# ------------------------------------------------------------------ Balthazar's Ascent
def scene_sky():
    """What Balthazar flies over (960 x 300 in the game, scrolled; its right edge is joined to a mirrored
    copy): a lava sea and dark rock spires, rendered on nothing; assemble.py puts a hazy cavern sky
    behind them."""
    setup(1440, 450, transparent=True, ambient=0.05)
    BG.inputs[0].default_value = (0.2, 0.05, 0.03, 1)
    M["lavasea"] = mat("lavasea", lambda nt: lava(nt, 2.2, 0.9))
    box("sea", (160, 80, 0.2), M["lavasea"], (0, 40, -0.1))
    for i in range(34):
        x = rng.uniform(-45, 45)
        y = rng.uniform(6, 70)
        h = rng.uniform(3, 11) * (0.7 + y / 50)
        c = cone(f"spire{i}", rng.uniform(0.8, 2.2) * (0.7 + y / 70), h, M_("rock"), (x, y, -0.2), segs=8)
        displace(c, 0.35, 1.2, 2, seed=30 + i)
    for x in (-36, -18, 0, 18, 36):
        light("POINT", (x, 18, 1.5), 350, (1.0, 0.35, 0.08), 3.0)
    camera((0, -18, 3.5), (0, 30, 7.5), lens=26)


def scene_tower():
    """A Magma Tower (70 x 120 in the game): a basalt tower, lava at its top, its gun aimed up to the left."""
    setup(210, 360)
    BG.inputs[1].default_value = 0.5
    t = cylinder("tower", 0.5, 2.4, M_("rockglow"), (0, 0, 1.2), rot=(0, 0, 2.2), segs=10, r2=0.36)
    displace(t, 0.05, 0.4, 2)
    torus("ring", 0.4, 0.07, M_("gold"), (0, 0, 2.4), seg=32)
    cylinder("top", 0.36, 0.08, M_("lavabright"), (0, 0, 2.42), segs=24)
    for k in range(5):
        a = k * 2 * math.pi / 5
        cone(f"spike{k}", 0.08, 0.35, M_("bone"), (math.cos(a) * 0.4, math.sin(a) * 0.4, 2.35), segs=6)
    barrel = cylinder("barrel", 0.1, 0.9, M_("obsidian"), (-0.35, 0, 2.75), rot=(0, math.radians(-40), 0), segs=16)
    sphere("muzzle", 0.12, M_("lavabright"), (-0.64, 0, 3.1), segs=16)
    box("base", (1.3, 1.3, 0.2), M_("rock"), (0, 0, 0.1))
    camera((0, -9.0, 2.2), (0, 0, 1.75), ortho=3.8)
    key_lights(0.8)


# ------------------------------------------------------------------ Magma Derby
def scene_track():
    """The Derby's track seen from the side and above (960 x 226 in the game, repeated mirrored): a canyon
    wall at the back, a basalt floor for the six lanes, a lava channel in front."""
    setup(1920, 452, transparent=False, ambient=0.1)
    BG.inputs[0].default_value = (0.12, 0.04, 0.03, 1)
    M["ashfloor"] = mat("ashfloor", ash_floor)
    fl = box("floor", (40, 7, 0.3), M["ashfloor"], (0, 0, -0.15))
    # (the floor is the Derby's lanes: darker, so the runners stand out)
    displace(fl, 0.04, 0.4, 5)
    box("channel", (40, 1.4, 0.2), M_("lava"), (0, -4.2, -0.35))
    bank = box("bank", (40, 0.5, 0.5), M_("rock"), (0, -3.5, -0.1))
    displace(bank, 0.1, 0.4, 3)
    wall = box("wall", (40, 1.5, 6), M_("rockwall"), (0, 4.2, 2.5))
    displace(wall, 0.5, 1.2, 5, seed=4)
    for i in range(12):
        x = -18 + i * 3.2 + rng.uniform(-0.8, 0.8)
        cylinder(f"torch{i}", 0.08, 0.9, M_("bone"), (x, 3.3, 0.45), segs=8)
        sphere(f"flame{i}", 0.13, M_("lavabright"), (x, 3.3, 0.95), segs=12)
        light("POINT", (x, 3.0, 1.2), 25, (1.0, 0.45, 0.12), 0.3)
    light("AREA", (0, -6, 6), 1400, (1.0, 0.85, 0.75), 12.0, (0, 0, 0))
    light("AREA", (0, -5, -1), 600, (1.0, 0.4, 0.1), 12.0, (0, 0, 0))
    camera((0, -9, 12.5), (0, 0.9, 0.3), ortho=30)


def scene_finish():
    """The finish: a bone arch with a skull and a flag (60 x 208 in the game)."""
    setup(180, 624)
    BG.inputs[1].default_value = 0.5
    for side in (-1, 1):
        curve(f"post{side}", [(side * 0.35, 0, 0.0, 1.0), (side * 0.3, 0, 2.0, 0.9), (side * 0.18, 0, 3.4, 0.8)], 0.07, M_("bone"))
    curve("arch", [(-0.18, 0, 3.4), (0, 0, 3.7), (0.18, 0, 3.4)], 0.07, M_("bone"))
    skull((0, -0.05, 3.85), 0.5)
    cylinder("pole", 0.025, 1.0, M_("gold"), (0.12, 0, 4.35), segs=8)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in [(0.12, 0, 4.8), (0.62, -0.05, 4.68), (0.12, 0, 4.5)]]
    bm.faces.new(vs)
    flag = mesh_obj("flag", bm, M_("redlava"))
    flag.modifiers.new("t", "SOLIDIFY").thickness = 0.02
    camera((0, -10, 2.55), (0, 0, 2.55), ortho=5.3)
    key_lights(0.8)


TILES = {"magmadrop": tile_magmadrop, "scratch": tile_scratch, "roulette": tile_roulette, "bonepile": tile_bonepile,
         "slots": tile_slots, "ascent": tile_ascent, "derby": tile_derby}


def scene_tile(name):
    setup(456, 300)
    BG.inputs[1].default_value = 0.5
    TILES[name]()


if WHAT == "peg":
    scene_peg()
elif WHAT == "cup":
    scene_cup()
elif WHAT == "board":
    scene_board()
elif WHAT == "lobby":
    scene_lobby()
elif WHAT == "wheel":
    scene_wheel()
elif WHAT == "rim":
    scene_rim()
elif WHAT == "cabinet":
    scene_cabinet()
elif WHAT == "lever":
    scene_lever()
elif WHAT == "track":
    scene_track()
elif WHAT == "finish":
    scene_finish()
elif WHAT == "sky":
    scene_sky()
elif WHAT == "tower":
    scene_tower()
elif WHAT == "grid_bg":
    scene_grid_bg()
elif WHAT == "pile":
    scene_pile()
elif WHAT == "crystal":
    scene_crystal()
elif WHAT.startswith("card_"):
    scene_card(WHAT[5:])
elif WHAT.startswith("sym_"):
    scene_symbol(WHAT[4:])
elif WHAT.startswith("tile_"):
    scene_tile(WHAT[5:])
else:
    raise SystemExit("unknown: " + WHAT)
render()
