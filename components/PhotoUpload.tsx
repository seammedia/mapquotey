"use client";

import { useState, useRef } from "react";
import { PhotoUpload as PhotoUploadType } from "@/types";
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  ZoomIn,
  Trash2,
} from "lucide-react";

interface PhotoUploadProps {
  photos: PhotoUploadType[];
  onPhotosChange: (photos: PhotoUploadType[]) => void;
}

export default function PhotoUploadComponent({
  photos,
  onPhotosChange,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoUploadType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newPhotos: PhotoUploadType[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photo: PhotoUploadType = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: e.target?.result as string,
            uploadedAt: new Date(),
          };
          newPhotos.push(photo);

          if (newPhotos.length === files.length) {
            onPhotosChange([...photos, ...newPhotos.filter((p) => p.preview)]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDeletePhoto = (photoId: string) => {
    onPhotosChange(photos.filter((p) => p.id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
    }
  };

  const updatePhotoDescription = (photoId: string, description: string) => {
    onPhotosChange(
      photos.map((p) => (p.id === photoId ? { ...p, description } : p))
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-orange-500 bg-orange-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Camera className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Upload site photos
            </p>
            <p className="text-xs text-gray-500">
              Drag & drop or click to select images
            </p>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={photo.preview}
                alt={photo.description || "Site photo"}
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setSelectedPhoto(photo)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Description indicator */}
              {photo.description && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Photo Details</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <img
                src={selectedPhoto.preview}
                alt={selectedPhoto.description || "Site photo"}
                className="w-full h-auto max-h-[50vh] object-contain rounded-lg"
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedPhoto.description || ""}
                  onChange={(e) =>
                    updatePhotoDescription(selectedPhoto.id, e.target.value)
                  }
                  placeholder="Add a description for this photo..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => handleDeletePhoto(selectedPhoto.id)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                Delete Photo
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
