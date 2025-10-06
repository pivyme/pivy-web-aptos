import CuteModal from "@/components/common/CuteModal";
import {
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";

interface AptosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AptosModal({ isOpen, onClose }: AptosModalProps) {
  return (
    <CuteModal
      isOpen={isOpen}
      onClose={onClose}
      title="Aptos CTRL+Move 2025"
      withHandle={true}
      size="lg"
      fullscreen={true}
      className="!max-h-screen h-screen !rounded-none md:!rounded-[2rem] md:!max-h-[90vh] md:h-auto"
    >
      <div className="space-y-4">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 text-center border border-primary-200">
          <div className="inline-flex items-center justify-center w-16 h-16 b-4">
            <Image
              src="/assets/logo/icon.svg"
              alt="PIVY"
              width={64}
              height={64}
            />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            PIVY × Aptos CTRL+Move 2025
          </h3>
          <p className="text-gray-700 font-medium">
            Pioneering Practical Privacy in Payments
          </p>
        </div>

        {/* Features Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Innovation Highlights
          </h4>

          <div className="space-y-2">
            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                <RocketLaunchIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900">
                  First Stealth Addresses on Aptos
                </h5>
                <p className="text-sm text-gray-600">
                  PIVY brings the first implementation of stealth addresses to
                  the Aptos ecosystem, enabling truly private transactions.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900">
                  Reshaping the Future of Finance
                </h5>
                <p className="text-sm text-gray-600">
                  We believe privacy is a fundamental right. PIVY makes on-chain
                  privacy practical and accessible for everyone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">Our Mission:</span>{" "}
            PIVY is building the infrastructure for private, secure, and
            user-friendly payments on Aptos. By combining cutting-edge
            cryptography with intuitive design, we are making privacy the
            default, not the exception.
          </p>
        </div>
      </div>
    </CuteModal>
  );
}
