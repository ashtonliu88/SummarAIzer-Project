import React, { useEffect, useState } from "react";

const ExtractedImages = ({ folderUrl }) => {
  const [imageUrls, setImageUrls] = useState([]);

  useEffect(() => {
    // Example: GET /api/list-images?folder=extracted_images
    // Backend should return an array of image filenames
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/list-images?folder=${folderUrl}`);
        const filenames = await response.json();

        const urls = filenames.map(
          (filename) => `/static/${folderUrl}/${filename}`
        );
        setImageUrls(urls);
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };

    fetchImages();
  }, [folderUrl]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Extracted Images</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {imageUrls.length === 0 ? (
          <p className="text-gray-500">No images found.</p>
        ) : (
          imageUrls.map((url, index) => (
            <div key={index} className="border rounded shadow">
              <img
                src={url}
                alt={`Extracted ${index}`}
                className="w-full h-auto object-contain"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExtractedImages;