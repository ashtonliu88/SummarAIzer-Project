import fitz  # PyMuPDF
import os
import argparse
from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip 


def extract_images(pdf_path, output_folder):
    """Extracts images from a PDF and saves them to the output folder."""
    os.makedirs(output_folder, exist_ok=True)
    doc = fitz.open(pdf_path)
    saved = []

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

            saved.append(os.path.basename(image_path))
            print(f"Extracted {image_name}")

    return saved


def create_video_from_images(image_paths, output_video_path, fps=1, image_duration=2, transition_duration=1, audio_path=None):
    """
    generates video from a list of image paths, adding optional crossfade transitions and audio.

    image_paths (List[str]): List of file paths to images in the desired order.
    output_video_path (str): Path where the final video will be saved.
    fps (int): Frames per second for export. (Default: 1)
    image_duration (float): Duration (in seconds) each image is shown before transitioning. (Default: 2)
        transition_duration (float): Duration (in seconds) of crossfade between images. (Default: 1)
    audio_path (str or None): Path to an audio file (MP3, WAV, etc.) to add as background. (Default: None)
    """
    if not image_paths:
        print("No images.")
        return

    clips = []
    for img_path in image_paths:
        if not os.path.exists(img_path):
            print(f"Warning: {img_path} not found; skipping.")
            continue
        clip = ImageClip(img_path).set_duration(image_duration)
        clips.append(clip)

    if not clips:
        print("No valid image clips; aborting.")
        return

    #transitionsss
    for i in range(1, len(clips)):
        clips[i] = clips[i].crossfadein(transition_duration)

   
    final_clip = concatenate_videoclips(clips, method="compose")

    # Attach audio if provided
    if audio_path:
        if os.path.exists(audio_path):
            try:
                audio_clip = AudioFileClip(audio_path)
                # Trim or loop audio to match video length
                if audio_clip.duration < final_clip.duration:
                    # Loop audio
                    audio_clip = audio_clip.audio_loop(duration=final_clip.duration)
                else:
                    # Cut audio to match
                    audio_clip = audio_clip.subclip(0, final_clip.duration)
                final_clip = final_clip.set_audio(audio_clip)
            except Exception as e:
                print(f"Error loading audio {audio_path}: {e}")
        else:
            print(f"Audio file {audio_path} not found; skipping audio.")

    
    final_clip.write_videofile(output_video_path, fps=fps, codec="libx264", audio_codec="aac")
    print(f"Video saved to {output_video_path}")


def main():
    parser = argparse.ArgumentParser(description="Extract images from a PDF and optionally create a video with transitions and audio.")
    parser.add_argument("pdf_path", help="Path to the PDF to extract images from.")
    parser.add_argument("-o", "--output", default="extracted_images", help="Folder to save extracted images.")
    parser.add_argument("-v", "--video", default=None, help="Path to save the generated video file (optional).")
    parser.add_argument("--fps", type=int, default=1, help="Frames per second for the video (default: 1).")
    parser.add_argument("--img-duration", type=float, default=2.0, help="Seconds each image is displayed (default: 2).")
    parser.add_argument("--transition", type=float, default=1.0, help="Seconds for crossfade between images (default: 1).")
    parser.add_argument("--audio", type=str, default=None, help="Path to audio file for background music (optional).")
    args = parser.parse_args()

    #image extraction
    print(f"Extracting images from {args.pdf_path} into folder '{args.output}'...")
    images = extract_images(args.pdf_path, args.output)

    #creating vid
    if args.video:
        
        image_full_paths = [os.path.join(args.output, img) for img in images]
        print(f"Creating video '{args.video}' with {len(image_full_paths)} images...")
        create_video_from_images(
            image_full_paths,
            args.video,
            fps=args.fps,
            image_duration=args.img_duration,
            transition_duration=args.transition,
            audio_path=args.audio
        )


if __name__ == "__main__":
    main()
