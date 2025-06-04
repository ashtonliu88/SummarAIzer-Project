import fitz  # PyMuPDF
import os
import argparse
from moviepy.editor import ImageSequenceClip

def extract_images(pdf_path, output_folder):
    os.makedirs(output_folder, exist_ok=True)
    doc = fitz.open(pdf_path)
    saved_images = []

    for page_number, page in enumerate(doc, start=1):
        image_list = page.get_images(full=True)
        if not image_list:
            continue

        for img_index, img_info in enumerate(image_list, start=1):
            xref = img_info[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image.get("ext", "png")

            image_name = f"page{page_number}_img{img_index}.{image_ext}"
            image_path = os.path.join(output_folder, image_name)

            with open(image_path, "wb") as img_file:
                img_file.write(image_bytes)

            saved_images.append(image_path)
            print(f"Extracted {image_name}")

    if not saved_images:
        print("No images found in the PDF.")
    return saved_images

def create_video_from_images(image_paths, output_video_path, fps=1):
    if not image_paths:
        print("No images to create a video.")
        return

    clip = ImageSequenceClip(image_paths, fps=fps)
    clip.write_videofile(output_video_path, codec="libx264", audio=False)
    print(f"Video saved to {output_video_path}")

def main():
    parser = argparse.ArgumentParser(description="Extract images from a PDF file and optionally create a video.")
    parser.add_argument("pdf_path", help="Path to the PDF to extract images from")
    parser.add_argument("-o", "--output", default="extracted_images", help="Directory to save extracted images")
    parser.add_argument("-v", "--video", default="output_video.mp4", help="Path to save the video file")
    parser.add_argument("--fps", type=int, default=1, help="Frames per second for the output video")
    args = parser.parse_args()

    images = extract_images(args.pdf_path, args.output)
    create_video_from_images(images, args.video, fps=args.fps)

if __name__ == "__main__":
    main()
