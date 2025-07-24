"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { FaDiscord } from "react-icons/fa"

interface NavbarProps {
  scrollToScript?: () => void
}

export function Navbar({ scrollToScript }: NavbarProps) {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/30 bg-black/60 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <motion.div
            className="relative h-8 w-8"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Image
              src="/nightxhub_logo.png" // ✅ ใช้โลโก้จาก public
              alt="logo"
              width={32}
              height={32}
              className="rounded-full"
            />
          </motion.div>
          <motion.span
            className="text-lg font-bold text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            NightX Hub
          </motion.span>
        </Link>
        <motion.nav
          className="ml-auto flex gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link href="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200">
            Home
          </Link>
          {scrollToScript ? (
            <button
              onClick={scrollToScript}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 bg-transparent border-none cursor-pointer"
            >
              Scripts
            </button>
          ) : (
            <Link
              href="/#scripts"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Scripts
            </Link>
          )}
          <Link
            href="/key"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
          >
            Get Key
          </Link>
          <Link
            href="https://discord.gg/Hhq9VZwKZa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 flex items-center gap-2"
          >
            <FaDiscord className="text-lg" />
            Discord
          </Link>
        </motion.nav>
      </div>
    </motion.header>
  )
}
