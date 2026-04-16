"use client";

import { useState, useRef, useCallback } from "react";
import { RefreshCw, Upload } from "lucide-react";

const STYLES = ["bottts-neutral", "fun-emoji", "adventurer-neutral"];

function dicebearUrl(seed: string, style = "bottts-neutral") {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

interface AvatarPickerProps {
  value: string;
  onChange: (url: string) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [seeds, setSeeds] = useState<string[]>(() =>
    Array.from({ length: 9 }, randomSeed)
  );
  const [styleIdx, setStyleIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reroll = useCallback(() => {
    setSeeds(Array.from({ length: 9 }, randomSeed));
  }, []);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        // Resize to 128x128 via canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext("2d")!;
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
          onChange(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const style = STYLES[styleIdx];

  return (
    <div>
      {/* Selected avatar preview */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500 bg-gray-800 flex-shrink-0">
          {value ? (
            <img src={value} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600">?</div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-300 mb-2">Choisis un avatar</p>
          {/* Style tabs */}
          <div className="flex gap-1">
            {["Robots", "Emojis", "Persos"].map((label, i) => (
              <button
                key={i}
                onClick={() => setStyleIdx(i)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  styleIdx === i
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-9 gap-1.5 mb-3">
        {seeds.map((seed) => {
          const url = dicebearUrl(seed, style);
          const selected = value === url;
          return (
            <button
              key={seed}
              onClick={() => onChange(url)}
              className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selected
                  ? "border-purple-500 scale-105"
                  : "border-transparent hover:border-gray-500"
              }`}
              style={{ background: "var(--surface)" }}
            >
              <img src={url} alt="avatar" className="w-full h-full object-cover" />
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={reroll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          <RefreshCw size={12} />
          Nouveaux avatars
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          <Upload size={12} />
          Ma photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
