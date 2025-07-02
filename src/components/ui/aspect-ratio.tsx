// AspectRatio component for Vite/React (not Next.js)
// Usage:
// import { AspectRatio } from "@/components/ui/aspect-ratio";
// <AspectRatio ratio={16/9}><img src="..." alt="..." /></AspectRatio>

import * as React from "react";

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number; // default: 16/9
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 16 / 9, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: `${100 / ratio}%`,
          ...style,
        }}
        {...props}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

AspectRatio.displayName = "AspectRatio";

export { AspectRatio }; 