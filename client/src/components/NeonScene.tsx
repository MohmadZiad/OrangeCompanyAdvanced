import { motion } from "framer-motion";


/**
* Fallback Neon Scene — لا يحتاج @react-three/* ولا three.
* يعطيك شكل 3D-ish باستخدام gradients وblur وparallax بسيط.
*/
export function NeonScene() {
return (
<div className="relative h-64 w-full rounded-2xl border bg-card overflow-hidden">
{/* خلفية متحركة */}
<motion.div
className="absolute -inset-1 rounded-[inherit]"
style={{
background:
"conic-gradient(from 180deg at 50% 50%, hsl(var(--primary)/.7), hsl(var(--secondary)/.7), hsl(var(--accent)/.7), hsl(var(--primary)/.7))",
filter: "blur(18px)",
}}
animate={{ rotate: 360 }}
transition={{ repeat: Infinity, ease: "linear", duration: 18 }}
/>


{/* طبقة داخلية */}
<div className="absolute inset-[8px] rounded-xl bg-background/80 backdrop-blur-sm border" />


{/* عنصر شبه ثلاثي الأبعاد */}
<motion.div
className="relative z-10 h-full w-full grid place-items-center tilt-card"
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}
>
<motion.div
className="tilt-inner rounded-2xl"
style={{
width: 220,
height: 220,
background:
"radial-gradient(60% 60% at 40% 40%, hsl(var(--primary)/.9), transparent 60%), radial-gradient(60% 60% at 60% 60%, hsl(var(--accent)/.9), transparent 60%), radial-gradient(80% 80% at 50% 50%, hsl(var(--secondary)/.8), transparent 70%)",
boxShadow:
"0 0 24px hsl(var(--primary)/.35), 0 0 48px hsl(var(--accent)/.25)",
}}
whileHover={{ scale: 1.04 }}
whileTap={{ scale: 0.98 }}
/>
</motion.div>
</div>
);
}