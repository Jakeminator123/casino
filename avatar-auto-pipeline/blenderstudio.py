"""Shared Blender studio, camera and review images for avatar GLBs."""

import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def configure_render_device(scene):
    scene.cycles.device = "CPU"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA", "METAL", "HIP"):
        try:
            prefs.compute_device_type = backend
            prefs.refresh_devices()
        except (TypeError, RuntimeError):
            continue
        devices = [device for device in prefs.devices if device.type == backend]
        if devices:
            for device in prefs.devices:
                device.use = device in devices
            scene.cycles.device = "GPU"
            break


def studio(scene, center, height):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.seed = 17
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    configure_render_device(scene)
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Khronos PBR Neutral"
    scene.view_settings.exposure = -0.7
    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.82, 0.88, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.16
    for name, vector, power, diameter in (
        ("Key", (-1.4, -1.7, 1.75), 190, 1.45),
        ("Fill", (1.5, -1.25, 0.65), 60, 1.35),
        ("Rim", (0.65, 1.6, 1.5), 55, 1.00),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = power * height**2
        light.shape = "DISK"
        light.size = diameter * height
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = center + height * np.array(vector)
        point_at(obj, center)
    camera = bpy.data.objects.new("Review camera", bpy.data.cameras.new("Orthographic"))
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = "ORTHO"
    camera.data.clip_start = 0.01 * height
    camera.data.clip_end = 12 * height
    return camera


def render_png(scene, camera, focus, scale, height, angle, size, path, elevation=0):
    theta = math.radians(angle)
    phi = math.radians(elevation)
    camera.location = focus + 3 * height * np.array(
        (math.sin(theta) * math.cos(phi), -math.cos(theta) * math.cos(phi), math.sin(phi)))
    point_at(camera, focus)
    camera.data.ortho_scale = scale
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_frame(scene, camera, focus, scale, height, angle, size, path):
    from PIL import Image

    render_png(scene, camera, focus, scale, height, angle, size, path)
    with Image.open(path) as src:
        rgba = src.convert("RGBA")
    canvas = Image.new("RGB", rgba.size, "#e2e7e6")
    canvas.paste(rgba, mask=rgba.getchannel("A"))
    return canvas


def plate(images, labels):
    from PIL import Image, ImageDraw, ImageFont

    font_path = Path("C:/Windows/Fonts/segoeui.ttf")
    font = (
        ImageFont.truetype(str(font_path), 22) if font_path.exists() else ImageFont.load_default(size=22)
    )
    width, height = images[0].size
    result = Image.new("RGB", (12 + len(images) * (width + 12), height + 62), "#f5f3ef")
    draw = ImageDraw.Draw(result)
    for index, (image, title) in enumerate(zip(images, labels)):
        x = 12 + index * (width + 12)
        draw.text((x, 12), title, font=font, fill="#203331")
        result.paste(image, (x, 48))
    return result


def save_review(image, path, digest, view):
    from PIL.PngImagePlugin import PngInfo

    metadata = PngInfo()
    metadata.add_text("ModelSHA256", digest)
    metadata.add_text("ReviewViews", str(view))
    metadata.add_text("Blender", bpy.app.version_string)
    image.save(path, pnginfo=metadata)


if __name__ == "__main__":
    configure_render_device(bpy.context.scene)
