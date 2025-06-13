from openai import OpenAI
import os
import requests
import json
from pathlib import Path
import argparse
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OpenAI API key not found")
        
client = OpenAI(api_key=api_key)

def convert_to_visual_prompt(sentence: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a visual prompt generator for a scientific image model."},
            {"role": "user", "content": f"Convert this sentence into a detailed visual prompt for a scientific diagram: {sentence}"}
        ]
    )
    return response.choices[0].message.content.strip()


def extract_sentences_from_alignment(alignment_path: str):
    with open(alignment_path, "r") as f:
        alignment = json.load(f)

    fragments = alignment.get("fragments", [])
    sentences = [frag["lines"][0] for frag in fragments if frag.get("lines") and frag["lines"][0].strip()]
    return sentences

def generate_and_save_images(sentences, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    image_paths = []

    for idx, sentence in enumerate(sentences):
        prompt = (
            f"Diagram illustrating only one of the key concepts: {sentence}. "
            "Clean white background, thin black lines, no shadows, no text or symbols. "
            "Use simple shapes and arrows to represent relationships. "
            "No 3D, no artistic effects. Diagram should look like it was taken from a modern academic paper or textbook."
            "Just simple show one of the concepts visually, no text, no complex details."
        )

        try:
            # prompt = convert_to_visual_prompt(sentence)
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024"
            )
            image_url = response.data[0].url
            img_data = requests.get(image_url).content

            image_path = Path(output_dir) / f"{idx}.png"
            with open(image_path, 'wb') as f:
                f.write(img_data)

            image_paths.append(str(image_path))
        except Exception as e:
            print(f"[!] Error generating image for sentence {idx}: {e}")
            image_paths.append(None)

    return image_paths


def build_visual_alignment(sentences, image_paths, output_json_path):
    aligned = [
        {"sentence": s, "image_path": p} 
        for s, p in zip(sentences, image_paths) 
        if s and p
    ]

    with open(output_json_path, "w") as f:
        json.dump({"alignment": aligned}, f, indent=2)

    return output_json_path

def generate_visual_alignment(alignment_path: str, output_image_folder: str, output_alignment_path: str):
    sentences = extract_sentences_from_alignment(alignment_path)
    print(f"[✓] Extracted {len(sentences)} sentences from alignment")

    image_paths = generate_and_save_images(sentences, output_image_folder)
    print(f"[✓] Generated {len([p for p in image_paths if p])} images")

    output_path = build_visual_alignment(sentences, image_paths, output_alignment_path)
    print(f"[✓] Visual alignment saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate visual alignment from PDF")
    parser.add_argument("alignment_path", help="Path to the alignment JSON file")
    parser.add_argument("-o", "--output_image_folder", default="generated_images", help="Folder to save generated images")
    parser.add_argument("-a", "--output_alignment_path", default="visual_alignment.json", help="Path to save the visual alignment JSON")
    args = parser.parse_args()
    generate_visual_alignment(args.alignment_path, args.output_image_folder, args.output_alignment_path)

if __name__ == "__main__":
    main()

__all__ = ["generate_visual_alignment"]