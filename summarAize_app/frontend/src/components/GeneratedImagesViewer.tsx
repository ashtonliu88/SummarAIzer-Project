import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function GeneratedImagesViewer() {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/get-generated-images`)
      .then((res) => res.json())
      .then((data) => {
        setImages(data.image_urls || []);
      })
      .catch((err) => {
        console.error("Failed to fetch images:", err);
      });
  }, []);

  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Generated Diagrams</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((imgUrl, idx) => (
          <img
            key={idx}
            src={`${API_URL}${imgUrl}`}
            alt={`Diagram ${idx}`}
            className="w-full rounded-xl border shadow-sm"
          />
        ))}
      </div>
    </section>
  );
}
