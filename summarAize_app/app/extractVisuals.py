import os
import pdfplumber
import re
import argparse
import glob
from PIL import Image
from moviepy.editor import *
import moviepy.video.fx.all as vfx


def generate_visuals_video(
    visuals_folder, 
    output_video="visuals_walkthrough.mp4", 
    duration_per_visual=3, 
    voiceover_path=None  # <-- NEW
):
    print(f"\n🎬 Generating video from visuals in: {visuals_folder}")

    # Get all extracted visuals (PNG)
    image_files = sorted(glob.glob(os.path.join(visuals_folder, "*.png")))
    print(f"Found {len(image_files)} visuals.")

    if not image_files:
        print("[!] No visuals found — aborting.")
        return

    final_clips = []

    for img_path in image_files:
        print(f"  → Adding {img_path}")
        img_clip = ImageClip(img_path).set_duration(duration_per_visual)
        img_clip = img_clip.fadein(0.5).fadeout(0.5)
        final_clips.append(img_clip)

    # Concatenate video
    final_video = concatenate_videoclips(final_clips, method="compose")

    # Add voiceover if provided
    if voiceover_path and os.path.exists(voiceover_path):
        print(f"🎙 Adding voiceover: {voiceover_path}")
        audio = AudioFileClip(voiceover_path)

        # Loop visuals to match audio duration
        if audio.duration > final_video.duration:
            loops_required = int(audio.duration // final_video.duration) + 1
            final_video = concatenate_videoclips([final_video] * loops_required).subclip(0, audio.duration)
        else:
            final_video = final_video.subclip(0, audio.duration)

        final_video = final_video.set_audio(audio)


    final_video.write_videofile(output_video, fps=24)
    print(f"\n✅ Video saved: {output_video}")


def clean_caption_text(text):
    return re.sub(r'[^a-zA-Z0-9_]', '_', text.strip())[:50]

def extract_visual_elements(pdf_path, output_folder="extracted_visuals"):
    os.makedirs(output_folder, exist_ok=True)

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"\n📄 Processing page {page_num + 1}")

            words = page.extract_words()
            images = page.images
            rects = page.rects

            for w in words:
                text = w['text']
                if text.lower().startswith(("figure", "fig.", "table")):
                    print(f"  → Found caption: {text} at {w}")

                    caption_y = w['top']
                    candidates = []

                    # Images
                    for img in images:
                        if img['bottom'] < caption_y + 20:
                            area = (img['x1'] - img['x0']) * (img['y1'] - img['y0'])
                            candidates.append({
                                'type': 'image',
                                'bbox': (img['x0'], img['top'], img['x1'], img['bottom']),
                                'area': area
                            })

                    # Rects
                    for r in rects:
                        if r['bottom'] < caption_y + 20:
                            area = (r['x1'] - r['x0']) * (r['y1'] - r['y0'])
                            candidates.append({
                                'type': 'rect',
                                'bbox': (r['x0'], r['top'], r['x1'], r['bottom']),
                                'area': area
                            })

                    if candidates:
                        candidates = sorted(candidates, key=lambda x: -x['area'])
                        best = candidates[0]
                        print(f"    → Selected {best['type']} bbox: {best['bbox']} (area {best['area']})")

                        # Validate and clean bbox coordinates
                        bbox = best['bbox']
                        x0, y0, x1, y1 = bbox
                        
                        # Ensure coordinates are non-negative and within reasonable bounds
                        x0 = max(0, x0)
                        y0 = max(0, y0)
                        x1 = max(x0 + 1, x1)  # Ensure x1 > x0
                        y1 = max(y0 + 1, y1)  # Ensure y1 > y0
                        
                        clean_bbox = (x0, y0, x1, y1)
                        print(f"    → Cleaned bbox: {clean_bbox}")

                        try:
                            cropped = page.crop(clean_bbox).to_image(resolution=300)
                            fname = f"page{page_num+1}_{clean_caption_text(text)}.png"
                            path = os.path.join(output_folder, fname)
                            cropped.save(path)
                            print(f"[✓] Saved: {fname}")
                        except Exception as crop_error:
                            print(f"    [!] Error cropping image: {crop_error}")
                            continue
                    else:
                        print("    [!] No nearby image/rect found — skipping.")

    print("\n✅ Extraction complete!")

def main():
    parser = argparse.ArgumentParser(description="Extract figures, images, and tables from a PDF and generate a walkthrough video.")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("audio", help="Path to audio file")
    parser.add_argument("-o", "--output", default="extracted_visuals", help="Folder to save extracted visuals")
    parser.add_argument("-v", "--video", default="visuals_walkthrough.mp4", help="Filename for output video")
    args = parser.parse_args()

    # Extract visuals
    extract_visual_elements(args.pdf_path, args.output)

    # Generate video
    generate_visuals_video(visuals_folder=args.output, output_video=args.video, duration_per_visual=3, voiceover_path=args.audio)

if __name__ == "__main__":
    main()
