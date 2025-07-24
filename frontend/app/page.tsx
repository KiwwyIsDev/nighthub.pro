"use client"

import { useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { ParticleBackground } from "@/components/particle-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, Code, Copy, Check, ChevronDown } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Home() {
  const scriptRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const scriptCode = `loadstring(game:HttpGet("https://raw.githubusercontent.com/nightxhub/Free-Script/refs/heads/main/Loader.lua"))()`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scrollToScript = () => {
    if (scriptRef.current) {
      scriptRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <ParticleBackground />
      <Navbar scrollToScript={scrollToScript} />

      {/* Hero Section */}
      <div className="container relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-8"
          >
            <motion.h1
              className="mb-2 text-5xl font-bold md:text-7xl"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <span className="text-white">NightX Hub</span>{" "}
            </motion.h1>
            <motion.h2
              className="mb-6 text-5xl font-bold md:text-7xl"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <span className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                Premium Scripts
              </span>
            </motion.h2>
          </motion.div>

          <motion.p
            className="mb-12 text-lg text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Access our collection of powerful Roblox scripts for all popular games.
          </motion.p>

          <motion.div
            className="flex flex-col items-center justify-center gap-6 sm:flex-row mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <Link href="/key">
              <Button
                size="lg"
                className="w-48 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-900/30 transition-all duration-300 hover:shadow-purple-900/50"
              >
                <Key className="mr-2 h-5 w-5" />
                Get Key
              </Button>
            </Link>
            <Button
              onClick={scrollToScript}
              size="lg"
              variant="outline"
              className="w-48 border-2 border-purple-800/50 bg-black/50 text-white backdrop-blur-sm hover:bg-purple-900/20 shadow-lg shadow-purple-900/10 transition-all duration-300 hover:shadow-purple-900/30"
            >
              <Code className="mr-2 h-5 w-5" />
              Scripts
            </Button>
          </motion.div>

          {/* Scroll Indicator Arrow - Positioned directly under the buttons */}
          <motion.div
            className="flex flex-col items-center cursor-pointer mt-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.5,
              duration: 0.8,
            }}
            onClick={scrollToScript}
            whileHover={{ scale: 1.1 }}
          >
            <motion.div
              className="text-purple-400 flex flex-col items-center"
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
            >
              <span className="text-sm mb-1 text-gray-400">Scroll Down</span>
              <ChevronDown className="h-6 w-6" />
              <ChevronDown className="h-6 w-6 -mt-3" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Script Section */}
      <div className="container relative z-10 mx-auto px-4 pb-24">
        <motion.div
          ref={scriptRef}
          className="w-full max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <Card className="mb-12 bg-gradient-to-b from-gray-900/80 to-black/80 border border-purple-900/50 backdrop-blur-sm shadow-xl shadow-purple-900/10">
            <CardHeader className="border-b border-gray-800/50">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                Luau Script
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative rounded-md bg-black/80 border border-gray-800/50 p-4 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 font-mono text-sm">loader.lua</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white transition-all duration-300"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <motion.div
                  className="relative overflow-hidden rounded-md bg-gray-950 p-4 font-mono"
                  initial={{ height: 0 }}
                  whileInView={{ height: "auto" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <pre className="overflow-x-auto text-sm">
                    <code>
                      <span className="text-purple-400">loadstring</span>
                      <span className="text-gray-300">(</span>
                      <span className="text-purple-400">game</span>
                      <span className="text-gray-300">:</span>
                      <span className="text-blue-400">HttpGet</span>
                      <span className="text-gray-300">(</span>
                      <span className="text-green-400">
                        &quot;https://raw.githubusercontent.com/nightxhub/Free-Script/refs/heads/main/Loader.lua&quot;
                      </span>
                      <span className="text-gray-300">))()</span>
                    </code>
                  </pre>

                  {/* Animated glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      repeat: Number.POSITIVE_INFINITY,
                      duration: 2,
                      ease: "linear",
                      delay: 0.5,
                    }}
                  />
                </motion.div>

                <div className="mt-6">
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white shadow-lg shadow-purple-900/30 transition-all duration-300 hover:shadow-purple-900/50"
                    onClick={copyToClipboard}
                  >
                    {copied ? "Copied!" : "Copy Script"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}
