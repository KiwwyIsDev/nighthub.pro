"use client"

import { Navbar } from "@/components/navbar"
import { ParticleBackground } from "@/components/particle-background"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Key, Plus, RefreshCw, Copy, Trophy, Check } from "lucide-react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { getOrCreateToken } from "@/utils/token";
import { toast } from "sonner"
import Head from "next/head"
import Script from "next/script"

type KeyData = {
	key: string;
	expiresAt: string;
};

function getTimeLeft(expiresAt: string): string {
	const diff = new Date(expiresAt).getTime() - Date.now();
	if (diff <= 0) return "00:00:00";

	const hours = Math.floor(diff / 1000 / 60 / 60);
	const minutes = Math.floor(diff / 1000 / 60) % 60;
	const seconds = Math.floor(diff / 1000) % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes
		.toString()
		.padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}


export default function KeyPage() {
	// const { toast } = useToast();

	// API base URL - use production API domain
	const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
		? 'https://api.nighthub.pro'
		: 'http://localhost:4547';

	const [progress, setProgress] = useState<number | null>(null);
	const [keyList, setKeyList] = useState<KeyData[]>([]);
	const [, setNow] = useState(Date.now()); // สำหรับ trigger render
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Click system state
	const [clickStatus, setClickStatus] = useState<{
		clickCount: number;
		completedClicks: number;
		canClick: boolean;
		nextUrl: string | null;
		timeUntilNextClick: number;
	}>({
		clickCount: 0,
		completedClicks: 0,
		canClick: true,
		nextUrl: null,
		timeUntilNextClick: 0
	});
	const [isClicking, setIsClicking] = useState(false);
	const [clickCooldown, setClickCooldown] = useState(0);

	const refreshUserInfo = async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);

		try {
			const res = await fetch(`${API_BASE}/user/info`, {
				method: "GET",
				credentials: "include",
			});
			const data = await res.json();
			setProgress(data.progress);
			setKeyList(data.keys || []);
			console.log("User info refreshed.");
		} catch (err) {
			console.error("Error refreshing user info:", err);
		}

		setTimeout(() => setIsRefreshing(false), 1500); // Cooldown 1.5s
	};

	useEffect(() => {
		const interval = setInterval(() => {
			refreshUserInfo();
		}, 60000); // 60,000 ms = 1 min
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const token = getOrCreateToken();
		fetch(`${API_BASE}/user/info`, {
			method: "GET",
			credentials: "include",
		})
			.then(res => res.json())
			.then(data => {
				setProgress(data.progress);
				setKeyList(data.keys || []);
			})
			.catch(err => {
				console.error("Error fetching user info:", err);
			});

		// Initialize click status
		fetchClickStatus();

		// Global error handler for ad script errors
		const handleGlobalError = (event: ErrorEvent) => {
			if (event.error && event.error.message &&
				(event.error.message.includes('adex') ||
					event.error.message.includes('vignette') ||
					event.filename && (event.filename.includes('vignette.js') ||
						event.filename.includes('onclick.js') ||
						event.filename.includes('push.js')))) {
				console.warn('Ad script error caught and ignored:', event.error);
				event.preventDefault();
				return true;
			}
		};

		window.addEventListener('error', handleGlobalError);
		window.addEventListener('unhandledrejection', (event) => {
			if (event.reason && event.reason.message &&
				event.reason.message.includes('adex timeout')) {
				console.warn('Ad script promise rejection caught and ignored:', event.reason);
				event.preventDefault();
			}
		});

		return () => {
			window.removeEventListener('error', handleGlobalError);
		};
	}, []);

	// Cooldown timer effect
	useEffect(() => {
		if (clickCooldown > 0) {
			const timer = setInterval(() => {
				setClickCooldown(prev => {
					if (prev <= 1) {
						// Only refresh status if endpoints are available
						if (clickStatus.nextUrl) {
							fetchClickStatus();
						}
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return () => clearInterval(timer);
		}
	}, [clickCooldown]);

	useEffect(() => {
		const interval = setInterval(() => {
			setNow(Date.now()); // trigger render
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const [selectedKey, setSelectedKey] = useState<string | null>(null)

	const copyToClipboard = (key: string) => {
		navigator.clipboard.writeText(key)
		setCopiedKey(key)
		setTimeout(() => setCopiedKey(null), 2000)
	}

	const handleCreateKey = async () => {
		const res = await fetch(`${API_BASE}/key/create`, {
			method: "POST",
			credentials: "include",
		});
		const data = await res.json();
		if (res.ok) {
			toast.success("Key Created");
			refreshUserInfo();
		} else {
			toast.error(data.error);
		}
	};

	const handleExtendKey = async () => {
		if (!selectedKey) return;
		const res = await fetch(`${API_BASE}/key/extend`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ key: selectedKey }),
		});
		const data = await res.json();
		if (res.ok) {
			toast.success("Key Extended");
			refreshUserInfo();
		} else {
			toast.error(data.error);
		}
	};


	const handleResetHWID = async () => {
		if (!selectedKey) return;
		const res = await fetch(`${API_BASE}/key/reset-hwid`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ key: selectedKey }),
		});
		const data = await res.json();
		if (res.ok) {
			toast.success("HWID Reset");
			refreshUserInfo();
		} else {
			toast.error(data.error);
		}
	};

	// Fetch click status from backend
	const fetchClickStatus = async () => {
		try {
			const token = getOrCreateToken();
			const res = await fetch(`${API_BASE}/click/status`, {
				method: "GET",
				credentials: "include",
				headers: {
					'fingerprint': token,
					'Content-Type': 'application/json'
				}
			});

			if (!res.ok) {
				// If endpoint doesn't exist (404), set default status
				if (res.status === 404) {
					setClickStatus({
						clickCount: 0,
						completedClicks: 0,
						canClick: true,
						nextUrl: "https://otieu.com/4/9434390",
						timeUntilNextClick: 0
					});
					return;
				}
				throw new Error(`HTTP ${res.status}`);
			}

			const data = await res.json();
			setClickStatus(data);

			if (data.timeUntilNextClick > 0) {
				setClickCooldown(data.timeUntilNextClick);
			}
		} catch (err: unknown) {
			console.warn("Click endpoints not available:", err instanceof Error ? err.message : String(err));
			// Set default status when endpoints don't exist
			setClickStatus({
				clickCount: 0,
				completedClicks: 0,
				canClick: false,
				nextUrl: null,
				timeUntilNextClick: 0
			});
		}
	};

	// Random redirect URLs for direct link
	const redirectUrls = [
		"https://otieu.com/4/9434390",
		"https://otieu.com/4/9458411", 
		"https://otieu.com/4/9458412",
		"https://otieu.com/4/9458414",
		"https://otieu.com/4/9458417",
		"https://otieu.com/4/9458419",
		"https://otieu.com/4/9466724",
		"https://otieu.com/4/9466732",
	];

	// Handle secure click
	const handleSecureClick = async () => {
		setIsClicking(true);
		try {
			const token = getOrCreateToken();
			
			// Get random URL from the list
			const randomUrl = redirectUrls[Math.floor(Math.random() * redirectUrls.length)];
			
			const registerPromise = fetch(`${API_BASE}/click/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"fingerprint": token
				},
				credentials: "include",
				body: JSON.stringify({
					url: randomUrl,
					timestamp: Date.now()
				})
			});

			// Open the random URL
			setTimeout(() => {
				try {
					window.open(randomUrl, "_blank");
				} catch (popupError) {
					console.warn("Popup blocked or error:", popupError);
					toast.error("Popup blocked. Please allow popups for this site.");
				}
			}, 100);

			const timeoutPromise = new Promise<globalThis.Response>((_, reject) =>
				setTimeout(() => reject(new Error('Request timeout')), 10000)
			);
			const res = await Promise.race([registerPromise, timeoutPromise]) as Response;
			const data = await res.json();
			if (res.ok) {
				setClickStatus(prev => ({
					...prev,
					clickCount: data.clickCount,
					completedClicks: data.completedClicks
				}));
				toast.success(`Click ${data.completedClicks}/15 registered!`);
				// Start cooldown
				setClickCooldown(1);
				if (data.completedClicks >= 15) {
					toast.success("15 clicks completed! Access granted!");
					// Update user progress
					refreshUserInfo();
				}
			} else {
				toast.error(data.error || "Failed to register click");
				if (data.timeUntilNextClick && data.timeUntilNextClick > 0) {
					setClickCooldown(data.timeUntilNextClick);
				}
			}
		} catch (err: any) {
			console.error("Error registering click:", err);
			if (err && err.message === 'Request timeout') {
				toast.error("Request timed out. Please try again.");
			} else if (err && err.name === 'TypeError' && err.message && err.message.includes('Failed to fetch')) {
				toast.error("Network error. Check your connection.");
			} else {
				toast.error("Failed to register click. Please try again.");
			}
			try {
				await fetchClickStatus();
			} catch (statusErr) {
				console.warn("Failed to refresh status:", statusErr);
			}
		}
		setIsClicking(false);
	};



	return (
		<>
			<Head>
				<link rel="preload" href="/onclick.js" as="script" />
				<script src="/onclick.js" data-nscript="afterInteractive" />

				<link rel="preload" href="/vignette.js" as="script" />
				<script src="/vignette.js" data-nscript="afterInteractive" />

				<link rel="preload" href="/push.js" as="script" />
				<script src="/push.js" data-nscript="afterInteractive" />
			</Head>

			<Script
				src="/onclick.js"
				strategy="afterInteractive"
				onError={(e) => console.warn("onclick.js failed to load:", e)}
			/>
			<Script
				src="/vignette.js"
				strategy="afterInteractive"
				onError={(e) => console.warn("vignette.js failed to load:", e)}
			/>
			<Script
				src="/push.js"
				strategy="afterInteractive"
				onError={(e) => console.warn("push.js failed to load:", e)}
			/>


			<main className="relative min-h-screen overflow-hidden bg-black text-white">
				<ParticleBackground />
				<Navbar />

				<div className="container relative z-10 mx-auto flex min-h-screen flex-col items-center px-4 pt-24 pb-12">
					<motion.div
						className="text-center mb-8"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
					>
						<motion.h1
							className="mb-4 text-5xl font-bold md:text-6xl"
							initial={{ y: 20 }}
							animate={{ y: 0 }}
							transition={{ delay: 0.2, duration: 0.6 }}
						>
							<span className="text-white">Get </span>
							<span className="bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent">
								Freemium
							</span>
							<span className="text-white"> Access</span>
						</motion.h1>
						<motion.p
							className="text-yellow-400 text-lg"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.6, duration: 0.8 }}
						>
							1 Checkpoint per 8 hours stackables (72 hours)
						</motion.p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 40 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.8, duration: 0.8 }}
						className="w-full max-w-3xl"
					>
						<Card className="bg-gradient-to-b from-gray-900/80 to-black/80 border border-purple-900/50 backdrop-blur-sm shadow-fxl shadow-purple-900/10">
							<CardContent className="p-6">
								<motion.div
									className="flex items-center justify-between mb-6"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 1, duration: 0.5 }}
								>
									<div className="flex items-center gap-2">
										<span className="text-lg">Progress:{" "}
											{progress === null ? "Loading..." : `${progress} / 1`}</span>

										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/30">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<polyline points="20 6 9 17 4 12"></polyline>
											</svg>
										</div>
										<Button
											variant="outline"
											size="sm"
											className={`text-xs border-gray-700 hover:bg-gray-800 transition ${isRefreshing ? "opacity-60 pointer-events-none" : ""
												}`}
											onClick={refreshUserInfo}
										>
											{isRefreshing ? (
												<svg
													className="animate-spin h-4 w-4 text-white"
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														className="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														strokeWidth="4"
													></circle>
													<path
														className="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
													></path>
												</svg>
											) : (
												"Refresh"
											)}
										</Button>

									</div>
								</motion.div>

								<motion.div
									className="mb-6"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 1.2, duration: 0.5 }}
								>
									<div className="flex justify-between mb-4">
										<span className="text-gray-400 text-lg">Key</span>
										<span className="text-gray-400 text-lg">Time Left</span>
									</div>

									<div className="space-y-3">
										{keyList.length === 0 ? (
											<p className="text-gray-400 text-center">No keys yet.</p>
										) : (
											keyList.map((k) => (
												<motion.div
													key={k.key}
													className={`flex items-center justify-between rounded-md bg-gradient-to-r from-gray-900/80 to-gray-800/50 p-4 border ${selectedKey === k.key
														? "border-purple-500/70 shadow-lg shadow-purple-500/20"
														: "border-teal-900/30"
														} shadow-md cursor-pointer transition-all duration-300`}
													initial={{ x: -20 }}
													animate={{ x: 0 }}
													transition={{ delay: 1.4, duration: 0.5 }}
													whileHover={{ scale: 1.01 }}
													onClick={() => setSelectedKey(k.key)}
												>
													<div className="flex items-center gap-3">
														<div
															className={`h-3 w-3 rounded-full ${selectedKey === k.key
																? "bg-purple-500 shadow-lg shadow-purple-500/50"
																: "bg-teal-500 shadow-lg shadow-teal-500/50"
																}`}
														></div>
														<span className="text-base text-gray-300 font-mono">{k.key}</span>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-gray-400 hover:text-white transition-all duration-300"
															onClick={(e) => {
																e.stopPropagation();
																copyToClipboard(k.key);
															}}
														>
															{copiedKey === k.key ? (
																<Check className="h-4 w-4 text-green-500" />
															) : (
																<Copy className="h-4 w-4" />
															)}
														</Button>
													</div>
													<span className="text-base text-teal-300 font-mono">
														{getTimeLeft(k.expiresAt)}
													</span>
												</motion.div>
											))
										)}
									</div>



									<div className="mt-5 text-center text-sm text-gray-400">
										{selectedKey ? (
											<>
												Selected key: <span className="text-purple-400 font-mono">{selectedKey.substring(0, 8)}...</span>
											</>
										) : (
											"Click on a key to select it for actions"
										)}
									</div>
								</motion.div>

								{/* Access Options Section - Show when user doesn't have access */}
								{(progress === null || progress < 1) && (
									<motion.div
										className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 1.6, duration: 0.5 }}
									>
										<div className="text-center mb-6">
											<h3 className="text-xl font-semibold text-purple-300 mb-2">
												Get Access to Key Management
											</h3>
											<p className="text-gray-300">
												Choose one option to unlock key creation and management
											</p>
										</div>
										
										<div className="flex flex-col sm:flex-row gap-4 justify-center">
											{/* Linkvertise Option */}
											<Button
												onClick={() => window.open("https://link-hub.net/1179829/nighthub-pro", "_blank")}
												className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-900/30 transition-all duration-300 hover:shadow-emerald-900/50 flex-1"
											>
												<svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
													<path d="M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"/>
												</svg>
												Linkvertise (Recommended)
											</Button>

											{/* Direct Link Option */}
											<div className="flex-1">
												<Button
													onClick={handleSecureClick}
													disabled={isClicking || clickCooldown > 0}
													className={`w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-900/30 transition-all duration-300 hover:shadow-orange-900/50 ${
														(isClicking || clickCooldown > 0) ? "opacity-50 cursor-not-allowed" : ""
													}`}
												>
													{isClicking ? (
														<div className="flex items-center">
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
															Processing...
														</div>
													) : clickCooldown > 0 ? (
														`Wait ${clickCooldown}s`
													) : (
														<>
															<Trophy className="mr-2 h-4 w-4" />
															Direct Link ({clickStatus.completedClicks}/15)
														</>
													)}
												</Button>
												<p className="text-xs text-gray-400 text-center mt-1">
													Complete 15 random ad clicks
												</p>
											</div>
										</div>
									</motion.div>
								)}

								<motion.div
									className="flex flex-wrap justify-center gap-3 mb-6"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 1.8, duration: 0.5 }}
								>
									<Button
										onClick={handleCreateKey}
										className={`bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-900/30 transition-all duration-300 hover:shadow-emerald-900/50 ${(progress === null || progress < 1) ? "opacity-50 cursor-not-allowed" : ""}`}
										disabled={progress === null || progress < 1}
										title={(progress === null || progress < 1) ? "Complete access task to unlock" : "Create a new key"}
									>
										<Key className="mr-2 h-4 w-4" />
										{(progress === null || progress < 1) ? "🔒 Locked" : "Create Key"}
									</Button>

									<Button
										onClick={handleExtendKey}
										disabled={!selectedKey || progress === null || progress < 1}
										className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-900/30 transition-all duration-300 hover:shadow-blue-900/50 ${(!selectedKey || progress === null || progress < 1) && "opacity-50 cursor-not-allowed"}`}
										title={!selectedKey ? "Select a key first" : (progress === null || progress < 1) ? "Complete access task to unlock" : "Add Time"}
									>
										<Plus className="mr-2 h-4 w-4" />
										{(progress === null || progress < 1) ? "🔒 Locked" : "Add Time"}
									</Button>

									<Button
										onClick={handleResetHWID}
										disabled={!selectedKey || progress === null || progress < 1}
										className={`bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-900/30 transition-all duration-300 hover:shadow-purple-900/50 ${(!selectedKey || progress === null || progress < 1) && "opacity-50 cursor-not-allowed"}`}
										title={!selectedKey ? "Select a key first" : (progress === null || progress < 1) ? "Complete access task to unlock" : "Reset HWID"}
									>
										<RefreshCw className="mr-2 h-4 w-4" />
										{(progress === null || progress < 1) ? "🔒 Locked" : "Reset HWID"}
									</Button>

								</motion.div>

							</CardContent>
						</Card>
					</motion.div>
				</div>
			</main>

		</>
	)
}
