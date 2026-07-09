"use client";

import { useEffect, useRef, useState } from "react";
import { heroVideos, type HeroVideoVariant } from "@/lib/hero-videos";
import { cn } from "@/lib/utils";

export default function HeroVideoBackground({
  variant,
  fullPage = false,
}: {
  variant: HeroVideoVariant;
  fullPage?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const { video, poster } = heroVideos[variant];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || reduceMotion) return;

    const play = () => {
      void element.play().catch(() => {
        // Autoplay can be blocked until user interaction; poster remains visible underneath.
      });
    };

    play();
    element.addEventListener("loadeddata", play);
    return () => element.removeEventListener("loadeddata", play);
  }, [reduceMotion, video]);

  return (
    <div className="absolute inset-0 h-full w-full" aria-hidden>
      <div
        className="h-full w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${poster})` }}
      />
      <video
        ref={videoRef}
        key={video}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          reduceMotion && "hidden"
        )}
      >
        <source src={video} type="video/mp4" />
      </video>
      <div
        className={cn(
          "absolute inset-0",
          fullPage
            ? "bg-brand-dark/82"
            : "bg-gradient-to-b from-brand-dark/80 via-brand-dark/65 to-brand-dark/85"
        )}
      />
    </div>
  );
}
