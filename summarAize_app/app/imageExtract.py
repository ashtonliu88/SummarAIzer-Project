import fitz  # PyMuPDF
import os
import argparse

def extract_images(pdf_path, output_folder):
    """
    Extract images from the specified PDF and save them to the output folder.
    """
    os.makedirs(output_folder, exist_ok=True)
    doc = fitz.open(pdf_path)
    

    for page_number, page in enumerate(doc, start=1):
        image_list = page.get_images(full=True) #returns a tuple
        if not image_list: #if there's no images on the page
            continue

        for img_index, img_info in enumerate(image_list, start=1): #
            xref = img_info[0]
            base_image = doc.extract_image(xref) #dict that hold the image and the file type (jpg, png, etc)
            image_bytes = base_image["image"]

            image_ext = base_image.get("ext", "png")
            
            image_name = f"page{page_number}_img{img_index}.{image_ext}"
            image_path = os.path.join(output_folder, image_name)

            with open(image_path, "wb") as img_file:
                img_file.write(image_bytes)

            
            print(f"Extracted {image_name}")

    


def main():
    parser = argparse.ArgumentParser(description="Extract images from a PDF file.")
    parser.add_argument(
        "pdf_path", help="path to the PDF to extract images"
    )
    parser.add_argument(
        "-o", "--output", default="extracted_images",
        help="place to save extracted images"
    )
    args = parser.parse_args()

    extract_images(args.pdf_path, args.output)


if __name__ == "__main__":
    main()