/**
 * Octo Landing Page
 * Premium $100B Design - Inspired by Linear, Vercel, Runway ML
 *
 * Features:
 * - Glassmorphism + Dark Mode
 * - Animated gradients and aurora effects
 * - Smooth scroll animations
 * - Premium typography (Space Grotesk)
 * - High-converting CTA sections
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.svg";
import {
  Play,
  Sparkles,
  Zap,
  Film,
  Wand2,
  ArrowRight,
  Check,
  Star,
  Globe,
  Layers,
  Clock,
  Shield,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Feature data
const features = [
  {
    icon: Wand2,
    title: "Text-to-Movie",
    description: "Transform scripts into cinematic multi-scene videos with AI-powered scene breakdown and generation.",
    gradient: "from-yellow-500 to-orange-500"
  },
  {
    icon: Film,
    title: "AI Video Generation",
    description: "Powered by Azure Sora 2 - create stunning 1080p videos up to 20 seconds from text prompts.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Sparkles,
    title: "Smart Scene Breakdown",
    description: "GPT-4o automatically breaks your script into optimal scenes with camera directions and transitions.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Zap,
    title: "Professional Voiceover",
    description: "Azure Neural TTS generates natural voiceovers with multiple voices and emotional styles.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Layers,
    title: "Multi-Format Export",
    description: "Export for YouTube, Instagram, TikTok, and more with automatic aspect ratio conversion.",
    gradient: "from-red-500 to-rose-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Built on Azure's enterprise-grade infrastructure with SOC2 compliance and data encryption.",
    gradient: "from-indigo-500 to-violet-500"
  }
];

// Stats data
const stats = [
  { value: "20s", label: "Max Video Length" },
  { value: "1080p", label: "Resolution" },
  { value: "50+", label: "AI Voices" },
  { value: "99.9%", label: "Uptime SLA" }
];

// Testimonials
const testimonials = [
  {
    quote: "Octo transformed how we create video content. What used to take days now takes minutes.",
    author: "Sarah Chen",
    role: "Creative Director, TechCorp",
    avatar: "SC"
  },
  {
    quote: "The AI understands cinematic language better than any tool I've used. It's like having a virtual director.",
    author: "Marcus Johnson",
    role: "Independent Filmmaker",
    avatar: "MJ"
  },
  {
    quote: "We've cut our ad production costs by 80% while increasing output 10x. Game-changer.",
    author: "Elena Rodriguez",
    role: "Marketing VP, StartupXYZ",
    avatar: "ER"
  }
];

// Pricing tiers
const pricingTiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for creators getting started",
    features: [
      "10 video generations/month",
      "720p resolution",
      "5 AI voices",
      "Email support"
    ],
    cta: "Start Free Trial",
    popular: false
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For professionals and small teams",
    features: [
      "50 video generations/month",
      "1080p resolution",
      "All AI voices",
      "Multi-scene movies",
      "Priority support",
      "API access"
    ],
    cta: "Start Free Trial",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    features: [
      "Unlimited generations",
      "4K resolution",
      "Custom AI models",
      "Dedicated support",
      "SLA guarantee",
      "On-premise option"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        {/* Aurora gradient orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(47, 100%, 50%, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsla(280, 100%, 60%, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Navigation */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50"
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logo} alt="Octo" className="h-10 w-10" />
              <span className="text-2xl font-bold text-gradient">Octo</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
                Testimonials
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/signup")}
                className="btn-premium text-primary-foreground font-semibold px-6"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="px-4 py-4 space-y-4">
              <a href="#features" className="block text-muted-foreground hover:text-foreground">Features</a>
              <a href="#pricing" className="block text-muted-foreground hover:text-foreground">Pricing</a>
              <a href="#testimonials" className="block text-muted-foreground hover:text-foreground">Testimonials</a>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => navigate("/login")} className="flex-1">Sign In</Button>
                <Button onClick={() => navigate("/signup")} className="flex-1 btn-premium">Get Started</Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-4 pt-20"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Badge
              variant="outline"
              className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
              Powered by Azure Sora 2
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <span className="text-gradient">Transform Text</span>
            <br />
            <span className="text-foreground">Into Cinema</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            Create professional multi-scene videos from scripts using AI.
            <br className="hidden sm:block" />
            From concept to final cut in minutes, not weeks.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => navigate("/movie-studio")}
              className="btn-premium text-primary-foreground text-lg px-8 py-6 font-semibold w-full sm:w-auto"
            >
              Start Creating Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 font-semibold border-border/50 bg-card/50 backdrop-blur-sm w-full sm:w-auto"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8"
            initial={{ opacity: 0 }}
            animate={isHeroInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-primary border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                Trusted by <span className="text-foreground font-semibold">10,000+</span> creators
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                <span className="text-foreground font-semibold">4.9/5</span> rating
              </span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <div className="w-1.5 h-2.5 rounded-full bg-primary" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              <Zap className="h-3.5 w-3.5 mr-2 text-primary" />
              Powerful Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Everything You Need to
              <br />
              <span className="text-gradient">Create Video Magic</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From script to screen, Octo provides all the AI-powered tools you need
              to create professional video content at scale.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="card-premium p-8 hover:scale-[1.02] transition-transform duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 px-4 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              <Clock className="h-3.5 w-3.5 mr-2 text-primary" />
              Simple Process
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              From Script to Screen in
              <br />
              <span className="text-gradient">Three Simple Steps</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Write Your Script",
                description: "Enter your story, script, or concept. Our AI understands narrative structure and cinematic language."
              },
              {
                step: "02",
                title: "AI Breaks It Down",
                description: "GPT-4o automatically creates scenes with camera directions, transitions, and voiceover scripts."
              },
              {
                step: "03",
                title: "Generate & Export",
                description: "Sora 2 generates each scene in parallel. Get your final video with professional editing."
              }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <div className="card-premium p-8 h-full">
                  <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              <Star className="h-3.5 w-3.5 mr-2 text-primary" />
              Testimonials
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Loved by
              <span className="text-gradient"> Creators Worldwide</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.author}
                className="card-premium p-8"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-lg mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32 px-4 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
              <Globe className="h-3.5 w-3.5 mr-2 text-primary" />
              Pricing
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Simple, Transparent
              <span className="text-gradient"> Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                className={`card-premium p-8 relative ${
                  tier.popular ? "border-primary/50 scale-105" : ""
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-5xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground mb-2">{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${tier.popular ? "btn-premium" : ""}`}
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => navigate("/signup")}
                >
                  {tier.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-6xl font-bold mb-6">
              Ready to Create
              <br />
              <span className="text-gradient">Your First Video?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of creators using Octo to transform their ideas into
              stunning videos. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/movie-studio")}
                className="btn-premium text-primary-foreground text-lg px-10 py-6 font-semibold"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Octo" className="h-8 w-8" />
              <span className="text-xl font-bold text-gradient">Octo</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Octo. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
