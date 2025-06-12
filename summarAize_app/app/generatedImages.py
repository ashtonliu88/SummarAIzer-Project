import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class ImageGenerator:
    def __init__(self, api_key=None, model="dall-e-3"):
        self.model = model
        api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not found")

        self.client = OpenAI(api_key=api_key)

    def generate_image_from_caption(self, prompt_text, output_path, size="1024x1024"):
        try:
            print(f"Generating image for prompt: '{prompt_text}'")
            
            response = self.client.images.generate(model=self.model, prompt=prompt_text, n=1, size=size,response_format="b64_json")

            image_b64 = response.data[0].b64_json
            image_data = base64.b64decode(image_b64)

            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"Image saved: {output_path}")
        except Exception as e:
            print(f"Error generating image: {e}")


def generate_images_from_captions(captions_folder, output_folder="generated_images"):
    os.makedirs(output_folder, exist_ok=True)

    # Caption text filenames in extracted_visuals
    visual_files = [f for f in os.listdir(captions_folder) if f.lower().endswith(".png")]

    generator = ImageGenerator()

    for img_file in visual_files:
        base_name = os.path.splitext(img_file)[0]
        prompt_text = base_name.replace("_", " ")  #caption from filename
        output_path = os.path.join(output_folder, base_name + "_gen.png")
        generator.generate_image_from_caption(prompt_text, output_path)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate AI images based on extracted figure captions")
    parser.add_argument("captions_folder", help="Folder containing extracted visuals (used for prompts)")
    parser.add_argument("--output", "-o", default="generated_images", help="Folder to save generated images")
    args = parser.parse_args()

    generate_images_from_captions(args.captions_folder, args.output)
