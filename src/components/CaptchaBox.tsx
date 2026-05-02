import ReCAPTCHA from "react-google-recaptcha";
import { forwardRef } from "react";

// Public site key — safe to expose in frontend.
export const RECAPTCHA_SITE_KEY = "6LeCL8ssAAAAANvfL00SsE7Ttqum57WitR35FElA";

interface CaptchaBoxProps {
  onChange: (token: string | null) => void;
  theme?: "light" | "dark";
}

const CaptchaBox = forwardRef<ReCAPTCHA, CaptchaBoxProps>(({ onChange, theme }, ref) => {
  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={ref}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={onChange}
        onExpired={() => onChange(null)}
        onErrored={() => onChange(null)}
        theme={theme}
      />
    </div>
  );
});

CaptchaBox.displayName = "CaptchaBox";
export default CaptchaBox;
