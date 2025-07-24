// app/icon.tsx
import Image from 'next/image'
import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
        }}
      >
        <img
          src="https://nighthub.pro/nightxhub_logo.png" 
          alt="icon"
          width={32}
          height={32}
        />
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  )
}
