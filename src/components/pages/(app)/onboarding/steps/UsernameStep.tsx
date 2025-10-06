import { useState, useEffect } from "react";
import { useDebounce } from "@uidotdev/usehooks";
// highlight-next-line
import UsernameAvailStatusPill from "@/components/common/UsernameAvailStatusPill"; // Make sure the path is correct
import { motion } from "motion/react";
import axios from "axios";
import { RESTRICTED_USERNAME } from "@/config/restricted-username";
import { useAuth } from "@/providers/AuthProvider";
import { Input } from "@/components/ui/input";
import { EASE_OUT_QUART } from "@/config/animation";
import { useIsMounted } from "@/hooks/use-is-mounted";
import MainButton from "@/components/common/MainButton";

interface UsernameStepProps {
  savedUsername?: string;
  onUsernameChange?: (username: string) => void;
}

export function UsernameStep({
  savedUsername,
  onUsernameChange,
}: UsernameStepProps) {
  const { backendToken, fetchMe } = useAuth();
  const isMounted = useIsMounted();
  const [username, setUsername] = useState(savedUsername || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Force lowercase and validate input
  const handleUsernameChange = (value: string) => {
    const lowercaseValue = value.toLowerCase();
    // Only allow alphanumeric characters
    if (lowercaseValue !== "" && !/^[a-z0-9]+$/.test(lowercaseValue)) {
      setValidationError("Only letters and numbers are allowed");
    } else if (lowercaseValue.length > 0 && lowercaseValue.length < 2) {
      setValidationError("Must be at least 2 characters");
    } else {
      setValidationError(null);
    }
    setUsername(lowercaseValue);
    // Update persistence
    if (onUsernameChange) {
      onUsernameChange(lowercaseValue);
    }
  };

  const debouncedUsername = useDebounce(username, 500);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      // Don't check if the input is invalid or empty
      if (!debouncedUsername || validationError) {
        setIsAvailable(null);
        return;
      }

      // Check against restricted usernames first
      if (RESTRICTED_USERNAME.includes(debouncedUsername)) {
        setIsAvailable(false);
        return;
      }

      try {
        setIsChecking(true);
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/username/check`,
          {
            params: {
              username: debouncedUsername,
            },
          }
        );
        setIsAvailable(data.isAvailable);
      } catch (error) {
        console.error("Error checking username:", error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, validationError]);

  const handleSubmitUsername = async () => {
    if (!isAvailable || !backendToken) return;
    try {
      setIsSubmitting(true);

      // Set the username on the backend
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/username/set`,
        { username },
        {
          headers: {
            Authorization: `Bearer ${backendToken}`,
          },
        }
      );

      // Refetch user profile to get updated data
      await fetchMe();
      
    } catch (error) {
      console.error("Error setting username:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Main content */}
      <motion.div
        className="text-center mb-12"
        initial={!isMounted ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, type: "tween", ease: EASE_OUT_QUART }}
      >
        <motion.p
          className="text-4xl font-semibold text-gray-900 mb-4 font-sans tracking-tight"
          initial={!isMounted ? { y: 10, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.05,
            duration: 0.4,
            type: "tween",
            ease: EASE_OUT_QUART,
          }}
        >
          What&apos;s your username?
        </motion.p>
        <motion.p
          className="text-gray-500 text-lg leading-tight max-w-lg text-balance mx-auto"
          initial={!isMounted ? { y: 10, opacity: 0 } : {}}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            delay: 0.1,
            duration: 0.4,
            type: "tween",
            ease: EASE_OUT_QUART,
          }}
        >
          Set up your username so others can easily find and pay you.
        </motion.p>
      </motion.div>

      <motion.div
        className="mb-8"
        initial={!isMounted ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.15,
          duration: 0.4,
          type: "tween",
          ease: EASE_OUT_QUART,
        }}
      >
        <div className="w-full space-y-2">
          <div className="relative flex items-center">
            <span className="absolute left-5 z-10 font-semibold text-gray-500">
              pivy.me/
            </span>
            <Input
              id="username"
              placeholder="enter-your-username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="pl-[5.6rem] h-16 w-full text-base border-none font-medium bg-gray-50 rounded-2xl focus-visible:ring-gray-200 focus-visible:ring-3"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>

        {/* --- REPLACEMENT SECTION --- */}
        <div className="mt-4">
          <UsernameAvailStatusPill
            username={username}
            debouncedUsername={debouncedUsername}
            isAvailable={isAvailable}
            isChecking={isChecking}
            validationError={validationError}
            restrictedUsernames={RESTRICTED_USERNAME}
            // `originalUsername` is not needed here as it's for new user creation
          />
        </div>
        {/* --- END REPLACEMENT --- */}
        
      </motion.div>

      {/* Continue button */}
      <motion.div
        className="mt-8"
        initial={!isMounted ? { opacity: 0, y: 10 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.2,
          duration: 0.4,
          type: "tween",
          ease: EASE_OUT_QUART,
        }}
      >
        <MainButton
          onClick={handleSubmitUsername}
          isLoading={isSubmitting}
          className="rounded-2xl py-4 disabled:opacity-20 w-full"
          disabled={
            !username || !isAvailable || isChecking || !!validationError
          }
        >
          Continue
        </MainButton>
      </motion.div>
    </div>
  );
}