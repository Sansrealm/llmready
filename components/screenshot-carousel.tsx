"use client"

import * as React from "react"
import Image from "next/image"
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

const screenshots = [
  { src: "/llmc01.png", alt: "LLM readiness analysis overview" },
  { src: "/llmc02.png", alt: "Website scoring breakdown" },
  { src: "/llmc03.png", alt: "Detailed recommendations" },
  { src: "/llmc04.png", alt: "Improvement action items" },
]

export function ScreenshotCarousel() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api) return

    setCurrent(api.selectedScrollSnap())
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <div className="w-full max-w-[700px] mx-auto">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 4500, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent>
          {screenshots.map((shot, index) => (
            <CarouselItem key={index}>
              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={700}
                  height={440}
                  className="w-full h-auto"
                  priority={index === 0}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {screenshots.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === current
                ? "w-6 bg-green-600 dark:bg-green-500"
                : "w-2 bg-gray-300 dark:bg-gray-600"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-5">
        Join{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">2,000+ businesses</span>{" "}
        that are managing their AI visibility with LLMCheck.{" "}
        <span className="text-green-600 dark:text-green-500 font-medium">Try for free.</span>
      </p>
    </div>
  )
}
