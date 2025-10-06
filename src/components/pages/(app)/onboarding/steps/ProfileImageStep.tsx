import CuteButton from "@/components/common/CuteButton";
import { useState } from "react";
import { AddProfileImageButton } from "./AddProfileImageButton";
import { backend } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import EmojiColorPicker from "@/components/common/EmojiColorPicker";
import MainButton from "@/components/common/MainButton";

interface ProfileImageStepProps {
  onNext?: () => void;
  savedProfileImage?: string;
  onProfileImageChange?: (profileImage: string) => void;
}

export function ProfileImageStep({
  onNext,
  savedProfileImage,
  onProfileImageChange,
}: ProfileImageStepProps) {
  const { backendToken, fetchMe } = useAuth();

  // Emoji Color picker modal
  const [isEmojiColorPickerOpen, setIsEmojiColorPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<{
    id: string;
    emoji: string;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState<{
    id: string;
    value: string;
    light: string;
  } | null>(null);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedEmoji || !selectedColor || !backendToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await backend.auth.setProfileImage(backendToken, {
        type: "EMOJI_AND_COLOR",
        data: {
          emoji: selectedEmoji.id,
          backgroundColor: selectedColor.id,
        },
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update the profile image in the parent component
      if (onProfileImageChange && result.data) {
        onProfileImageChange(JSON.stringify(result.data.profileImage));
      }

      // Refresh user profile to get updated data
      await fetchMe();

      // Continue to next step
      onNext?.();
    } catch (err) {
      console.error("Error setting profile image:", err);
      setError(
        err instanceof Error ? err.message : "Failed to set profile image"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <EmojiColorPicker
        isOpen={isEmojiColorPickerOpen}
        onClose={() => setIsEmojiColorPickerOpen(false)}
        onEmojiSelect={setSelectedEmoji}
        onColorSelect={setSelectedColor}
        selectedEmoji={selectedEmoji}
        selectedColor={selectedColor}
      />
      <div className="w-full">
        {/* Main content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Choose your profile
          </h1>
          <p className="text-gray-500 text-lg leading-tight max-w-sm mx-auto">
            Pick an emoji and color that represents you best.
          </p>
        </div>

        <div className="mb-12 w-fit mx-auto">
          <AddProfileImageButton
            onPress={() => setIsEmojiColorPickerOpen(true)}
            type="emoji-and-color"
            emoji={selectedEmoji?.emoji}
            backgroundColor={selectedColor?.value}
            className="size-48 text-[7rem] hover:bg-primary-200"
          />
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Continue button - now part of regular flow */}
        <div>
          <MainButton
            onClick={handleContinue}
            isLoading={isLoading}
            className="rounded-2xl py-4 disabled:opacity-40 w-full"
            disabled={!selectedEmoji || !selectedColor}
          >
            Continue
          </MainButton>
        </div>
      </div>
    </>
  );
}
