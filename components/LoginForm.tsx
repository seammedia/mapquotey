"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Lock } from "lucide-react";

export default function LoginForm() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join("");
      setTimeout(() => handleSubmit(fullPin), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    if (!/^\d+$/.test(pastedData)) return;

    const newPin = pastedData.split("").concat(["", "", "", ""]).slice(0, 4);
    setPin(newPin);

    if (pastedData.length === 4) {
      setTimeout(() => handleSubmit(pastedData), 100);
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleSubmit = (pinToCheck?: string) => {
    const fullPin = pinToCheck || pin.join("");
    if (fullPin.length !== 4) return;

    const success = login(fullPin);
    if (!success) {
      setError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      setPin(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-orange-500 p-3 rounded-xl">
              <MapPin className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            MapQuotey
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Virtual Site Survey & Quoting Platform
          </p>

          {/* PIN Input */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Enter your PIN</span>
            </div>

            <div
              className={`flex justify-center gap-3 ${isShaking ? "animate-shake" : ""}`}
            >
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`pin-input ${error ? "border-red-500" : ""}`}
                  aria-label={`PIN digit ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mt-4 animate-fadeIn">
                Incorrect PIN. Please try again.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={pin.some((d) => !d)}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Unlock
          </button>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center mt-6">
            Secure access for authorized trades and services
          </p>
        </div>
      </div>
    </div>
  );
}
